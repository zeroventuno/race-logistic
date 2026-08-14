import { describe, expect, it } from "vitest";

import { destinationPoint, haversineMeters } from "@/lib/geo/distance";
import { simplifyToBudget } from "@/lib/geo/simplify";
import { normalizeBindCode } from "@/lib/codes/bind-code";
import { parseGpx } from "@/lib/gpx/parse";
import { computeGap } from "@/lib/route/gap";
import { SnapInputError, snapToRoute } from "@/lib/route/snap";
import {
  buildRouteTrack,
  positionAtOffset,
  RouteIndex,
  RouteTrackError,
  type RawRoutePoint,
} from "@/lib/route/track";
import { xyToLatLng } from "../../../tests/fixtures/routes";

/**
 * Regressões dos defeitos que a revisão adversarial encontrou.
 *
 * Cada bloco aqui existe porque um crítico com contexto limpo conseguiu
 * quebrar o sistema de um jeito específico. Os testes são escritos a partir do
 * caso concreto que ele demonstrou, não a partir do conserto — a ideia é que
 * eles continuem falhando se alguém reintroduzir o comportamento antigo por
 * outro caminho.
 */

const T0 = Date.UTC(2026, 7, 14, 9, 0, 0);

/** Circuito fechado de 10 km. */
function buildCircuit(circumferenceM = 10_000, spacingM = 10) {
  const R = circumferenceM / (2 * Math.PI);
  const n = Math.round(circumferenceM / spacingM);
  const pts: RawRoutePoint[] = [];

  for (let i = 0; i <= n; i++) {
    const theta = (2 * Math.PI * i) / n;
    pts.push({
      ...xyToLatLng(R * Math.sin(theta), R - R * Math.cos(theta)),
      ele: 200,
    });
  }

  return buildRouteTrack(pts);
}

describe("regressão: prova em circuito não pode falhar em silêncio", () => {
  it("a construção do percurso DETECTA o fechamento e avisa", () => {
    const { track, warnings } = buildCircuit();

    expect(track.isLoop).toBe(true);
    expect(track.startFinishGapM).toBeLessThan(50);
    expect(warnings.join(" ")).toMatch(/circuito/i);
    expect(warnings.join(" ")).toMatch(/volta/i);
  });

  it("percurso ponto-a-ponto NÃO é marcado como circuito", () => {
    const pts: RawRoutePoint[] = [];
    for (let x = 0; x <= 5000; x += 10) pts.push({ ...xyToLatLng(x, 0), ele: 0 });

    const { track, warnings } = buildRouteTrack(pts);

    expect(track.isLoop).toBe(false);
    expect(warnings.join(" ")).not.toMatch(/circuito/i);
  });

  it("o veículo NÃO fica preso ao cruzar a linha de largada", () => {
    // Era o pior sintoma: a janela de busca terminava no fim do traçado, então
    // o veículo que cruzava a chegada ficava travado no offset final — com
    // confiança ALTA — enquanto dava outra volta inteira.
    const { track } = buildCircuit();
    const index = new RouteIndex(track);
    const total = track.totalDistanceM;

    const before = snapToRoute(index, positionAtOffset(track, total - 60), {
      previous: { offsetM: total - 100, recordedAtMs: T0 - 3000, speedMps: 12, lap: 0 },
      recordedAtMs: T0,
    });

    const after = snapToRoute(index, positionAtOffset(track, 40), {
      previous: {
        offsetM: before.offsetM,
        recordedAtMs: T0,
        speedMps: 12,
        lap: before.lap,
      },
      recordedAtMs: T0 + 3000,
    });

    // Voltou ao começo do traçado…
    expect(after.offsetM).toBeLessThan(200);
    // …e contou a volta.
    expect(after.lap).toBe(1);
    // A distância percorrida de prova continua crescendo monotonicamente.
    expect(after.absoluteOffsetM).toBeGreaterThan(before.absoluteOffsetM);
    expect(after.absoluteOffsetM - before.absoluteOffsetM).toBeLessThan(200);
  });

  it("três voltas completas são contadas corretamente", () => {
    const { track } = buildCircuit();
    const index = new RouteIndex(track);

    let previous = { offsetM: 0, recordedAtMs: T0, speedMps: 12, lap: 0 };
    let tMs = T0;
    let last = snapToRoute(index, positionAtOffset(track, 0), {
      previous: null,
      recordedAtMs: tMs,
    });

    const totalTravelM = 3 * track.totalDistanceM - 100;

    for (let d = 36; d <= totalTravelM; d += 36) {
      tMs += 3000;
      const lapOfTruth = Math.floor(d / track.totalDistanceM);
      const withinLap = d - lapOfTruth * track.totalDistanceM;

      last = snapToRoute(index, positionAtOffset(track, withinLap), {
        previous,
        recordedAtMs: tMs,
      });

      previous = {
        offsetM: last.offsetM,
        recordedAtMs: tMs,
        speedMps: 12,
        lap: last.lap,
      };
    }

    expect(last.lap).toBe(2);
    expect(Math.abs(last.absoluteOffsetM - totalTravelM)).toBeLessThan(200);
  });

  it("a janela abertura↔fechamento usa distância ABSOLUTA entre voltas", () => {
    // O caso que o crítico demonstrou: abertura na volta 2 no km 8 (18 km
    // reais) e vassoura na volta 1 no km 3 (3 km reais). A separação real é de
    // 15 km. Usando offset dentro da volta, o sistema reportava 5 km — e
    // rotulava como "medido", que é a marca de "isto é observação, não
    // extrapolação".
    const total = 10_000;

    const leadHistory = [];
    for (let d = 0; d <= 18_000; d += 500) {
      leadHistory.push({ offsetM: d, atMs: T0 + (d / 12) * 1000 });
    }

    const sweepHistory = [];
    for (let d = 0; d <= 3_000; d += 500) {
      sweepHistory.push({ offsetM: d, atMs: T0 + 1_250_000 + (d / 12) * 1000 });
    }

    const nowMs = T0 + 1_500_000;

    const gap = computeGap({
      lead: { offsetM: 18_000, atMs: nowMs, receivedAtMs: nowMs, history: leadHistory },
      sweep: { offsetM: 3_000, atMs: nowMs, receivedAtMs: nowMs, history: sweepHistory },
      totalDistanceM: total,
      nowMs,
    });

    expect(gap.gapM).toBe(15_000);
  });
});

