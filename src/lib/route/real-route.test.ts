import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { destinationPoint, haversineMeters } from "@/lib/geo/distance";
import { parseGpx } from "@/lib/gpx/parse";
import { simplifyToBudget } from "@/lib/geo/simplify";
import { computeGap } from "@/lib/route/gap";
import { snapToRoute, type SnapPrevious } from "@/lib/route/snap";
import {
  buildRouteTrack,
  positionAtOffset,
  RouteIndex,
  type RouteTrack,
} from "@/lib/route/track";

/**
 * Validação contra um percurso REAL.
 *
 * `tests/fixtures/real-route.gpx` é o Giro delle Langhe: 55 km de estrada de
 * verdade do OpenStreetMap, roteada pelo OSRM. Tem grampos apertados, trechos
 * que passam a poucos metros de si mesmos e densidade de vértices irregular —
 * a geometria que quebra implementações que só foram testadas em linhas retas
 * desenhadas à mão.
 *
 * Regenerar com: node scripts/fetch-real-gpx.mjs
 */

const GPX_PATH = join(process.cwd(), "tests", "fixtures", "real-route.gpx");

function loadRealTrack(): { track: RouteTrack; index: RouteIndex } {
  const xml = readFileSync(GPX_PATH, "utf8");
  const parsed = parseGpx(xml);
  const segment = parsed.segments[0]!;
  const { track } = buildRouteTrack(segment.points);
  return { track, index: new RouteIndex(track) };
}

describe("percurso real — leitura e medição", () => {
  it("lê o GPX e reconhece a trilha", () => {
    const xml = readFileSync(GPX_PATH, "utf8");
    const parsed = parseGpx(xml);

    expect(parsed.segments).toHaveLength(1);
    expect(parsed.segments[0]!.kind).toBe("track");
    expect(parsed.segments[0]!.points.length).toBeGreaterThan(2000);
    expect(parsed.metadataName).toMatch(/Langhe/);
  });

  it("mede 54,9 km — o mesmo que o OSRM calculou independentemente", () => {
    const { track } = loadRealTrack();
    const km = track.totalDistanceM / 1000;

    // O OSRM reportou 54,9 km sobre exatamente esta geometria, usando sua
    // própria implementação. Bater com ele dentro de 0,5% é evidência forte de
    // que a acumulação por haversine está correta — muito mais forte que
    // comparar o código com ele mesmo.
    expect(km).toBeGreaterThan(54.6);
    expect(km).toBeLessThan(55.2);
  });

  it("acha ganho de elevação e caixa envolvente coerentes", () => {
    const { track } = loadRealTrack();

    expect(track.elevationGainM).not.toBeNull();
    expect(track.bbox.minLat).toBeGreaterThan(44.5);
    expect(track.bbox.maxLat).toBeLessThan(44.8);
    expect(track.bbox.minLng).toBeGreaterThan(7.8);
    expect(track.bbox.maxLng).toBeLessThan(8.1);
  });

  it("simplifica para o mapa sem encurtar o percurso de cálculo", () => {
    const { track } = loadRealTrack();
    const latlng = track.points.map(([lng, lat]) => ({ lat, lng }));

    const { points: simplified } = simplifyToBudget(latlng, 800);

    expect(simplified.length).toBeLessThanOrEqual(800);
    expect(simplified.length).toBeGreaterThan(100);

    // A geometria de cálculo continua intacta — a simplificação é só para
    // desenhar. Se isto falhar, todos os quilômetros da prova estão errados.
    expect(track.points.length).toBeGreaterThan(2000);
  });
});

