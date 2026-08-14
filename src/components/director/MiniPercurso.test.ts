import { describe, expect, it } from "vitest";

import { ALTURA, LARGURA, MARGEM, caminho } from "./MiniPercurso";

/**
 * A miniatura desenha a partir de `render_points`, que vem do banco. Duas
 * coisas podem quebrar em silêncio aqui e as duas produzem um desenho que
 * PARECE certo: a proporção esticada (um circuito redondo vira oval, e a
 * miniatura deixa de servir para reconhecer a prova) e um percurso degenerado
 * dividindo por zero.
 */

/** Extrai os pares numéricos de um atributo `d`. */
function pontosDe(d: string): Array<[number, number]> {
  return d
    .split(/(?=[ML])/)
    .map((seg) => seg.slice(1).trim().split(/\s+/).map(Number))
    .map(([x, y]) => [x!, y!] as [number, number]);
}

describe("miniatura do percurso", () => {
  it("cabe na caixa, com a margem respeitada", () => {
    const d = caminho([
      [7.0, 45.0],
      [7.2, 45.3],
      [7.4, 45.1],
      [7.0, 45.0],
    ]);
    expect(d).toBeTruthy();

    for (const [x, y] of pontosDe(d!)) {
      expect(x).toBeGreaterThanOrEqual(MARGEM - 0.05);
      expect(x).toBeLessThanOrEqual(LARGURA - MARGEM + 0.05);
      expect(y).toBeGreaterThanOrEqual(MARGEM - 0.05);
      expect(y).toBeLessThanOrEqual(ALTURA - MARGEM + 0.05);
    }
  });

  it("preserva a proporção — quadrado não vira retângulo", () => {
    // Um bounding box quadrado em graus. Se a escala fosse por eixo, o
    // desenho encheria a caixa 132×88 e o quadrado sairia achatado.
    const d = caminho([
      [7.0, 45.0],
      [7.1, 45.0],
      [7.1, 45.1],
      [7.0, 45.1],
      [7.0, 45.0],
    ]);
    const pts = pontosDe(d!);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const larg = Math.max(...xs) - Math.min(...xs);
    const alt = Math.max(...ys) - Math.min(...ys);

    expect(larg).toBeCloseTo(alt, 1);
    // E ele usa a altura toda disponível, que é o eixo apertado.
    expect(alt).toBeCloseTo(ALTURA - MARGEM * 2, 1);
  });

  it("inverte a latitude: norte fica em cima", () => {
    const d = caminho([
      [7.0, 45.0], // sul
      [7.0, 45.2], // norte
    ]);
    const [primeiro, ultimo] = pontosDe(d!);
    // Y do SVG cresce para baixo, então o ponto ao norte tem Y MENOR.
    expect(ultimo![1]).toBeLessThan(primeiro![1]);
  });

  it("fecha a volta: o último ponto nunca é descartado pela amostragem", () => {
    // 500 pontos força o passo de amostragem a pular a maioria.
    const muitos: [number, number][] = Array.from({ length: 500 }, (_, i) => [
      7 + Math.cos((i / 500) * Math.PI * 2) * 0.1,
      45 + Math.sin((i / 500) * Math.PI * 2) * 0.1,
    ]);
    muitos.push([7.5, 45.5]); // um extremo só no fim
    const d = caminho(muitos)!;
    const pts = pontosDe(d);

    // O extremo entrou, então ele define um dos cantos do enquadramento.
    const xs = pts.map((p) => p[0]);
    expect(Math.max(...xs)).toBeGreaterThan(LARGURA / 2);
  });

  it("devolve nulo em vez de dividir por zero", () => {
    expect(caminho([])).toBeNull();
    expect(caminho([[7, 45]])).toBeNull();
    // Todos no mesmo lugar: não há forma que desenhar.
    expect(
      caminho([
        [7, 45],
        [7, 45],
        [7, 45],
      ]),
    ).toBeNull();
  });

  it("ignora pares inválidos vindos do banco", () => {
    const sujo = [
      [7.0, 45.0],
      [Number.NaN, 45.1],
      null,
      [7.2, 45.2],
    ] as unknown as [number, number][];
    const d = caminho(sujo);
    expect(d).toBeTruthy();
    expect(d).not.toContain("NaN");
  });
});