describe("regressão: índice espacial não pode devolver segmento de outro lugar", () => {
  it("ponto muito longe do percurso cai na varredura completa, não num balde aliasado", () => {
    // A chave `iy * cols + ix` colidia para qualquer ponto fora da caixa
    // envolvente. O efeito: um veículo a algumas centenas de metros do traçado
    // recebia candidatos de outra parte do mapa, e podia ser posicionado
    // dezenas de quilômetros longe do lugar certo.
    const pts: RawRoutePoint[] = [];
    for (let x = 0; x <= 20_000; x += 10) pts.push({ ...xyToLatLng(x, 0), ele: 0 });

    const { track } = buildRouteTrack(pts);
    const index = new RouteIndex(track);

    const meio = positionAtOffset(track, 10_000);
    const bemLonge = destinationPoint(meio, 0, 60_000); // 60 km ao norte

    expect(index.candidatesNear(bemLonge)).toHaveLength(0);
  });

  it("snap concorda com a força bruta mesmo a 1 km do percurso", () => {
    const pts: RawRoutePoint[] = [];
    for (let x = 0; x <= 20_000; x += 10) pts.push({ ...xyToLatLng(x, 0), ele: 0 });

    const { track } = buildRouteTrack(pts);
    const index = new RouteIndex(track);

    for (const offsetVerdadeiro of [500, 4_000, 9_500, 15_000, 19_000]) {
      for (const desvioM of [400, 700, 1_000, 1_500]) {
        const base = positionAtOffset(track, offsetVerdadeiro);
        const fora = destinationPoint(base, 0, desvioM);

        const snap = snapToRoute(index, fora, {
          previous: null,
          recordedAtMs: T0,
        });

        // Numa reta não há ambiguidade: o ponto mais próximo é o pé da
        // perpendicular, sempre. Qualquer divergência grande é o índice
        // mentindo.
        expect(
          Math.abs(snap.offsetM - offsetVerdadeiro),
          `offset ${offsetVerdadeiro}, desvio ${desvioM} m`,
        ).toBeLessThan(100);
      }
    }
  });
});