describe("percurso real — o trecho que engana o snap ingênuo", () => {
  const { track, index } = loadRealTrack();

  /**
   * Acha automaticamente o pior caso do percurso: o par de pontos que está
   * mais perto em linha reta apesar de estar longe ao longo da rota. É onde a
   * estrada quase se toca — e onde um snap sem memória troca as pernas.
   */
  function findWorstAmbiguity() {
    let best = { straightM: Infinity, offsetA: 0, offsetB: 0, a: 0, b: 0 };
    const pts = track.points;
    const MIN_ROUTE_SEPARATION_M = 2000;

    // Amostragem esparsa: 2175 pontos daria 2,3 milhões de pares.
    for (let i = 0; i < pts.length; i += 3) {
      for (let j = i + 1; j < pts.length; j += 3) {
        const a = pts[i]!;
        const b = pts[j]!;
        if (b[2] - a[2] < MIN_ROUTE_SEPARATION_M) continue;

        const d = haversineMeters(
          { lat: a[1], lng: a[0] },
          { lat: b[1], lng: b[0] },
        );

        if (d < best.straightM) {
          best = { straightM: d, offsetA: a[2], offsetB: b[2], a: i, b: j };
        }
      }
    }

    return best;
  }

  const worst = findWorstAmbiguity();

  it("o percurso realmente tem um ponto onde a estrada quase se toca", () => {
    // Sem isso, os testes abaixo não estariam testando nada.
    expect(worst.straightM).toBeLessThan(60);
    expect(worst.offsetB - worst.offsetA).toBeGreaterThan(2000);
  });

  it("a continuidade escolhe a perna certa nos DOIS sentidos", () => {
    const t0 = Date.UTC(2026, 7, 14, 9, 0, 0);
    const pA = positionAtOffset(track, worst.offsetA);
    const pB = positionAtOffset(track, worst.offsetB);

    // Veículo vindo de trás em A: tem que ficar em A, não pular para B.
    const atA = snapToRoute(index, pA, {
      previous: { offsetM: worst.offsetA - 200, recordedAtMs: t0 - 20_000 },
      recordedAtMs: t0,
    });
    expect(Math.abs(atA.offsetM - worst.offsetA)).toBeLessThan(250);

    // Veículo vindo de trás em B: tem que ficar em B.
    const atB = snapToRoute(index, pB, {
      previous: { offsetM: worst.offsetB - 200, recordedAtMs: t0 - 20_000 },
      recordedAtMs: t0,
    });
    expect(Math.abs(atB.offsetM - worst.offsetB)).toBeLessThan(250);

    // E os dois offsets são de fato muito distantes entre si.
    expect(Math.abs(atB.offsetM - atA.offsetM)).toBeGreaterThan(2000);
  });
});

