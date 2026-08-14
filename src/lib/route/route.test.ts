import { describe, expect, it } from "vitest";

import { haversineMeters } from "@/lib/geo/distance";
import { buildRouteTrack, positionAtOffset, RouteIndex } from "@/lib/route/track";
import { snapToRoute, straightLineMeters } from "@/lib/route/snap";
import { computeGap, rollingSpeedMps, timeAtOffset } from "@/lib/route/gap";
import {
  buildHairpinTrack,
  buildStraightTrack,
  xyToLatLng,
} from "../../../tests/fixtures/routes";

describe("buildRouteTrack", () => {
  it("acumula a distância corretamente numa reta conhecida", () => {
    const { track } = buildStraightTrack(1000, 10);

    expect(track.totalDistanceM).toBeGreaterThan(995);
    expect(track.totalDistanceM).toBeLessThan(1005);
    expect(track.points[0]![2]).toBe(0);
    expect(track.points[track.points.length - 1]![2]).toBeCloseTo(
      track.totalDistanceM,
      6,
    );
  });

  it("mede o percurso do grampo pelo traçado, não pelos extremos", () => {
    const { track, marks } = buildHairpinTrack(10);

    // 4 km + arco + 4 km + 2 km
    expect(track.totalDistanceM).toBeGreaterThan(marks.finish * 0.99);
    expect(track.totalDistanceM).toBeLessThan(marks.finish * 1.01);

    const first = track.points[0]!;
    const last = track.points[track.points.length - 1]!;
    const asTheCrowFlies = haversineMeters(
      { lat: first[1], lng: first[0] },
      { lat: last[1], lng: last[0] },
    );

    // A prova tem ~10 km mas começa e termina a ~2 km de distância.
    expect(asTheCrowFlies).toBeLessThan(2200);
    expect(track.totalDistanceM / asTheCrowFlies).toBeGreaterThan(4);
  });

  it("rejeita percurso com menos de dois pontos válidos", () => {
    expect(() => buildRouteTrack([{ lat: 44.9, lng: 7.6 }])).toThrow();
  });

  it("descarta coordenadas inválidas e avisa", () => {
    const { track, warnings } = buildRouteTrack([
      { lat: 44.9, lng: 7.6 },
      { lat: 999, lng: 7.6 },
      { lat: 44.91, lng: 7.6 },
    ]);

    expect(track.points).toHaveLength(2);
    expect(warnings.join(" ")).toMatch(/inválida/);
  });

  it("positionAtOffset percorre a rota e volta ao ponto certo", () => {
    const { track } = buildHairpinTrack(10);

    const start = positionAtOffset(track, 0);
    expect(start.lat).toBeCloseTo(track.points[0]![1], 6);

    // No meio da perna 1 (x = 2000, y = 0).
    // Tolerância apertada de propósito: o referencial plano e o haversine
    // precisam concordar sub-métrico depois de 2 km, senão há inconsistência
    // de constantes entre as duas famílias de função.
    const mid = positionAtOffset(track, 2000);
    const expected = xyToLatLng(2000, 0);
    expect(haversineMeters(mid, expected)).toBeLessThan(1);

    // Offset além do fim é preso no fim, não extrapolado.
    const beyond = positionAtOffset(track, track.totalDistanceM + 50_000);
    const last = track.points[track.points.length - 1]!;
    expect(haversineMeters(beyond, { lat: last[1], lng: last[0] })).toBeLessThan(1);
  });
});