describe("regressão: ambiguidade tem que ser declarada", () => {
  it("primeiro ping sobre geometria ambígua não se anuncia como confiável", () => {
    // Ida e volta pela mesma via, 8 m de separação — um viaduto. Sem
    // histórico, a escolha entre as duas pernas é desempate, não geometria.
    const pts: RawRoutePoint[] = [];
    for (let x = 0; x <= 3000; x += 10) pts.push({ ...xyToLatLng(x, 0), ele: 0 });
    for (let x = 3000; x >= 0; x -= 10) pts.push({ ...xyToLatLng(x, 8), ele: 20 });

    const { track } = buildRouteTrack(pts);
    const index = new RouteIndex(track);

    const ambiguo = xyToLatLng(1500, 4);

    const semHistorico = snapToRoute(index, ambiguo, {
      previous: null,
      recordedAtMs: T0,
    });

    expect(semHistorico.ambiguous).toBe(true);
    expect(semHistorico.confidence).toBe("low");
    // E continua reportando que está SOBRE o percurso, o que é verdade.
    expect(semHistorico.offRoute).toBe(false);
  });

  it("com continuidade, a mesma geometria resolve com confiança alta", () => {
    const pts: RawRoutePoint[] = [];
    for (let x = 0; x <= 3000; x += 10) pts.push({ ...xyToLatLng(x, 0), ele: 0 });
    for (let x = 3000; x >= 0; x -= 10) pts.push({ ...xyToLatLng(x, 8), ele: 20 });

    const { track } = buildRouteTrack(pts);
    const index = new RouteIndex(track);

    const snap = snapToRoute(index, xyToLatLng(1500, 1), {
      previous: { offsetM: 1460, recordedAtMs: T0 - 3000, speedMps: 12, lap: 0 },
      recordedAtMs: T0,
    });

    expect(snap.confidence).toBe("high");
    expect(snap.ambiguous).toBe(false);
    expect(Math.abs(snap.offsetM - 1500)).toBeLessThan(30);
  });
});

describe("regressão: dado velho não pode parecer fresco", () => {
  it("relógio adiantado do aparelho não neutraliza a detecção de dado velho", () => {
    // Um celular 14 min adiantado carimbava o ping com hora do futuro. O
    // `Math.max(0, …)` transformava a idade negativa em zero, e o veículo podia
    // parar de transmitir por 14 minutos aparecendo como "ao vivo".
    const nowMs = T0;
    const futuro = nowMs + 14 * 60_000;

    const gap = computeGap({
      lead: {
        offsetM: 20_000,
        atMs: nowMs,
        receivedAtMs: nowMs,
        history: [
          { offsetM: 19_000, atMs: nowMs - 60_000 },
          { offsetM: 20_000, atMs: nowMs },
        ],
      },
      sweep: {
        offsetM: 8_000,
        // O aparelho diz que é do futuro; o servidor sabe que chegou há 10 min.
        atMs: futuro,
        receivedAtMs: nowMs - 10 * 60_000,
        history: [
          { offsetM: 7_000, atMs: futuro - 100_000 },
          { offsetM: 8_000, atMs: futuro },
        ],
      },
      totalDistanceM: 55_000,
      nowMs,
    });

    expect(gap.dataAgeSeconds).toBeGreaterThan(590);
    expect(gap.stale).toBe(true);
  });

  it("sem receivedAt, carimbo no futuro é sinalizado como relógio suspeito", () => {
    const nowMs = T0;

    const gap = computeGap({
      lead: {
        offsetM: 20_000,
        atMs: nowMs + 14 * 60_000,
        history: [
          { offsetM: 19_000, atMs: nowMs },
          { offsetM: 20_000, atMs: nowMs + 14 * 60_000 },
        ],
      },
      sweep: {
        offsetM: 8_000,
        atMs: nowMs,
        history: [
          { offsetM: 7_000, atMs: nowMs - 100_000 },
          { offsetM: 8_000, atMs: nowMs },
        ],
      },
      totalDistanceM: 55_000,
      nowMs,
    });

    expect(gap.clockSuspect).toBe(true);
  });

  it("gapSeconds nunca é negativo", () => {
    // Vassoura 40 m à frente por ruído de GPS, dentro da folga de 50 m.
    const nowMs = T0;

    const gap = computeGap({
      lead: {
        offsetM: 10_000,
        atMs: nowMs,
        receivedAtMs: nowMs,
        history: [{ offsetM: 10_000, atMs: nowMs }],
      },
      sweep: {
        offsetM: 10_040,
        atMs: nowMs,
        receivedAtMs: nowMs,
        history: [
          { offsetM: 9_000, atMs: nowMs - 100_000 },
          { offsetM: 10_040, atMs: nowMs },
        ],
      },
      totalDistanceM: 55_000,
      nowMs,
    });

    expect(gap.sweepAheadOfLead).toBe(false); // dentro da folga de ruído
    expect(gap.gapSeconds === null || gap.gapSeconds >= 0).toBe(true);
  });
});

