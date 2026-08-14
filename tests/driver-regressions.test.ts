import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { prepareRows, validatePingBatch } from "@/app/api/driver/_lib/ingest";
import { dispatchRetryDelayMs } from "@/app/api/driver/_lib/policy";
import { computeNearestSupport, type NearestCandidate } from "@/lib/alerts/nearest";
import { OutboxQueue, createMemoryStore, type QueueStore } from "@/lib/driver/queue";
import { createQueueStore } from "@/lib/driver/storage";
import { destinationPoint } from "@/lib/geo/distance";
import { parseGpx } from "@/lib/gpx/parse";
import { buildRouteTrack, positionAtOffset, RouteIndex } from "@/lib/route/track";
import type { ClientAlert, ClientPing, PositionRole } from "@/lib/types";

/**
 * Regressões da revisão adversarial.
 *
 * Cada bloco aqui reproduz uma falha que foi MEDIDA contra o sistema vivo e que
 * a suíte anterior (188 testes, todos verdes) não pegava. A ordem é a da
 * gravidade encontrada, não a da conveniência de escrever.
 */

const T0 = Date.UTC(2025, 5, 1, 9, 0, 0);
const GPX_PATH = join(process.cwd(), "tests", "fixtures", "real-route.gpx");

function loadRealRoute() {
  const parsed = parseGpx(readFileSync(GPX_PATH, "utf8"));
  const { track } = buildRouteTrack(parsed.segments[0]!.points);
  return { track, index: new RouteIndex(track) };
}