describe("snapToRoute — continuidade no grampo", () => {
  const { track } = buildHairpinTrack(10);
  const index = new RouteIndex(track);
  const t0 = Date.UTC(2026, 7, 14, 9, 0, 0);

  // Ponto ambíguo: 80 m separam as duas pernas. Sem contexto, é impossível
  // saber em qual delas o veículo está.
  const ambiguousLeg1 = xyToLatLng(1000, 5);
  const ambiguousLeg2 = xyToLatLng(1000, 75);

  it("escolhe a perna de ida quando o veículo vinha da ida", () => {
    const result = snapToRoute(index, ambiguousLeg1, {
      previous: { offsetM: 950, recordedAtMs: t0 - 10_000 },
      recordedAtMs: t0,
    });

    expect(result.offsetM).toBeGreaterThan(900);
    expect(result.offsetM).toBeLessThan(1100);
    expect(result.method).toBe("window");
    expect(result.confidence).toBe("high");
  });

  it("escolhe a perna de volta quando o veículo já passou o grampo", () => {
    // Offset esperado na volta: 4000 + arco (~126) + (4000 - 1000) ≈ 7126
    const result = snapToRoute(index, ambiguousLeg2, {
      previous: { offsetM: 7050, recordedAtMs: t0 - 10_000 },
      recordedAtMs: t0,
    });

    expect(result.offsetM).toBeGreaterThan(7000);
    expect(result.offsetM).toBeLessThan(7250);
    expect(result.method).toBe("window");
  });

  it("NÃO deixa o veículo saltar para a outra perna por proximidade geométrica", () => {
    // O ponto está exatamente sobre a perna 2, mas o veículo estava na perna 1
    // há 10 s. Fisicamente ele não pode ter percorrido 6 km nesse tempo, então
    // o snap tem que ficar na perna 1 — a alternativa seria o offset saltar de
    // 950 m para 7 km e destruir o cálculo de gap.
    const result = snapToRoute(index, ambiguousLeg2, {
      previous: { offsetM: 950, recordedAtMs: t0 - 10_000 },
      recordedAtMs: t0,
    });

    expect(result.offsetM).toBeLessThan(2000);
  });

  it("sem histórico, usa busca global e admite confiança menor", () => {
    const result = snapToRoute(index, ambiguousLeg1, {
      previous: null,
      recordedAtMs: t0,
    });

    expect(result.method).toBe("global");
    expect(result.confidence).not.toBe("high");
    expect(result.snapDistanceM).toBeLessThan(20);
  });

  it("marca fora de percurso quando o veículo desvia de verdade", () => {
    const offRoute = xyToLatLng(2000, 900); // 900 m ao norte da perna 1

    const result = snapToRoute(index, offRoute, {
      previous: { offsetM: 2000, recordedAtMs: t0 - 10_000 },
      recordedAtMs: t0,
    });

    expect(result.offRoute).toBe(true);
    expect(result.snapDistanceM).toBeGreaterThan(500);
  });
});

describe("snapToRoute — recuperação depois de perder sinal", () => {
  const { track } = buildHairpinTrack(10);
  const index = new RouteIndex(track);
  const t0 = Date.UTC(2026, 7, 14, 9, 0, 0);

  it("aceita o avanço real depois de 2 minutos sem sinal", () => {
    // Vassoura a 60 km/h fica 2 min offline: percorre 2 km. Quando o sinal
    // volta, o primeiro ping vem de 2 km à frente. A janela precisa ser larga
    // o bastante para isso ser considerado plausível.
    const before = { offsetM: 1000, recordedAtMs: t0 };
    const after = xyToLatLng(3000, 0);

    const result = snapToRoute(index, after, {
      previous: before,
      recordedAtMs: t0 + 120_000,
    });

    expect(result.offsetM).toBeGreaterThan(2900);
    expect(result.offsetM).toBeLessThan(3100);
    expect(result.method).toBe("window");
  });

  it("recupera a posição mesmo se o veículo sumir tempo demais para a janela", () => {
    // 40 minutos sem nenhum ping: a janela deixa de ter sentido e a busca
    // global assume. O veículo tem que reaparecer no lugar certo, não sumir.
    const result = snapToRoute(index, xyToLatLng(0, 1500), {
      previous: { offsetM: 500, recordedAtMs: t0 },
      recordedAtMs: t0 + 40 * 60_000,
    });

    expect(result.method).toBe("global");
    expect(result.snapDistanceM).toBeLessThan(20);
    expect(result.offsetM).toBeGreaterThan(9000);
  });

  it("ignora janela quando o relógio do aparelho está adiantado", () => {
    // Ping "do passado" em relação ao anterior — celular com relógio errado.
    // Não pode travar nem produzir janela negativa.
    const result = snapToRoute(index, xyToLatLng(1000, 5), {
      previous: { offsetM: 950, recordedAtMs: t0 + 60_000 },
      recordedAtMs: t0,
    });

    expect(Number.isFinite(result.offsetM)).toBe(true);
    expect(result.method).toBe("global");
  });
});

