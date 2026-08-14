import { describe, expect, it } from "vitest";

import {
  classifyGapBand,
  deltaToTarget,
  gapIsTrustworthy,
  reconstructAbsoluteOffsets,
  type LiveGapView,
} from "@/components/live/protocol";
import { computeGap, type OffsetSample } from "@/lib/route/gap";

/**
 * A janela do painel ao vivo, testada com números que já quebraram o sistema.
 *
 * O caso central é o circuito com voltas. `position_state.route_offset_m` guarda
 * a posição DENTRO da volta, porque é isso que a ingestão grava; a janela
 * abertura ↔ fechamento precisa da posição ABSOLUTA na prova. Comparar as duas
 * escalas produz um erro que não parece erro: um número limpo, com o sinal
 * trocado, que faz a tela dizer "o fechamento está à frente da abertura" — ou,
 * pior, um gap pequeno numa hora em que ele é enorme.
 */

const VOLTA_M = 10_000;
const AGORA = 1_700_000_000_000;

/**
 * Um veículo dando voltas a 10 m/s, amostrado a cada 50 s, com o offset já
 * "dobrado" dentro da volta — exatamente como o banco guarda.
 */
function historicoDentroDaVolta(
  atrasoSegundos: number,
  ateSegundos: number,
): OffsetSample[] {
  const amostras: OffsetSample[] = [];

  for (let t = 0; t <= ateSegundos; t += 50) {
    const absoluto = Math.max(0, 10 * (t - atrasoSegundos));
    amostras.push({
      offsetM: absoluto % VOLTA_M,
      atMs: AGORA - (ateSegundos - t) * 1000,
    });
  }

  return amostras;
}

describe("reconstructAbsoluteOffsets", () => {
  it("é identidade em prova ponto-a-ponto", () => {
    const historico: OffsetSample[] = [
      { offsetM: 0, atMs: 1 },
      { offsetM: 5_000, atMs: 2 },
      { offsetM: 9_000, atMs: 3 },
    ];

    const r = reconstructAbsoluteOffsets(historico, VOLTA_M, {
      isLoop: false,
      laps: 1,
    });

    expect(r.lap).toBe(0);
    expect(r.wraps).toBe(0);
    expect(r.samples).toBe(historico);
  });

  it("é identidade em circuito de volta única", () => {
    const r = reconstructAbsoluteOffsets(
      [
        { offsetM: 9_500, atMs: 1 },
        { offsetM: 200, atMs: 2 },
      ],
      VOLTA_M,
      { isLoop: true, laps: 1 },
    );

    expect(r.lap).toBe(0);
    expect(r.samples[1]?.offsetM).toBe(200);
  });

  it("conta a passagem pela linha de largada num circuito", () => {
    const historico = historicoDentroDaVolta(0, 2_200);

    const r = reconstructAbsoluteOffsets(historico, VOLTA_M, {
      isLoop: true,
      laps: 3,
    });

    expect(r.wraps).toBe(2);
    expect(r.lap).toBe(2);
    // 2200 s a 10 m/s = 22 km de prova, não 2 km da terceira volta.
    expect(r.samples[r.samples.length - 1]?.offsetM).toBeCloseTo(22_000, 6);
  });

  it("não inventa uma volta a mais do que a prova tem", () => {
    const r = reconstructAbsoluteOffsets(
      // Cinco cruzamentos de linha numa prova declarada de 2 voltas.
      Array.from({ length: 60 }, (_, i) => ({
        offsetM: (i * 1_000) % VOLTA_M,
        atMs: i,
      })),
      VOLTA_M,
      { isLoop: true, laps: 2 },
    );

    expect(r.lap).toBe(1);
  });

  it("ignora recuo pequeno — ruído de GPS não é uma volta", () => {
    const r = reconstructAbsoluteOffsets(
      [
        { offsetM: 5_000, atMs: 1 },
        { offsetM: 4_920, atMs: 2 },
        { offsetM: 5_050, atMs: 3 },
      ],
      VOLTA_M,
      { isLoop: true, laps: 3 },
    );

    expect(r.wraps).toBe(0);
    expect(r.samples.map((s) => s.offsetM)).toEqual([5_000, 4_920, 5_050]);
  });
});

