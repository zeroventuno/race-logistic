import { describe, expect, it, vi } from "vitest";

import { garantirCamada, garantirFonte } from "./RouteDrawMap";

/**
 * O mapa de mentira registra o que foi pedido.
 *
 * `aoPronto` roda mais de uma vez por montagem — `setStyle` derruba fontes e
 * camadas, e quem desenha em cima precisa ser chamado de novo. O que estes
 * testes travam é que pedir de novo NUNCA lance: o MapLibre lança "There is
 * already a source with ID" e a árvore inteira do editor cai no render.
 */
function mapaFalso() {
  const fontes = new Map<string, { setData: (d: unknown) => void }>();
  const camadas = new Set<string>();

  return {
    getSource: (id: string) => fontes.get(id),
    getLayer: (id: string) => (camadas.has(id) ? { id } : undefined),
    addSource: vi.fn((id: string) => {
      if (fontes.has(id)) throw new Error(`There is already a source with ID "${id}"`);
      fontes.set(id, { setData: vi.fn() });
    }),
    addLayer: vi.fn((spec: { id: string }) => {
      if (camadas.has(spec.id)) throw new Error(`Layer "${spec.id}" already exists`);
      camadas.add(spec.id);
    }),
  };
}

const vazio = { type: "FeatureCollection", features: [] } as never;
const camada = { id: "linha", type: "line", source: "fonte" } as never;

describe("garantirFonte", () => {
  it("cria na primeira vez", () => {
    const m = mapaFalso();
    garantirFonte(m as never, "fonte", vazio);
    expect(m.addSource).toHaveBeenCalledTimes(1);
  });

  it("na segunda vez atualiza os dados em vez de lançar", () => {
    const m = mapaFalso();
    garantirFonte(m as never, "fonte", vazio);
    expect(() => garantirFonte(m as never, "fonte", vazio)).not.toThrow();
    expect(m.addSource).toHaveBeenCalledTimes(1);
  });
});

describe("garantirCamada", () => {
  it("cria na primeira vez e ignora na segunda", () => {
    const m = mapaFalso();
    garantirCamada(m as never, camada);
    expect(() => garantirCamada(m as never, camada)).not.toThrow();
    expect(m.addLayer).toHaveBeenCalledTimes(1);
  });
});