function uuid(n: number): string {
  return `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
}

function alert(id: string): ClientAlert {
  return {
    clientAlertId: id,
    category: "medical",
    note: null,
    lat: 44.9,
    lng: 7.6,
    accuracyM: 10,
    createdAt: new Date(T0).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// CRÍTICO 1 — o alerta não pode sumir quando o armazenamento local recusa
// ---------------------------------------------------------------------------

describe("crítico 1: armazenamento local recusando escrita", () => {
  /** Armazenamento que rejeita tudo, como o IndexedDB em modo privado. */
  function brokenStore(): QueueStore {
    const fail = () => Promise.reject(new Error("InvalidStateError: IDB fechado"));
    return {
      get: fail,
      set: fail,
      delMany: fail,
      keys: fail,
      getMany: fail,
    };
  }

  it("a fila REJEITA de forma observável em vez de engolir o alerta", async () => {
    const queue = new OutboxQueue(brokenStore());

    // O que NÃO pode acontecer: resolver como se tivesse gravado. Quem chama
    // precisa poder distinguir — é disso que depende a tela dizer "use o rádio".
    await expect(queue.enqueueAlert(alert(uuid(1)))).rejects.toThrow();
  });

  it("não declara armazenamento durável sem ter conseguido escrever", async () => {
    // Neste ambiente não existe `indexedDB` — o mesmo estado observável de um
    // navegador que bloqueia o armazenamento. Antes da correção, o `createStore`
    // preguiçoso do idb-keyval fazia `durable: true` sair daqui de qualquer
    // jeito, e a interface anunciava uma fila que não existia.
    const { store, durable, probe } = createQueueStore();

    expect(durable).toBe(false);
    expect(await probe()).toBe(false);

    // E, mesmo degradado, o armazenamento ACEITA o alerta: perder a fila num
    // fechamento de app é ruim, perder o chamado no ato é inaceitável.
    const queue = new OutboxQueue(store);
    await queue.enqueueAlert(alert(uuid(99)));
    expect((await queue.counts()).alerts).toBe(1);
  });

  it("uma falha no meio da fila não impede o alerta seguinte", async () => {
    const memory = createMemoryStore();
    let failNext = true;

    const flaky: QueueStore = {
      ...memory,
      async set(key, value) {
        if (failNext) {
          failNext = false;
          throw new Error("QuotaExceededError");
        }
        return memory.set(key, value);
      },
    };

    const queue = new OutboxQueue(flaky);

    await expect(queue.enqueueAlert(alert(uuid(2)))).rejects.toThrow("Quota");
    await queue.enqueueAlert(alert(uuid(3)));

    const pending = await queue.pendingAlerts();
    expect(pending).toHaveLength(1);
    expect(pending[0]?.payload.clientAlertId).toBe(uuid(3));
  });
});

// ---------------------------------------------------------------------------
// CRÍTICO 2 — qualidade da âncora não pode ser descartada
// ---------------------------------------------------------------------------

describe("crítico 2: confiança e ambiguidade da âncora", () => {
  const { track, index } = loadRealRoute();

  function ping(seq: number, offsetM: number, atMs: number): ClientPing {
    const point = positionAtOffset(track, offsetM);
    return {
      clientPingId: uuid(seq),
      clientSeq: seq,
      lat: point.lat,
      lng: point.lng,
      accuracyM: 8,
      altitudeM: null,
      speedMps: 12,
      headingDeg: null,
      recordedAt: new Date(atMs).toISOString(),
      batteryPct: 80,
      queuedOffline: false,
    };
  }

  it("grava confiança, método e ambiguidade de cada ping", () => {
    const parsed = validatePingBatch({ pings: [ping(1, 20_000, T0)] }, T0 + 1000);
    if (!parsed.ok) throw new Error("lote inválido");

    const { rows } = prepareRows({
      accepted: parsed.value.accepted,
      session: { raceId: "r", positionId: "p", sessionId: "s" },
      route: { index, totalDistanceM: track.totalDistanceM, laps: 1 },
      previous: null,
      clockSkewMs: null,
      rollingSpeedFallbackMps: null,
    });

    // O ponto do crítico: estes três campos existiam no resultado do snap e
    // eram jogados fora na ingestão.
    expect(rows[0]!.snap_confidence).not.toBeNull();
    expect(rows[0]!.snap_method).not.toBeNull();
    expect(typeof rows[0]!.snap_ambiguous).toBe("boolean");
  });

  it("marca como ambíguo o ping que cai no trecho de retorno sem histórico", () => {
    // Sem `previous`, a busca é global: nos últimos 9 km o traçado repete a
    // ida, e o snap avisa que escolheu por desempate. Foi esse aviso descartado
    // que virou "ambulância a 200 m anunciada a 37,6 km".
    const parsed = validatePingBatch({ pings: [ping(1, 47_000, T0)] }, T0 + 1000);
    if (!parsed.ok) throw new Error("lote inválido");

    const { rows } = prepareRows({
      accepted: parsed.value.accepted,
      session: { raceId: "r", positionId: "p", sessionId: "s" },
      route: { index, totalDistanceM: track.totalDistanceM, laps: 1 },
      previous: null,
      clockSkewMs: null,
      rollingSpeedFallbackMps: null,
    });

    const row = rows[0]!;
    const erroM = Math.abs(row.route_offset_m! - 47_000);

    // Ou a âncora está certa, ou ela vem marcada como suspeita. O que não pode
    // é errar 37 km com cara de posição perfeita.
    expect(erroM < 200 || row.snap_ambiguous || row.snap_confidence === "low").toBe(true);
  });

  it("candidato com âncora ambígua não é tratado como fato", () => {
    const origin = { lat: 44.9, lng: 7.6, routeOffsetM: 10_000, ambiguous: false };

    const base: NearestCandidate = {
      positionId: "amb-confiavel",
      label: "Ambulância 1",
      role: "ambulance",
      isDispatchable: true,
      ...destinationPoint({ lat: 44.9, lng: 7.6 }, 90, 3000),
      routeOffsetM: 7_000,
      rollingSpeedMps: 12,
      recordedAtMs: T0,
      ambiguous: false,
    };

    const ambiguo: NearestCandidate = {
      ...base,
      positionId: "amb-ambigua",
      label: "Ambulância 2",
      // Diz estar a 200 m — mas a âncora saiu de desempate, então este número
      // pode estar a dezenas de quilômetros do certo.
      routeOffsetM: 9_800,
      ambiguous: true,
    };

    const result = computeNearestSupport({
      category: "medical",
      origin,
      candidates: [ambiguo, base],
      nowMs: T0 + 5000,
    });

    // A que tem posição confiável ganha, apesar de parecer mais longe.
    expect(result.suggestions[0]?.positionId).toBe("amb-confiavel");

    const suspeita = result.suggestions.find((s) => s.positionId === "amb-ambigua");
    expect(suspeita?.positionUncertain).toBe(true);
    // E a distância dela NÃO é apresentada como distância pela rota.
    expect(suspeita?.routeDistanceM).toBeNull();
    expect(suspeita?.reason).toContain("POSIÇÃO INCERTA");
  });

  it("origem ambígua contamina toda a comparação", () => {
    const result = computeNearestSupport({
      category: "medical",
      origin: { lat: 44.9, lng: 7.6, routeOffsetM: 10_000, ambiguous: true },
      candidates: [
        {
          positionId: "amb",
          label: "Ambulância 1",
          role: "ambulance",
          isDispatchable: true,
          ...destinationPoint({ lat: 44.9, lng: 7.6 }, 90, 1500),
          routeOffsetM: 8_500,
          rollingSpeedMps: 12,
          recordedAtMs: T0,
          ambiguous: false,
        },
      ],
      nowMs: T0 + 5000,
    });

    expect(result.suggestions[0]?.method).toBe("straight_fallback");
    expect(result.suggestions[0]?.positionUncertain).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CRÍTICO 3 — voltas
// ---------------------------------------------------------------------------

describe("crítico 3: circuito de várias voltas", () => {
  const { track, index } = loadRealRoute();
  const LAPS = 3;

  /** Percorre a prova inteira (3 voltas) a 12 m/s, um ping a cada 5 s. */
  function driveWholeRace() {
    const raceDistance = track.totalDistanceM * LAPS;
    const stepM = 60;
    const pings: ClientPing[] = [];
    const truth: number[] = [];

    let seq = 0;
    for (let absolute = 0; absolute < raceDistance; absolute += stepM) {
      const local = absolute % track.totalDistanceM;
      const point = positionAtOffset(track, local);
      seq++;
      truth.push(absolute);
      pings.push({
        clientPingId: uuid(seq),
        clientSeq: seq,
        lat: point.lat,
        lng: point.lng,
        accuracyM: 8,
        altitudeM: null,
        speedMps: 12,
        headingDeg: null,
        recordedAt: new Date(T0 + seq * 5000).toISOString(),
        batteryPct: 80,
        queuedOffline: false,
      });
    }

    return { pings, truth, raceDistance };
  }

  it("conta as voltas e grava a distância REAL da prova", () => {
    const { pings, truth, raceDistance } = driveWholeRace();

    // Processado em lotes, como acontece de verdade: o cursor precisa carregar
    // a volta de um lote para o outro. Era exatamente aí que `previousLap`
    // voltava a zero e 109,7 km de prova desapareciam.
    const BATCH = 50;
    let previous = null as Parameters<typeof prepareRows>[0]["previous"];
    const offsets: number[] = [];
    let lastLap = 0;

    for (let i = 0; i < pings.length; i += BATCH) {
      const slice = pings.slice(i, i + BATCH);
      const parsed = validatePingBatch({ pings: slice }, T0 + pings.length * 5000);
      if (!parsed.ok) throw new Error("lote inválido");

      const { rows, last } = prepareRows({
        accepted: parsed.value.accepted,
        session: { raceId: "r", positionId: "p", sessionId: "s" },
        route: { index, totalDistanceM: track.totalDistanceM, laps: LAPS },
        previous,
        clockSkewMs: null,
        rollingSpeedFallbackMps: 12,
      });

      for (const row of rows) {
        offsets.push(row.lap * track.totalDistanceM + row.route_offset_m!);
        lastLap = Math.max(lastLap, row.lap);
      }

      const tail = rows[rows.length - 1]!;
      previous = {
        offsetM: tail.route_offset_m!,
        lap: tail.lap,
        recordedAtMs: Date.parse(tail.recorded_at),
        speedMps: 12,
      };
      expect(last?.absoluteOffsetM).toBeCloseTo(offsets[offsets.length - 1]!, 0);
    }

    // A prova tem 3 voltas: a última tem que ser a volta 2 (índice 0).
    expect(lastLap).toBe(LAPS - 1);

    // E a distância percorrida gravada tem que ser a distância REAL, não o
    // comprimento de uma volta. Medido antes da correção: 10,9 km de 120,7 km.
    const gravado = offsets[offsets.length - 1]!;
    expect(gravado).toBeGreaterThan(raceDistance * 0.95);

    // Nenhum salto para trás ao cruzar a linha de largada.
    const maiorRecuo = offsets.reduce(
      (worst, o, i) => (i === 0 ? worst : Math.min(worst, o - offsets[i - 1]!)),
      0,
    );
    expect(maiorRecuo).toBeGreaterThan(-100);

    const erroFinal = Math.abs(gravado - truth[truth.length - 1]!);
    expect(erroFinal).toBeLessThan(500);
  });

  it("gap não é zero entre veículos em voltas diferentes", () => {
    // Mesmo ponto do traçado, voltas diferentes: em offset local os dois estão
    // a 0 m um do outro. Em offset absoluto, a uma volta inteira.
    const lapM = track.totalDistanceM;
    const abertura = 2 * lapM + 5_000;
    const vassoura = 0 * lapM + 5_000;

    expect(Math.abs(abertura - vassoura)).toBeCloseTo(2 * lapM, 0);

    const result = computeNearestSupport({
      category: "medical",
      origin: { lat: 44.9, lng: 7.6, routeOffsetM: abertura },
      candidates: [
        {
          positionId: "amb",
          label: "Ambulância 1",
          role: "ambulance",
          isDispatchable: true,
          lat: 44.9,
          lng: 7.6,
          routeOffsetM: vassoura,
          rollingSpeedMps: 12,
          recordedAtMs: T0,
        },
      ],
      nowMs: T0 + 5000,
    });

    // Duas voltas atrás não pode virar "0 m do acidente".
    expect(result.suggestions[0]?.routeDistanceM).toBeGreaterThan(lapM);
  });
});

// ---------------------------------------------------------------------------
// CRÍTICO 4 — um veículo, um acionamento
// ---------------------------------------------------------------------------

describe("crítico 4: veículo já acionado não é acionado de novo", () => {
  function ambulance(id: string, offsetM: number): NearestCandidate {
    return {
      positionId: id,
      label: id,
      role: "ambulance" as PositionRole,
      isDispatchable: true,
      ...destinationPoint({ lat: 44.9, lng: 7.6 }, 90, offsetM),
      routeOffsetM: offsetM,
      rollingSpeedMps: 12,
      recordedAtMs: T0,
    };
  }

  it("exclui quem já está a caminho de outro alerta", () => {
    const candidates = [ambulance("amb-1", 1_000), ambulance("amb-2", 5_000)];

    const primeiro = computeNearestSupport({
      category: "medical",
      origin: { lat: 44.9, lng: 7.6, routeOffsetM: 2_000 },
      candidates,
      nowMs: T0 + 1000,
    });

    expect(primeiro.suggestions[0]?.positionId).toBe("amb-1");

    // Segundo acidente, com a primeira ambulância já ocupada.
    const segundo = computeNearestSupport({
      category: "medical",
      origin: { lat: 44.9, lng: 7.6, routeOffsetM: 2_000 },
      candidates,
      nowMs: T0 + 1000,
      busyPositionIds: ["amb-1"],
    });

    expect(segundo.suggestions.map((s) => s.positionId)).not.toContain("amb-1");
    expect(segundo.suggestions[0]?.positionId).toBe("amb-2");
  });

  it("diz claramente quando não sobrou ninguém livre", () => {
    const result = computeNearestSupport({
      category: "medical",
      origin: { lat: 44.9, lng: 7.6, routeOffsetM: 2_000 },
      candidates: [ambulance("amb-1", 1_000)],
      nowMs: T0 + 1000,
      busyPositionIds: ["amb-1"],
    });

    expect(result.suggestions).toHaveLength(0);
    expect(result.note).toContain("já acionado");
  });
});

// ---------------------------------------------------------------------------
// SÉRIO 5 — acionamento que falha é reprocessado
// ---------------------------------------------------------------------------

describe("sério 5: retentativa de acionamento", () => {
  it("cresce com as tentativas e tem teto", () => {
    expect(dispatchRetryDelayMs(0)).toBe(30_000);
    expect(dispatchRetryDelayMs(1)).toBe(60_000);
    expect(dispatchRetryDelayMs(2)).toBe(120_000);
    // Teto: um alerta numa prova sem veículo nenhum não varre o banco para
    // sempre a cada 30 s.
    expect(dispatchRetryDelayMs(20)).toBe(5 * 60_000);
  });
});