describe("regressão: GPX que perde pontos precisa avisar", () => {
  it("vírgula decimal nas coordenadas gera aviso explícito", () => {
    // Exportador com configuração regional europeia. O arquivo parece válido e
    // metade dos pontos é ilegível.
    const rows: string[] = [];
    for (let i = 0; i <= 200; i++) {
      const p = xyToLatLng(i * 20, 0);
      const usaVirgula = i % 2 === 1;
      const lat = usaVirgula
        ? p.lat.toFixed(6).replace(".", ",")
        : p.lat.toFixed(6);
      rows.push(`<trkpt lat="${lat}" lon="${p.lng.toFixed(6)}"/>`);
    }

    const parsed = parseGpx(
      `<?xml version="1.0"?><gpx version="1.1"><trk><trkseg>${rows.join("")}</trkseg></trk></gpx>`,
    );

    const aviso = parsed.warnings.join(" ");
    expect(aviso).toMatch(/não puderam ser lidos/i);
    expect(aviso).toMatch(/vírgula decimal/i);
  });

  it("bloco contíguo ilegível avisa que o percurso pode ter encurtado", () => {
    // O caso perigoso: os pontos perdidos são um desvio inteiro, então o
    // percurso não fica com buraco — fica CURTO, e todos os quilômetros da
    // prova ficam deslocados.
    const bons: RawRoutePoint[] = [];
    for (let x = 0; x <= 2000; x += 20) bons.push({ ...xyToLatLng(x, 0), ele: 100 });
    for (let y = 20; y <= 1500; y += 20) bons.push({ ...xyToLatLng(2000, y), ele: 100 });
    for (let y = 1480; y >= 0; y -= 20) bons.push({ ...xyToLatLng(2040, y), ele: 100 });
    for (let x = 2060; x <= 4000; x += 20) bons.push({ ...xyToLatLng(x, 0), ele: 100 });

    const referencia = buildRouteTrack(bons).track.totalDistanceM;

    const rows = bons.map((p, i) => {
      const quebrado = i > 100 && i < 250;
      return `<trkpt lat="${quebrado ? "N/D" : p.lat.toFixed(7)}" lon="${p.lng.toFixed(7)}"/>`;
    });

    const parsed = parseGpx(
      `<?xml version="1.0"?><gpx version="1.1"><trk><trkseg>${rows.join("")}</trkseg></trk></gpx>`,
    );
    const { track } = buildRouteTrack(parsed.segments[0]!.points);

    // O encurtamento acontece de fato…
    expect(referencia - track.totalDistanceM).toBeGreaterThan(2000);
    // …mas agora é anunciado, e o aviso manda conferir a distância.
    expect(parsed.warnings.join(" ")).toMatch(/DISTÂNCIA TOTAL/i);
  });

  it("GPX limpo não gera aviso falso", () => {
    const rows: string[] = [];
    for (let i = 0; i <= 100; i++) {
      const p = xyToLatLng(i * 20, 0);
      rows.push(`<trkpt lat="${p.lat.toFixed(7)}" lon="${p.lng.toFixed(7)}"/>`);
    }

    const parsed = parseGpx(
      `<?xml version="1.0"?><gpx version="1.1"><trk><trkseg>${rows.join("")}</trkseg></trk></gpx>`,
    );

    expect(parsed.warnings).toEqual([]);
  });
});

