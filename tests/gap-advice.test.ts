import { describe, expect, it } from "vitest";

import { gapAdvice, gapToleranceSeconds } from "@/components/live/protocol";

/**
 * A janela abertura ↔ fechamento é o tempo que CADA PONTO do percurso fica
 * interditado — a interdição é uma bolha que viaja: a abertura fecha os
 * cruzamentos, o fechamento os reabre atrás de si.
 *
 * O desvio em relação ao combinado tem consequências de NATUREZA diferente
 * para cada lado, e é isso que estes testes travam:
 *
 *   adiantado (janela curta)  → a via reabre cedo demais → prejudica A PROVA
 *   atrasado  (janela longa)  → interdição além do autorizado → quebra CONTRATO
 */

const ALVO = 40 * 60; // 40 min

describe("veredito da janela", () => {
  it("dentro da tolerância não pede correção", () => {
    const r = gapAdvice(ALVO, ALVO, true);
    expect(r.drift).toBe("on_target");
    expect(r.action).toBe("hold");
    expect(r.cost).toBe("none");
  });

  it("janela curta = adiantado: retardar o fechamento, custo é a prova", () => {
    // 28 min de janela contra 40 combinados → adiantado 12 min.
    const r = gapAdvice(28 * 60, ALVO, true);

    expect(r.drift).toBe("ahead");
    expect(r.driftSeconds).toBe(12 * 60);
    expect(r.action).toBe("slow_down");
    expect(r.cost).toBe("race");
  });

  it("janela longa = atrasado: acelerar o fechamento, custo é o contrato", () => {
    const r = gapAdvice(52 * 60, ALVO, true);

    expect(r.drift).toBe("behind");
    expect(r.driftSeconds).toBe(12 * 60);
    expect(r.action).toBe("speed_up");
    expect(r.cost).toBe("authorization");
  });

  it("não reclama de oscilação pequena", () => {
    // A zona morta existe para o aviso não virar ruído: um indicador que pede
    // correção a cada minuto é um indicador que o diretor aprende a ignorar —
    // e aí ele não obedece quando importa.
    const tolerancia = gapToleranceSeconds(ALVO);
    expect(tolerancia).toBe(4 * 60); // 10% de 40 min

    expect(gapAdvice(ALVO - tolerancia + 1, ALVO, true).drift).toBe("on_target");
    expect(gapAdvice(ALVO + tolerancia - 1, ALVO, true).drift).toBe("on_target");
    expect(gapAdvice(ALVO - tolerancia - 1, ALVO, true).drift).toBe("ahead");
    expect(gapAdvice(ALVO + tolerancia + 1, ALVO, true).drift).toBe("behind");
  });

  it("janela curta tem piso de tolerância de 2 minutos", () => {
    // Numa prova de janela curta, 10% seriam segundos — e o painel viraria um
    // alarme contínuo.
    expect(gapToleranceSeconds(10 * 60)).toBe(120);
    expect(gapAdvice(9 * 60, 10 * 60, true).drift).toBe("on_target");
    expect(gapAdvice(7 * 60, 10 * 60, true).drift).toBe("ahead");
  });

  it("dado não confiável NÃO produz veredito", () => {
    // Mandar retardar o fechamento com base em posição velha é pior que não
    // dizer nada: o diretor age sobre uma leitura que já não existe.
    const r = gapAdvice(20 * 60, ALVO, false);
    expect(r.drift).toBe("unknown");
    expect(r.action).toBe("hold");
  });

  it("sem número não produz veredito", () => {
    expect(gapAdvice(null, ALVO, true).drift).toBe("unknown");
    expect(gapAdvice(NaN, ALVO, true).drift).toBe("unknown");
    expect(gapAdvice(Infinity, ALVO, true).drift).toBe("unknown");
  });
});