describe("distância pela estrada versus linha reta", () => {
  const { track } = buildHairpinTrack(10);
  const index = new RouteIndex(track);
  const t0 = Date.UTC(2026, 7, 14, 9, 0, 0);

  it("dois veículos a 80 m em linha reta estão a mais de 8 km pela prova", () => {
    const onLeg1 = xyToLatLng(100, 0);
    const onLeg2 = xyToLatLng(100, 80);

    const snapLeg1 = snapToRoute(index, onLeg1, {
      previous: { offsetM: 90, recordedAtMs: t0 - 10_000 },
      recordedAtMs: t0,
    });

    const snapLeg2 = snapToRoute(index, onLeg2, {
      previous: { offsetM: 8000, recordedAtMs: t0 - 10_000 },
      recordedAtMs: t0,
    });

    const straight = straightLineMeters(onLeg1, onLeg2);
    const alongRoute = Math.abs(snapLeg2.offsetM - snapLeg1.offsetM);

    // Valor teórico: (4000 − 100) na ida + π·40 do grampo + 3900 na volta
    // ≈ 7925 m. Conferido à mão a partir da geometria do fixture.
    expect(straight).toBeLessThan(100);
    expect(alongRoute).toBeGreaterThan(7900);
    expect(alongRoute).toBeLessThan(7960);

    // Esta é a asserção que importa: as duas medidas divergem por duas ordens
    // de grandeza. Um sistema que usasse linha reta reportaria "80 m" e o
    // diretor liberaria a estrada com o pelotão inteiro ainda dentro dela.
    expect(alongRoute / straight).toBeGreaterThan(80);
  });
});