describe("regressão: limites e entradas hostis", () => {
  it("percurso com número absurdo de vértices é recusado na importação", () => {
    // Um ping fora do percurso custa varredura O(n). Com um lote offline cheio
    // e um GPX de 100 mil vértices isso passa do tempo limite da função
    // serverless, o app mantém o lote na fila e reenvia para sempre.
    const pts: RawRoutePoint[] = [];
    for (let i = 0; i <= 61_000; i++) {
      pts.push({ ...xyToLatLng(i * 5, 0), ele: 0 });
    }

    expect(() => buildRouteTrack(pts)).toThrow(RouteTrackError);
    expect(() => buildRouteTrack(pts)).toThrow(/limite/i);
  });

  it("percurso que cruza o antimeridiano é recusado em vez de calculado errado", () => {
    const pts: RawRoutePoint[] = [
      { lat: -17, lng: 179.8, ele: 0 },
      { lat: -17, lng: -179.8, ele: 0 },
      { lat: -17.1, lng: -179.5, ele: 0 },
    ];

    expect(() => buildRouteTrack(pts)).toThrow(/antimeridiano/i);
  });

  it("coordenada não-finita é recusada pelo snap em vez de virar NaN silencioso", () => {
    // `offRoute = NaN > 250` é false, então um NaN passava como se o veículo
    // estivesse SOBRE o percurso, e seguia para o painel do diretor.
    const pts: RawRoutePoint[] = [];
    for (let x = 0; x <= 1000; x += 10) pts.push({ ...xyToLatLng(x, 0), ele: 0 });

    const { track } = buildRouteTrack(pts);
    const index = new RouteIndex(track);

    expect(() =>
      snapToRoute(index, { lat: NaN, lng: 7.6 }, { previous: null, recordedAtMs: T0 }),
    ).toThrow(SnapInputError);

    expect(() =>
      snapToRoute(index, { lat: 44.9, lng: Infinity }, { previous: null, recordedAtMs: T0 }),
    ).toThrow(SnapInputError);
  });

  it("accuracy NaN não descarta a continuidade", () => {
    // `Math.max(12, NaN)` é NaN; todo custo virava NaN, a busca na janela
    // devolvia null e a continuidade era jogada fora em todo ping.
    const pts: RawRoutePoint[] = [];
    for (let x = 0; x <= 3000; x += 10) pts.push({ ...xyToLatLng(x, 0), ele: 0 });

    const { track } = buildRouteTrack(pts);
    const index = new RouteIndex(track);

    const snap = snapToRoute(index, xyToLatLng(1000, 3), {
      previous: { offsetM: 964, recordedAtMs: T0 - 3000, speedMps: 12, lap: 0 },
      recordedAtMs: T0,
      accuracyM: NaN,
    });

    expect(snap.method).toBe("window");
    expect(Math.abs(snap.offsetM - 1000)).toBeLessThan(30);
  });

  it("simplifyToBudget respeita o teto de verdade", () => {
    // O caminho de amostragem uniforme reservava a vaga do último ponto DEPOIS
    // de amostrar, e entregava teto+1.
    for (const [n, teto] of [
      [6000, 3000],
      [10_000, 1000],
      [4001, 2000],
      [999, 500],
    ] as const) {
      const linha = Array.from({ length: n }, (_, i) => xyToLatLng(i * 3, 0));
      const { points } = simplifyToBudget(linha, teto, 1e9);

      expect(points.length, `n=${n} teto=${teto}`).toBeLessThanOrEqual(teto);
      // Extremos preservados — encurtar o percurso seria pior que simplificar.
      expect(points[0]).toEqual(linha[0]);
      expect(points[points.length - 1]).toEqual(linha[n - 1]);
    }
  });
});

describe("regressão: normalização de código não pode fabricar nem descartar", () => {
  it("aceita dígitos de largura total, que é o que um IME produz", () => {
    expect(normalizeBindCode("Ａ１Ｂ２Ｃ３")).toBe("A1B2C3");
  });

  it("recusa homóglifos de outro alfabeto em vez de adivinhar", () => {
    // "А" cirílico (U+0410) é visualmente idêntico ao "A" latino. Converter
    // poderia acertar o código de OUTRA posição e vincular o veículo errado.
    expect(normalizeBindCode("А1B2C3")).toBeNull();
  });

  it("recusa entrada gigante sem processá-la", () => {
    expect(normalizeBindCode("A1B2C3" + "-".repeat(5000))).toBeNull();
    expect(normalizeBindCode("x".repeat(100_000))).toBeNull();
  });

  it("continua aceitando as formas legítimas", () => {
    expect(normalizeBindCode("A1B-2C3")).toBe("A1B2C3");
    expect(normalizeBindCode(" a1b 2c3 ")).toBe("A1B2C3");
    expect(normalizeBindCode("QQQQQQ")).toBe("QQQQQQ");
  });
});

describe("regressão: o percurso de referência do projeto É um circuito", () => {
  it("o fixture real é reconhecido como circuito e avisa", () => {
    // O crítico apontou que o próprio percurso usado para validar o sistema
    // (Alba → Alba) fecha em ~0 m, e que a suíte nunca percebeu porque só
    // dirigia uma volta. Este teste garante que o fato agora é explícito.
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    const { join } = require("node:path") as typeof import("node:path");

    const xml = readFileSync(
      join(process.cwd(), "tests", "fixtures", "real-route.gpx"),
      "utf8",
    );
    const parsed = parseGpx(xml);
    const { track, warnings } = buildRouteTrack(parsed.segments[0]!.points);

    expect(track.isLoop).toBe(true);
    expect(track.startFinishGapM).toBeLessThan(200);
    expect(warnings.join(" ")).toMatch(/circuito/i);

    const primeiro = track.points[0]!;
    const ultimo = track.points[track.points.length - 1]!;
    expect(
      haversineMeters(
        { lat: primeiro[1], lng: primeiro[0] },
        { lat: ultimo[1], lng: ultimo[0] },
      ),
    ).toBeLessThan(200);
  });
});
