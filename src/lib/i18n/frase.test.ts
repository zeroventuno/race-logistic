import { describe, expect, it } from "vitest";

import { fraseOuTexto, lerClausulas, montarFrase } from "@/lib/i18n/frase";
import { createTranslator } from "@/lib/i18n/translate";

/**
 * A frase desmontada.
 *
 * O que se protege aqui é o motivo de ela existir: a justificativa de um
 * acionamento é ESCRITA uma vez e LIDA por gente que pode estar em outro
 * idioma. Se a montagem na leitura falhar, o diretor fica sem a explicação de
 * uma decisão automática no meio de uma prova — então a função nunca pode
 * lançar, e sempre precisa devolver a melhor coisa que conseguir.
 */

const pt = createTranslator("pt-BR");
const en = createTranslator("en");

/** O formatador do leitor. Simplificado: só o que a cláusula usa. */
const fmtPt = { distance: (m: number | null) => `${((m ?? 0) / 1000).toFixed(1).replace(".", ",")} km` };
const fmtEn = { distance: (m: number | null) => `${((m ?? 0) / 1000).toFixed(1)} km` };

describe("montarFrase", () => {
  it("monta a mesma decisão em duas línguas", () => {
    const clausulas = [
      { k: "alerts.why.behind" as const, v: { distance: { metros: 2400 } } },
    ];

    expect(montarFrase(clausulas, pt, fmtPt)).toContain("2,4 km");
    expect(montarFrase(clausulas, pt, fmtPt)).toContain("atrás do alerta");

    expect(montarFrase(clausulas, en, fmtEn)).toContain("2.4 km");
    expect(montarFrase(clausulas, en, fmtEn)).toContain("behind the alert");
  });

  // O separador decimal é do leitor, e não de quem gravou. Era exatamente o
  // defeito anotado no código antigo: a frase saía com ponto enquanto a janela
  // ao lado saía com vírgula, na mesma tela.
  it("deixa o número no formato de quem lê", () => {
    const c = [{ k: "alerts.why.ahead" as const, v: { distance: { metros: 1500 } } }];
    expect(montarFrase(c, pt, fmtPt)).toContain("1,5");
    expect(montarFrase(c, en, fmtEn)).toContain("1.5");
  });

  // Sem isto, "Ambulância" ficaria congelada em português dentro de uma frase
  // italiana — que é o pior dos dois mundos, porque parece bug de tradução.
  it("traduz também o que está dentro da variável", () => {
    const c = [
      {
        k: "alerts.why.escalated" as const,
        v: { role: { chave: "roles.sweep_car.short" as const } },
      },
    ];

    expect(montarFrase(c, pt, fmtPt)).toContain("Fechamento");
    expect(montarFrase(c, en, fmtEn)).toContain("Closing");
  });

  it("junta as cláusulas com o separador pedido", () => {
    const c = [
      { k: "alerts.why.noneSuggested" as const },
      { k: "alerts.why.ignoredBusy" as const, v: { count: 2 } },
    ];
    expect(montarFrase(c, pt, fmtPt, " ")).toBe(
      "Nenhum apoio sugerido. 2 já acionado(s) para outro alerta.",
    );
  });
});

describe("lerClausulas", () => {
  it("aceita o que veio bem formado do banco", () => {
    expect(lerClausulas([{ k: "alerts.why.allStraight" }])).toEqual([
      { k: "alerts.why.allStraight", v: undefined },
    ]);
  });

  // Tudo que não for uma lista de cláusulas vira `null`, e `null` faz a leitura
  // cair no texto congelado. Uma coluna editada à mão não pode derrubar o
  // painel no meio de uma prova.
  it.each([
    ["nulo", null],
    ["texto solto", "Nenhum apoio sugerido."],
    ["lista vazia", []],
    ["item sem chave", [{ v: { count: 1 } }]],
    ["chave que não é texto", [{ k: 42 }]],
    ["variável que não é objeto", [{ k: "alerts.why.allStraight", v: 7 }]],
  ])("recusa %s", (_nome, bruto) => {
    expect(lerClausulas(bruto)).toBeNull();
  });
});

describe("fraseOuTexto", () => {
  it("prefere a versão estruturada", () => {
    const saida = fraseOuTexto(
      [{ k: "alerts.why.allStraight" }],
      "texto velho congelado",
      en,
      fmtEn,
    );
    expect(saida).toBe("All in a straight line: no position on the course to compare.");
  });

  // As provas já gravadas antes desta mudança, e o acionamento feito à mão pela
  // direção, que é prosa de gente e não tem cláusula nenhuma.
  it("cai no texto congelado quando não há partes", () => {
    expect(fraseOuTexto(null, "Moto 3 — acionada à mão.", en, fmtEn)).toBe(
      "Moto 3 — acionada à mão.",
    );
  });

  it("devolve nulo quando não há nem um nem outro", () => {
    expect(fraseOuTexto(null, null, en, fmtEn)).toBeNull();
  });
});
