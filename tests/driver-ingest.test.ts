import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  estimateClockSkewMs,
  MAX_ACCURACY_M,
  validatePingBatch,
  type ValidatedPing,
} from "@/app/api/driver/_lib/ingest";
import { positionAtOffset, buildRouteTrack, RouteIndex } from "@/lib/route/track";
import { parseGpx } from "@/lib/gpx/parse";
import { snapToRoute, type SnapPrevious } from "@/lib/route/snap";
import { destinationPoint } from "@/lib/geo/distance";
import type { ClientPing } from "@/lib/types";

/**
 * Testes da ingestão.
 *
 * A segunda metade roda sobre o PERCURSO REAL (Giro delle Langhe, 55 km de
 * estrada do OpenStreetMap) porque é lá que estão os casos que uma linha
 * sintética não tem: grampos de raio pequeno, trechos que voltam pela mesma
 * via, densidade irregular de vértices. É exatamente essa geometria que quebra
 * uma reconstrução ingênua da fila offline.
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

function ping(overrides: Partial<ClientPing> & { clientSeq: number }): ClientPing {
  return {
    clientPingId: uuid(overrides.clientSeq),
    lat: 44.7,
    lng: 8.03,
    accuracyM: 8,
    altitudeM: 300,
    speedMps: 12,
    headingDeg: 90,
    recordedAt: new Date(T0 + overrides.clientSeq * 3000).toISOString(),
    batteryPct: 90,
    queuedOffline: false,
    ...overrides,
  };
}

describe("validatePingBatch", () => {
  it("ordena o lote cronologicamente, não pela ordem de chegada", () => {
    // A fila offline descarrega junto com os pings novos e a ordem se embaralha.
    const raw = {
      pings: [
        ping({ clientSeq: 5 }),
        ping({ clientSeq: 1 }),
        ping({ clientSeq: 4 }),
        ping({ clientSeq: 2 }),
        ping({ clientSeq: 3 }),
      ],
    };

    const result = validatePingBatch(raw, T0 + 60_000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.accepted.map((p) => p.clientSeq)).toEqual([1, 2, 3, 4, 5]);
  });

  it("rejeita lixo com motivo, sem derrubar o resto do lote", () => {
    const raw = {
      pings: [
        ping({ clientSeq: 1 }),
        { ...ping({ clientSeq: 2 }), clientPingId: "não-é-uuid" },
        { ...ping({ clientSeq: 3 }), lat: 0, lng: 0 },
        { ...ping({ clientSeq: 4 }), accuracyM: MAX_ACCURACY_M + 1 },
        { ...ping({ clientSeq: 5 }), lat: 91 },
        { ...ping({ clientSeq: 6 }), recordedAt: "ontem de manhã" },
        ping({ clientSeq: 7 }),
      ],
    };

    const result = validatePingBatch(raw, T0 + 60_000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.accepted.map((p) => p.clientSeq)).toEqual([1, 7]);
    expect(result.value.rejected).toHaveLength(5);
    expect(result.value.rejected.map((r) => r.reason).join(" ")).toMatch(/UUID/);
    expect(result.value.rejected.map((r) => r.reason).join(" ")).toMatch(/\(0, 0\)/);
    expect(result.value.rejected.map((r) => r.reason).join(" ")).toMatch(/Precisão/);
  });

  it("recusa relógio adiantado, que congelaria o veículo no mapa", () => {
    const raw = {
      pings: [
        {
          ...ping({ clientSeq: 1 }),
          recordedAt: new Date(T0 + 60 * 60_000).toISOString(),
        },
      ],
    };

    const result = validatePingBatch(raw, T0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.accepted).toHaveLength(0);
    expect(result.value.rejected[0]?.reason).toMatch(/futuro/);
  });

  it("aceita fila offline de horas atrás", () => {
    const raw = {
      pings: [
        {
          ...ping({ clientSeq: 1 }),
          queuedOffline: true,
          recordedAt: new Date(T0 - 5 * 60 * 60_000).toISOString(),
        },
      ],
    };

    const result = validatePingBatch(raw, T0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.accepted).toHaveLength(1);
  });

  it("elimina duplicata dentro do lote sem reportá-la como recusa", () => {
    const duplicated = ping({ clientSeq: 1 });
    const result = validatePingBatch({ pings: [duplicated, { ...duplicated }] }, T0 + 5000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.accepted).toHaveLength(1);
    expect(result.value.rejected).toHaveLength(0);
  });

  it("recusa o lote inteiro quando ele é grande demais para ser fila legítima", () => {
    const pings = Array.from({ length: 501 }, (_, i) => ping({ clientSeq: i + 1 }));
    const result = validatePingBatch({ pings }, T0 + 60_000);
    expect(result.ok).toBe(false);
  });
});

describe("estimateClockSkewMs", () => {
  it("ignora pings que passaram pela fila, medindo só o relógio", () => {
    const parsed = validatePingBatch(
      {
        pings: [
          { ...ping({ clientSeq: 1 }), queuedOffline: true },
          { ...ping({ clientSeq: 2 }), queuedOffline: false },
        ],
      },
      T0 + 10_000,
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    // O ping fresco é o de seq 2, gravado em T0+6000; servidor em T0+10000.
    expect(estimateClockSkewMs(parsed.value.accepted, T0 + 10_000)).toBe(4000);
  });

  it("devolve null quando todo o lote veio da fila", () => {
    const accepted: ValidatedPing[] = [];
    expect(estimateClockSkewMs(accepted, T0)).toBeNull();
  });
});

/**
 * Reprodução do encadeamento que o Route Handler faz: processar em ordem
 * cronológica, alimentando cada ping com o offset E a velocidade do anterior.
 */