describe("janela num circuito de 3 voltas", () => {
  // Abertura na terceira volta (km 2 da volta, 22 km de prova); fechamento na
  // segunda (km 8 da volta, 18 km de prova). Separação real: 4 km e 400 s.
  const leadDentroDaVolta = historicoDentroDaVolta(0, 2_200);
  const sweepDentroDaVolta = historicoDentroDaVolta(400, 2_200);

  it("MENTE quando o cálculo usa o offset dentro da volta", () => {
    const ultimoLead = leadDentroDaVolta[leadDentroDaVolta.length - 1]!;
    const ultimoSweep = sweepDentroDaVolta[sweepDentroDaVolta.length - 1]!;

    // Confere o cenário: 2 km contra 8 km, dentro da volta.
    expect(ultimoLead.offsetM).toBeCloseTo(2_000, 6);
    expect(ultimoSweep.offsetM).toBeCloseTo(8_000, 6);

    const errado = computeGap({
      lead: {
        offsetM: ultimoLead.offsetM,
        atMs: AGORA,
        receivedAtMs: AGORA,
        history: leadDentroDaVolta,
      },
      sweep: {
        offsetM: ultimoSweep.offsetM,
        atMs: AGORA,
        receivedAtMs: AGORA,
        history: sweepDentroDaVolta,
      },
      totalDistanceM: VOLTA_M * 3,
      nowMs: AGORA,
    });

    // O erro não é "número um pouco fora": é uma afirmação operacional falsa.
    expect(errado.sweepAheadOfLead).toBe(true);
    expect(errado.gapM).toBeCloseTo(-6_000, 6);
    expect(errado.gapSeconds).toBeNull();
  });

  it("acerta quando o cálculo usa a posição absoluta na prova", () => {
    const lead = reconstructAbsoluteOffsets(leadDentroDaVolta, VOLTA_M, {
      isLoop: true,
      laps: 3,
    });
    const sweep = reconstructAbsoluteOffsets(sweepDentroDaVolta, VOLTA_M, {
      isLoop: true,
      laps: 3,
    });

    const certo = computeGap({
      lead: {
        offsetM: lead.samples[lead.samples.length - 1]!.offsetM,
        atMs: AGORA,
        receivedAtMs: AGORA,
        history: lead.samples,
      },
      sweep: {
        offsetM: sweep.samples[sweep.samples.length - 1]!.offsetM,
        atMs: AGORA,
        receivedAtMs: AGORA,
        history: sweep.samples,
      },
      totalDistanceM: VOLTA_M * 3,
      nowMs: AGORA,
    });

    expect(certo.sweepAheadOfLead).toBe(false);
    expect(certo.method).toBe("measured");
    expect(certo.gapM).toBeCloseTo(4_000, 6);
    expect(certo.gapSeconds).toBeCloseTo(400, 0);
    expect(lead.lap).toBe(2);
    expect(sweep.lap).toBe(1);
  });
});

describe("classificação contra a janela alvo", () => {
  const limites = { targetSeconds: 1_800, minSeconds: 1_200, maxSeconds: 2_400 };

  it("acusa quando esticou demais", () => {
    expect(classifyGapBand(2_401, limites)).toBe("over");
  });

  it("acusa quando comprimiu demais", () => {
    expect(classifyGapBand(1_199, limites)).toBe("under");
  });

  it("aceita o que está entre os limites", () => {
    expect(classifyGapBand(1_800, limites)).toBe("within");
    expect(classifyGapBand(1_200, limites)).toBe("within");
    expect(classifyGapBand(2_400, limites)).toBe("within");
  });

  it("não inventa tolerância quando a prova não declarou limites", () => {
    const semLimites = { targetSeconds: 1_800, minSeconds: null, maxSeconds: null };
    expect(classifyGapBand(6_000, semLimites)).toBe("no_limits");
    expect(classifyGapBand(10, semLimites)).toBe("no_limits");
  });

  it("aplica um limite só quando só um foi declarado", () => {
    const soMax = { targetSeconds: 1_800, minSeconds: null, maxSeconds: 2_400 };
    expect(classifyGapBand(3_000, soMax)).toBe("over");
    expect(classifyGapBand(60, soMax)).toBe("within");
  });

  it("sem número não há banda", () => {
    expect(classifyGapBand(null, limites)).toBe("unknown");
    expect(classifyGapBand(Number.NaN, limites)).toBe("unknown");
  });

  it("mede a diferença para o alvo com sinal", () => {
    expect(deltaToTarget(2_100, 1_800)).toBe(300);
    expect(deltaToTarget(1_500, 1_800)).toBe(-300);
    expect(deltaToTarget(null, 1_800)).toBeNull();
  });
});

describe("gapIsTrustworthy", () => {
  const base: LiveGapView = {
    gapM: 4_000,
    gapSeconds: 400,
    method: "measured",
    explanation: "",
    leadOffsetM: 22_000,
    sweepOffsetM: 18_000,
    sweepSpeedMps: 10,
    dataAgeSeconds: 3,
    stale: false,
    clockSuspect: false,
    sweepAheadOfLead: false,
    computedAt: new Date(AGORA).toISOString(),
    lead: null,
    sweep: null,
    targetSeconds: 1_800,
    minSeconds: null,
    maxSeconds: null,
    band: "no_limits",
    deltaToTargetSeconds: -1_400,
    historyComplete: true,
    lapsInferred: false,
  };

  it("confia num medido fresco", () => {
    expect(gapIsTrustworthy(base)).toBe(true);
  });

  it("não confia em dado velho, mesmo com número na mão", () => {
    expect(gapIsTrustworthy({ ...base, stale: true })).toBe(false);
  });

  it("não confia quando um relógio de aparelho está fora de hora", () => {
    expect(gapIsTrustworthy({ ...base, clockSuspect: true })).toBe(false);
  });

  it("não confia quando o fechamento aparece à frente da abertura", () => {
    expect(gapIsTrustworthy({ ...base, sweepAheadOfLead: true })).toBe(false);
  });

  it("não confia sem número nenhum", () => {
    expect(gapIsTrustworthy({ ...base, gapSeconds: null })).toBe(false);
  });
});