describe("computeGap", () => {
  const t0 = Date.UTC(2026, 7, 14, 9, 0, 0);
  const totalDistanceM = 10_000;

  /** Histórico de um veículo a velocidade constante. */
  function constantSpeedHistory(
    startOffsetM: number,
    speedMps: number,
    fromMs: number,
    toMs: number,
    stepMs = 5_000,
  ) {
    const out = [];
    for (let t = fromMs; t <= toMs; t += stepMs) {
      out.push({
        offsetM: startOffsetM + (speedMps * (t - fromMs)) / 1000,
        atMs: t,
      });
    }
    return out;
  }

  it("usa o método medido quando há histórico do carro de abertura", () => {
    // Abertura saiu às 9h a 10 m/s. Vassoura saiu 20 min depois, mesma
    // velocidade. O gap real é 20 min, independente de qualquer projeção.
    const now = t0 + 60 * 60_000;

    const leadHistory = constantSpeedHistory(0, 10, t0, now);
    const sweepHistory = constantSpeedHistory(0, 10, t0 + 20 * 60_000, now);

    const lead = leadHistory[leadHistory.length - 1]!;
    const sweep = sweepHistory[sweepHistory.length - 1]!;

    const gap = computeGap({
      lead: { offsetM: lead.offsetM, atMs: lead.atMs, history: leadHistory },
      sweep: { offsetM: sweep.offsetM, atMs: sweep.atMs, history: sweepHistory },
      totalDistanceM,
      nowMs: now,
    });

    expect(gap.method).toBe("measured");
    expect(gap.gapSeconds).toBeGreaterThan(20 * 60 - 15);
    expect(gap.gapSeconds).toBeLessThan(20 * 60 + 15);
    expect(gap.gapM).toBeCloseTo(12_000, -2);
  });

  it("cai para projeção quando o histórico do abertura não cobre o ponto", () => {
    const now = t0 + 10 * 60_000;

    // Histórico do abertura só a partir do km 5 — o vassoura está no km 1,
    // então não há registro de quando o abertura passou por lá.
    const leadHistory = constantSpeedHistory(5_000, 10, now - 60_000, now);
    const sweepHistory = constantSpeedHistory(600, 8, now - 120_000, now);

    const gap = computeGap({
      lead: {
        offsetM: leadHistory[leadHistory.length - 1]!.offsetM,
        atMs: now,
        history: leadHistory,
      },
      sweep: {
        offsetM: sweepHistory[sweepHistory.length - 1]!.offsetM,
        atMs: now,
        history: sweepHistory,
      },
      totalDistanceM,
      nowMs: now,
    });

    expect(gap.method).toBe("projected");
    expect(gap.gapSeconds).toBeGreaterThan(0);
    expect(gap.sweepSpeedMps).toBeCloseTo(8, 1);
  });

  it("não inventa tempo quando o vassoura está parado", () => {
    const now = t0 + 10 * 60_000;
    const sweepHistory = [
      { offsetM: 1000, atMs: now - 180_000 },
      { offsetM: 1000, atMs: now },
    ];

    const gap = computeGap({
      lead: { offsetM: 6000, atMs: now, history: [{ offsetM: 6000, atMs: now }] },
      sweep: { offsetM: 1000, atMs: now, history: sweepHistory },
      totalDistanceM,
      nowMs: now,
    });

    expect(gap.gapSeconds).toBeNull();
    expect(gap.method).toBe("insufficient_data");
    expect(gap.gapM).toBe(5000);
    expect(gap.explanation).toMatch(/parado/i);
  });

  it("detecta vassoura à frente do abertura", () => {
    const now = t0;
    const gap = computeGap({
      lead: { offsetM: 1000, atMs: now, history: [{ offsetM: 1000, atMs: now }] },
      sweep: { offsetM: 4000, atMs: now, history: [{ offsetM: 4000, atMs: now }] },
      totalDistanceM,
      nowMs: now,
    });

    expect(gap.sweepAheadOfLead).toBe(true);
    expect(gap.gapSeconds).toBeNull();
    expect(gap.explanation).toMatch(/à frente/i);
  });

  it("marca dado velho como stale sem deixar de responder", () => {
    const now = t0 + 10 * 60_000;
    const leadHistory = constantSpeedHistory(0, 10, t0, now - 300_000);
    const sweepHistory = constantSpeedHistory(0, 10, t0 + 60_000, now - 300_000);

    const gap = computeGap({
      lead: {
        offsetM: leadHistory[leadHistory.length - 1]!.offsetM,
        atMs: now - 300_000,
        history: leadHistory,
      },
      sweep: {
        offsetM: sweepHistory[sweepHistory.length - 1]!.offsetM,
        atMs: now - 300_000,
        history: sweepHistory,
      },
      totalDistanceM,
      nowMs: now,
    });

    expect(gap.stale).toBe(true);
    expect(gap.dataAgeSeconds).toBeGreaterThan(290);
    expect(gap.gapSeconds).not.toBeNull();
  });

  it("explica o que falta quando um dos veículos não está vinculado", () => {
    const gap = computeGap({
      lead: { offsetM: 100, atMs: t0, history: [] },
      sweep: null,
      totalDistanceM,
      nowMs: t0,
    });

    expect(gap.method).toBe("insufficient_data");
    expect(gap.explanation).toMatch(/fechamento/i);
  });
});

describe("rollingSpeedMps e timeAtOffset", () => {
  const t0 = Date.UTC(2026, 7, 14, 9, 0, 0);

  it("calcula velocidade média na janela, não a instantânea", () => {
    // Veículo a 10 m/s que deu uma parada de 30 s no meio.
    const history = [
      { offsetM: 0, atMs: t0 },
      { offsetM: 600, atMs: t0 + 60_000 },
      { offsetM: 600, atMs: t0 + 90_000 },
      { offsetM: 1200, atMs: t0 + 150_000 },
    ];

    const speed = rollingSpeedMps(history, t0 + 150_000, 180_000);
    expect(speed).toBeCloseTo(1200 / 150, 1);
  });

  it("nunca devolve velocidade negativa", () => {
    const history = [
      { offsetM: 1000, atMs: t0 },
      { offsetM: 800, atMs: t0 + 60_000 },
    ];
    expect(rollingSpeedMps(history, t0 + 60_000)).toBe(0);
  });

  it("interpola o instante de passagem por um offset", () => {
    const history = [
      { offsetM: 0, atMs: t0 },
      { offsetM: 1000, atMs: t0 + 100_000 },
    ];

    expect(timeAtOffset(history, 500)).toBe(t0 + 50_000);
    expect(timeAtOffset(history, 1500)).toBeNull();
    expect(timeAtOffset(history, -10)).toBeNull();
  });
});
