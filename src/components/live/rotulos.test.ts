import { describe, expect, it } from "vitest";

import {
  prioridadeDoRotulo,
  rotulosVisiveis,
  type CaixaRotulo,
} from "./rotulos";

function caixa(
  id: string,
  prioridade: number,
  x: number,
  y: number,
  largura = 80,
  altura = 16,
): CaixaRotulo {
  return { id, prioridade, x, y, largura, altura };
}

describe("colisão de rótulos", () => {
  it("mostra todos quando ninguém encosta", () => {
    const vis = rotulosVisiveis([
      caixa("a", 3, 0, 0),
      caixa("b", 3, 200, 0),
      caixa("c", 3, 400, 0),
    ]);
    expect(vis.size).toBe(3);
  });

  it("no empilhamento, quem tem alerta vence", () => {
    // O caso que motivou tudo: o comboio junto na mesma curva.
    const vis = rotulosVisiveis([
      caixa("moto", 3, 100, 100),
      caixa("ambulancia", 0, 104, 102),
      caixa("apoio", 3.5, 98, 98),
    ]);
    expect([...vis]).toEqual(["ambulancia"]);
  });

  it("respeita a hierarquia inteira quando tudo colide", () => {
    const vis = rotulosVisiveis([
      caixa("comboio", 3.09, 100, 100),
      caixa("referencia", 2, 101, 100),
      caixa("selecionado", 1, 102, 100),
    ]);
    expect([...vis]).toEqual(["selecionado"]);
  });

  it("quem não colide entra mesmo com prioridade baixa", () => {
    // Prioridade decide o empate, não o direito de existir. Um veículo
    // sozinho num canto do mapa mostra o nome, seja ele qual for.
    const vis = rotulosVisiveis([
      caixa("alerta", 0, 100, 100),
      caixa("longe", 3.9, 600, 400),
    ]);
    expect(vis.has("longe")).toBe(true);
  });

  it("é estável entre quadros com prioridades iguais", () => {
    // Sem desempate determinístico, dois veículos de mesma prioridade
    // trocariam de vez e os rótulos piscariam a cada atualização.
    const entrada = [caixa("zebra", 3, 100, 100), caixa("alfa", 3, 104, 100)];
    const a = rotulosVisiveis(entrada);
    const b = rotulosVisiveis([...entrada].reverse());
    expect([...a]).toEqual([...b]);
  });

  it("caixa mais larga colide mais longe", () => {
    // A conta usa a largura de cada rótulo, não um raio fixo: um nome longo
    // ocupa mais e tem que empurrar mais.
    const curto = rotulosVisiveis([
      caixa("a", 3, 0, 0, 40),
      caixa("b", 3.1, 60, 0, 40),
    ]);
    expect(curto.size).toBe(2);

    const longo = rotulosVisiveis([
      caixa("a", 3, 0, 0, 140),
      caixa("b", 3.1, 60, 0, 140),
    ]);
    expect(longo.size).toBe(1);
  });
});

describe("prioridade do rótulo", () => {
  const base = {
    temAlerta: false,
    selecionado: false,
    referencia: false,
    ordemComboio: 50,
  };

  it("ordena alerta, seleção, referência e comboio", () => {
    const alerta = prioridadeDoRotulo({ ...base, temAlerta: true });
    const sel = prioridadeDoRotulo({ ...base, selecionado: true });
    const ref = prioridadeDoRotulo({ ...base, referencia: true });
    const comum = prioridadeDoRotulo(base);

    expect(alerta).toBeLessThan(sel);
    expect(sel).toBeLessThan(ref);
    expect(ref).toBeLessThan(comum);
  });

  it("o comboio nunca alcança a faixa da referência", () => {
    // Vassoura é o último do comboio (ordem 100). Mesmo ela tem que ficar
    // abaixo de qualquer referência, senão a hierarquia se inverte no fim
    // da lista.
    const ultimo = prioridadeDoRotulo({ ...base, ordemComboio: 100 });
    const ref = prioridadeDoRotulo({ ...base, referencia: true });
    expect(ref).toBeLessThan(ultimo);
    expect(ultimo).toBeLessThan(4);
  });

  it("preserva a ordem interna do comboio", () => {
    const abertura = prioridadeDoRotulo({ ...base, ordemComboio: 10 });
    const vassoura = prioridadeDoRotulo({ ...base, ordemComboio: 100 });
    expect(abertura).toBeLessThan(vassoura);
  });
});