describe("percurso real — veículo percorrendo a prova inteira", () => {
  const { track, index } = loadRealTrack();

  /**
   * Dirige o percurso completo com ruído de GPS e confere que a posição na
   * prova avança de forma sã. É o teste que mais se aproxima do uso real:
   * ~2000 pings sobre 55 km de estrada com grampos.
   */
  function driveWholeRoute(opts: {
    speedMps: number;
    intervalS: number;
    noiseM: number;
    /** Trecho, em metros de prova, durante o qual o veículo fica sem sinal. */
    blackout?: { fromM: number; toM: number };
    seed?: number;
    /**
     * Simula um aparelho que não reporta velocidade. Existe para documentar a
     * degradação, não porque seja o caso normal — a API de geolocalização dos
     * navegadores fornece `speed` em qualquer celular moderno em movimento.
     */
    withoutSpeed?: boolean;
  }) {
    let seed = opts.seed ?? 42;
    const random = () => {
      // LCG: ruído reprodutível, para o teste não ficar intermitente.
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const results: Array<{
      trueOffsetM: number;
      snappedOffsetM: number;
      snapDistanceM: number;
      method: string;
    }> = [];

    let previous: SnapPrevious | null = null;
    let tMs = Date.UTC(2026, 7, 14, 9, 0, 0);
    const stepM = opts.speedMps * opts.intervalS;

    for (let d = 0; d <= track.totalDistanceM; d += stepM) {
      const truth = positionAtOffset(track, d);

      const inBlackout =
        opts.blackout && d >= opts.blackout.fromM && d <= opts.blackout.toM;

      if (!inBlackout) {
        // Ruído de GPS: deslocamento aleatório até `noiseM` em rumo aleatório.
        const noisy = destinationPoint(
          truth,
          random() * 360,
          random() * opts.noiseM,
        );

        const snap = snapToRoute(index, noisy, {
          previous,
          recordedAtMs: tMs,
        });

        results.push({
          trueOffsetM: d,
          snappedOffsetM: snap.offsetM,
          snapDistanceM: snap.snapDistanceM,
          method: snap.method,
        });

        previous = {
          offsetM: snap.offsetM,
          recordedAtMs: tMs,
          // O GPS do celular reporta velocidade com erro de alguns por cento.
          speedMps: opts.withoutSpeed
            ? null
            : opts.speedMps * (0.85 + 0.3 * random()),
        };
      }

      tMs += opts.intervalS * 1000;
    }

    return results;
  }

  it("segue os 55 km sem nunca saltar para outro trecho da estrada", () => {
    const drive = driveWholeRoute({
      speedMps: 12, // ~43 km/h, velocidade de carro de abertura
      intervalS: 3,
      noiseM: 8,
    });

    expect(drive.length).toBeGreaterThan(1400);

    // Erro entre a posição real na prova e a estimada.
    const errors = drive.map((r) =>
      Math.abs(r.snappedOffsetM - r.trueOffsetM),
    );
    const maxError = Math.max(...errors);
    const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;

    // Com 8 m de ruído, um erro de dezenas de metros é esperado e aceitável.
    // Um erro de milhares de metros significaria salto de perna — o defeito
    // que este sistema inteiro existe para evitar.
    expect(meanError).toBeLessThan(30);
    expect(maxError).toBeLessThan(300);

    // Nenhum ping pode ter sido resolvido por "recuperação global": num
    // trajeto contínuo, a janela de continuidade tem que dar conta sempre.
    const recoveries = drive.filter((r) => r.method === "global_recovery");
    expect(recoveries).toHaveLength(0);
  });

  it("avança de forma monotônica, sem recuos artificiais", () => {
    const drive = driveWholeRoute({ speedMps: 12, intervalS: 3, noiseM: 8 });

    let worstBacktrack = 0;
    for (let i = 1; i < drive.length; i++) {
      const delta = drive[i]!.snappedOffsetM - drive[i - 1]!.snappedOffsetM;
      if (delta < 0) worstBacktrack = Math.min(worstBacktrack, delta);
    }

    // Ruído de GPS causa recuos pequenos e isso é honesto — o veículo
    // realmente parece ter voltado. O que não pode acontecer é recuo grande,
    // que seria salto de segmento.
    expect(worstBacktrack).toBeGreaterThan(-60);
  });

  it("reencontra o veículo depois de 2 minutos sem sinal", () => {
    // O veículo some no km 20 e reaparece 2 min depois, ~1,4 km à frente.
    const drive = driveWholeRoute({
      speedMps: 12,
      intervalS: 3,
      noiseM: 8,
      blackout: { fromM: 20_000, toM: 21_440 },
    });

    const afterBlackout = drive.find((r) => r.trueOffsetM > 21_440);
    expect(afterBlackout).toBeDefined();

    // Tem que reaparecer no lugar certo, não no início da prova nem na outra
    // perna do grampo mais próximo.
    expect(
      Math.abs(afterBlackout!.snappedOffsetM - afterBlackout!.trueOffsetM),
    ).toBeLessThan(300);

    // E o resto da prova continua correto depois da recuperação.
    const tail = drive.filter((r) => r.trueOffsetM > 22_000);
    const tailMaxError = Math.max(
      ...tail.map((r) => Math.abs(r.snappedOffsetM - r.trueOffsetM)),
    );
    expect(tailMaxError).toBeLessThan(300);
  });

  it("degrada de forma limitada num aparelho que não reporta velocidade", () => {
    // Documenta o custo real de não ter velocidade. O percurso tem um trecho
    // que entra e volta pela mesma via, e ali a geometria sozinha não
    // distingue os sentidos: sem modelo de movimento a estimativa fica para
    // trás e o erro se acumula até a via voltar a se separar.
    //
    // Este teste existe para que a degradação seja conhecida e vigiada, não
    // para ser aceita: a ingestão SEMPRE passa a velocidade.
    const drive = driveWholeRoute({
      speedMps: 12,
      intervalS: 3,
      noiseM: 8,
      withoutSpeed: true,
    });

    const errors = drive.map((r) => Math.abs(r.snappedOffsetM - r.trueOffsetM));
    const bad = errors.filter((e) => e > 100);

    // Localizado, não sistêmico: um punhado de pings num único trecho.
    expect(bad.length).toBeLessThan(drive.length * 0.02);
    // E mesmo assim nunca vira salto de perna.
    expect(Math.max(...errors)).toBeLessThan(900);
  });

  it("aguenta ruído de GPS grosseiro em cânion urbano", () => {
    // 40 m de ruído é o que se vê entre prédios ou em vale fechado.
    const drive = driveWholeRoute({ speedMps: 12, intervalS: 3, noiseM: 40 });

    const errors = drive.map((r) => Math.abs(r.snappedOffsetM - r.trueOffsetM));
    const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;

    // Degrada, mas não desmorona: continua utilizável para decidir se a rua
    // pode abrir.
    expect(meanError).toBeLessThan(120);
    expect(Math.max(...errors)).toBeLessThan(1500);
  });
});

describe("percurso real — janela abertura ↔ fechamento", () => {
  const { track, index } = loadRealTrack();

  it("mede 20 minutos de janela entre dois veículos reais no percurso", () => {
    const t0 = Date.UTC(2026, 7, 14, 9, 0, 0);
    const SPEED = 11; // m/s
    const GAP_S = 20 * 60;

    /** Roda um veículo pelo percurso e devolve o histórico (offset, tempo). */
    function run(startMs: number, untilMs: number) {
      const history: Array<{ offsetM: number; atMs: number }> = [];
      let previous: { offsetM: number; recordedAtMs: number } | null = null;

      for (let t = startMs; t <= untilMs; t += 10_000) {
        const trueOffset = ((t - startMs) / 1000) * SPEED;
        if (trueOffset > track.totalDistanceM) break;

        const snap = snapToRoute(index, positionAtOffset(track, trueOffset), {
          previous,
          recordedAtMs: t,
        });

        history.push({ offsetM: snap.offsetM, atMs: t });
        previous = { offsetM: snap.offsetM, recordedAtMs: t };
      }

      return history;
    }

    const now = t0 + 50 * 60_000;
    const leadHistory = run(t0, now);
    const sweepHistory = run(t0 + GAP_S * 1000, now);

    const lead = leadHistory[leadHistory.length - 1]!;
    const sweep = sweepHistory[sweepHistory.length - 1]!;

    const gap = computeGap({
      lead: { offsetM: lead.offsetM, atMs: lead.atMs, history: leadHistory },
      sweep: { offsetM: sweep.offsetM, atMs: sweep.atMs, history: sweepHistory },
      totalDistanceM: track.totalDistanceM,
      nowMs: now,
    });

    expect(gap.method).toBe("measured");

    // 20 min de janela, com tolerância para a granularidade de 10 s do
    // histórico e o ruído do snap.
    expect(gap.gapSeconds).toBeGreaterThan(GAP_S - 30);
    expect(gap.gapSeconds).toBeLessThan(GAP_S + 30);

    // A distância pela estrada correspondente: 20 min × 11 m/s = 13,2 km.
    expect(gap.gapM).toBeGreaterThan(12_800);
    expect(gap.gapM).toBeLessThan(13_600);

    // E o ponto central: essa separação de 13 km pela estrada NÃO corresponde
    // a 13 km em linha reta — é um circuito, os dois veículos podem estar
    // geograficamente próximos.
    const leadPos = positionAtOffset(track, lead.offsetM);
    const sweepPos = positionAtOffset(track, sweep.offsetM);
    const straight = haversineMeters(leadPos, sweepPos);
    expect(straight).toBeLessThan(gap.gapM! * 0.85);
  });
});