function reconstruct(
  index: RouteIndex,
  pings: ValidatedPing[],
  seed: SnapPrevious | null,
): number[] {
  let cursor = seed;
  const offsets: number[] = [];

  for (const p of pings) {
    const snapped = snapToRoute(index, { lat: p.lat, lng: p.lng }, {
      previous: cursor,
      recordedAtMs: p.recordedAtMs,
      accuracyM: p.accuracyM,
      expectedSpeedMps: p.speedMps ?? cursor?.speedMps ?? null,
    });

    offsets.push(snapped.offsetM);
    cursor = {
      offsetM: snapped.offsetM,
      recordedAtMs: p.recordedAtMs,
      speedMps: p.speedMps ?? cursor?.speedMps ?? null,
    };
  }

  return offsets;
}

describe("reconstrução da fila offline sobre percurso real", () => {
  const { track, index } = loadRealRoute();

  /** Veículo a 12 m/s (~43 km/h) com ruído de GPS de até 10 m. */
  function drive(fromOffsetM: number, count: number, stepS = 3, speedMps = 12) {
    const raw: ClientPing[] = [];
    const truth: number[] = [];
    let rnd = 12345;
    const random = () => ((rnd = (rnd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

    for (let i = 0; i < count; i++) {
      const offset = fromOffsetM + i * stepS * speedMps;
      const point = positionAtOffset(track, offset);
      const noisy = destinationPoint(point, random() * 360, random() * 10);

      truth.push(offset);
      raw.push({
        clientPingId: uuid(i + 1),
        clientSeq: i + 1,
        lat: noisy.lat,
        lng: noisy.lng,
        accuracyM: 10,
        altitudeM: null,
        speedMps,
        headingDeg: null,
        recordedAt: new Date(T0 + i * stepS * 1000).toISOString(),
        batteryPct: 70,
        queuedOffline: i > 0,
      });
    }

    return { raw, truth };
  }

  it("reconstrói 2 minutos de fila embaralhada com erro pequeno", () => {
    // 2 minutos a um ping a cada 3 s = 40 pontos, saindo do km 20.
    const START = 20_000;
    const { raw, truth } = drive(START, 40);

    // O lote chega fora de ordem — é o que acontece quando o app manda a fila
    // junto com o ponto novo e a rede reordena.
    const shuffled = [...raw].sort(() => (Math.random() > 0.5 ? 1 : -1));

    const parsed = validatePingBatch({ pings: shuffled }, T0 + 130_000);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.value.accepted).toHaveLength(40);
    expect(parsed.value.rejected).toHaveLength(0);

    const offsets = reconstruct(index, parsed.value.accepted, {
      offsetM: START,
      recordedAtMs: T0 - 3000,
      speedMps: 12,
    });

    const errors = offsets.map((o, i) => Math.abs(o - truth[i]!));
    const worst = Math.max(...errors);
    const mean = errors.reduce((a, b) => a + b, 0) / errors.length;

    // Ruído de GPS de 10 m projetado sobre a estrada não pode virar erro de
    // centenas de metros. O limite é folgado e ainda assim ordens de grandeza
    // abaixo do que um snap sem continuidade produz num grampo.
    expect(worst).toBeLessThan(60);
    expect(mean).toBeLessThan(25);

    // E o offset tem que avançar monotonicamente: o veículo não anda para trás.
    for (let i = 1; i < offsets.length; i++) {
      expect(offsets[i]!).toBeGreaterThan(offsets[i - 1]! - 1);
    }
  });

  it("processar na ordem de chegada degrada a reconstrução", () => {
    const START = 20_000;
    const { raw, truth } = drive(START, 40);

    const parsed = validatePingBatch({ pings: raw }, T0 + 130_000);
    if (!parsed.ok) throw new Error("lote inválido");

    const ordered = reconstruct(index, parsed.value.accepted, {
      offsetM: START,
      recordedAtMs: T0 - 3000,
      speedMps: 12,
    });

    // Mesma entrada, ordem embaralhada e SEM ordenar (o que a rota faria se não
    // ordenasse): o cursor de continuidade passa a apontar para o futuro e para
    // o passado alternadamente.
    const scrambled = [...parsed.value.accepted].reverse();
    const chaotic = reconstruct(index, scrambled, {
      offsetM: START,
      recordedAtMs: T0 - 3000,
      speedMps: 12,
    });

    const orderedError =
      ordered.reduce((acc, o, i) => acc + Math.abs(o - truth[i]!), 0) / ordered.length;

    // Na ordem invertida, cada ping é comparado com o índice errado da verdade;
    // o ponto é que o resultado deixa de ser utilizável.
    const reversedTruth = [...truth].reverse();
    const chaoticError =
      chaotic.reduce((acc, o, i) => acc + Math.abs(o - reversedTruth[i]!), 0) / chaotic.length;

    expect(orderedError).toBeLessThan(chaoticError);
  });

  it("sem velocidade informada o erro cresce — é por isso que a passamos", () => {
    const START = 20_000;
    const { raw, truth } = drive(START, 40);

    const parsed = validatePingBatch({ pings: raw }, T0 + 130_000);
    if (!parsed.ok) throw new Error("lote inválido");

    const withSpeed = reconstruct(index, parsed.value.accepted, {
      offsetM: START,
      recordedAtMs: T0 - 3000,
      speedMps: 12,
    });

    const withoutSpeed = (() => {
      let cursor: SnapPrevious | null = { offsetM: START, recordedAtMs: T0 - 3000 };
      const offsets: number[] = [];
      for (const p of parsed.value.accepted) {
        const snapped = snapToRoute(index, { lat: p.lat, lng: p.lng }, {
          previous: cursor,
          recordedAtMs: p.recordedAtMs,
        });
        offsets.push(snapped.offsetM);
        cursor = { offsetM: snapped.offsetM, recordedAtMs: p.recordedAtMs };
      }
      return offsets;
    })();

    const err = (list: number[]) =>
      list.reduce((acc, o, i) => acc + Math.abs(o - truth[i]!), 0) / list.length;

    expect(err(withSpeed)).toBeLessThanOrEqual(err(withoutSpeed));
  });
});
