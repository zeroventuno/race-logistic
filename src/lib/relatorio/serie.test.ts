import { describe, expect, it } from "vitest";

import { reconstruirSerie, type AmostraDePing } from "./serie";

/**
 * O comboio sintético: abertura e fechamento a 10 m/s, separados por 30 min.
 *
 * A 10 m/s, 30 minutos de separação são 18 km de estrada — um número redondo
 * de propósito, para que qualquer erro de meia volta ou de unidade apareça na
 * cara em vez de se esconder atrás de uma casa decimal.
 */
const S = 1000;
const VEL = 10;
const ATRASO_S = 1800;

function pingsDe(deS: number, ateS: number, offsetEmS: (s: number) => number) {
  const out: AmostraDePing[] = [];
  for (let s = deS; s <= ateS; s += 30) {
    out.push({
      atMs: s * S,
      receivedAtMs: s * S,
      offsetAbsolutoM: offsetEmS(s),
    });
  }
  return out;
}

const lead = pingsDe(0, 3600, (s) => VEL * s);
const sweep = pingsDe(ATRASO_S, 3600, (s) => VEL * (s - ATRASO_S));

describe("reconstruirSerie", () => {
  it("mede a janela pelo cruzamento do mesmo ponto, e não pela velocidade", () => {
    const r = reconstruirSerie({
      lead,
      sweep,
      raceDistanceM: 100_000,
      deMs: ATRASO_S * S,
      ateMs: 3600 * S,
    });

    expect(r.porProcedencia.measured).toBe(r.pontos.length);
    expect(r.porProcedencia.projected).toBe(0);

    // 30 minutos, com folga de um passo para a interpolação do histórico.
    expect(r.gapSegundosMedio).toBeGreaterThan(ATRASO_S - 30);
    expect(r.gapSegundosMedio).toBeLessThan(ATRASO_S + 30);
    expect(r.coberturaMedida).toBe(1);
  });

  /**
   * A REGRESSÃO QUE IMPORTA. Se alguém truncar o histórico do abertura a uma
   * janela recente — como o painel ao vivo faz —, o `timeAtOffset` deixa de
   * achar o cruzamento e a série inteira cai para `projected`. O relatório
   * continuaria saindo, com números parecidos, e deixaria de ser um documento
   * que afere para virar um que estima. Sem este teste, ninguém perceberia.
   */
  it("continua medindo quando o cruzamento é muito anterior ao instante", () => {
    const r = reconstruirSerie({
      lead,
      sweep,
      raceDistanceM: 100_000,
      deMs: 3600 * S,
      ateMs: 3600 * S,
    });

    const p = r.pontos[0]!;
    expect(p.procedencia).toBe("measured");
    // O abertura passou por aqui 30 min antes — muito além de qualquer janela
    // de histórico recente.
    expect(p.gapSeconds).toBeGreaterThan(ATRASO_S - 30);
  });

  it("declara ausência antes de o fechamento ter transmitido", () => {
    const r = reconstruirSerie({
      lead,
      sweep,
      raceDistanceM: 100_000,
      deMs: 0,
      ateMs: (ATRASO_S - 60) * S,
    });

    expect(r.porProcedencia.insufficient_data).toBe(r.pontos.length);
    expect(r.gapSegundosMedio).toBeNull();
    expect(r.coberturaMedida).toBe(0);
  });

  it("não deixa ponto estimado entrar na estatística", () => {
    // Fechamento sem histórico suficiente para cruzamento: um ping só, num
    // offset que o abertura ainda não alcançou.
    const r = reconstruirSerie({
      lead: pingsDe(0, 600, (s) => VEL * s),
      sweep: [
        { atMs: 600 * S, receivedAtMs: 600 * S, offsetAbsolutoM: 99_000 },
      ],
      raceDistanceM: 100_000,
      deMs: 600 * S,
      ateMs: 600 * S,
    });

    expect(r.porProcedencia.measured).toBe(0);
    expect(r.gapSegundosMin).toBeNull();
    expect(r.gapSegundosMax).toBeNull();
    expect(r.gapSegundosMedio).toBeNull();
  });

  it("sinaliza o fechamento à frente do abertura", () => {
    const r = reconstruirSerie({
      lead: pingsDe(0, 600, (s) => VEL * s),
      sweep: pingsDe(0, 600, (s) => VEL * s + 5000),
      raceDistanceM: 100_000,
      deMs: 600 * S,
      ateMs: 600 * S,
    });

    expect(r.pontos[0]!.sweepAheadOfLead).toBe(true);
    expect(r.pontos[0]!.procedencia).toBe("insufficient_data");
  });

  it("respeita o passo pedido", () => {
    const r = reconstruirSerie({
      lead,
      sweep,
      raceDistanceM: 100_000,
      deMs: ATRASO_S * S,
      ateMs: (ATRASO_S + 600) * S,
      passoMs: 60_000,
    });

    expect(r.pontos).toHaveLength(11);
    expect(r.pontos[1]!.atMs - r.pontos[0]!.atMs).toBe(60_000);
  });
});
