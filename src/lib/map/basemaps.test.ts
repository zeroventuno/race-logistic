import { describe, expect, it } from "vitest";

import {
  BASEMAPS,
  BASEMAP_PADRAO,
  basemapsDisponiveis,
  resolverBasemap,
  type BasemapId,
} from "./basemaps";

/**
 * O catálogo é a parte do recurso que, se falhar, tira o mapa da direção no
 * dia da prova. Estes testes cobrem os três jeitos de isso acontecer.
 */

describe("catálogo de mapas de fundo", () => {
  it("o padrão está disponível", () => {
    // Se o padrão for desligado por licença sem trocar a constante, todo mundo
    // fica sem mapa — inclusive quem nunca escolheu nada.
    expect(BASEMAPS[BASEMAP_PADRAO].disponivel).toBe(true);
  });

  it("nenhum fundo disponível hoje exige chave", () => {
    // Enquanto não existe BYOK, um item disponível que peça chave renderiza um
    // mapa cinza sem dizer por quê.
    for (const b of basemapsDisponiveis()) {
      expect(b.exigeChave, b.id).toBe(false);
    }
  });

  it("todo fundo disponível constrói estilo nos dois temas", () => {
    for (const b of basemapsDisponiveis()) {
      for (const tema of ["light", "dark"] as const) {
        const estilo = b.estilo(tema);
        expect(estilo.version, `${b.id}/${tema}`).toBe(8);
        expect(Object.keys(estilo.sources).length).toBeGreaterThan(0);
        // Atribuição não é opcional: é exigência de licença dos dados.
        const fonte = Object.values(estilo.sources)[0] as { attribution?: string };
        expect(fonte.attribution, `${b.id}/${tema}`).toBeTruthy();
      }
    }
  });

  it("todo fundo traz cor de rota para os dois temas", () => {
    // Inclusive os indisponíveis: a cor é o que torna seguro ligá-los depois.
    for (const b of Object.values(BASEMAPS)) {
      for (const tema of ["light", "dark"] as const) {
        expect(b.rota[tema].linha, `${b.id}/${tema}`).toMatch(/^#|^rgb/);
        expect(b.rota[tema].casing, `${b.id}/${tema}`).toMatch(/^#|^rgb/);
      }
    }
  });

  it("identificador desconhecido cai no padrão, sem lançar", () => {
    for (const entrada of [null, undefined, "", "nao-existe", "DROP TABLE"]) {
      expect(resolverBasemap(entrada).id).toBe(BASEMAP_PADRAO);
    }
  });

  it("fundo desligado por licença também cai no padrão", () => {
    // O caso real: uma prova foi criada com "satelite" ligado e depois o item
    // foi desligado. A prova não pode ficar sem mapa por causa disso.
    const desligado = Object.values(BASEMAPS).find((b) => !b.disponivel);
    expect(desligado).toBeDefined();
    expect(resolverBasemap(desligado!.id).id).toBe(BASEMAP_PADRAO);
  });

  it("o identificador cabe na restrição do banco", () => {
    // A coluna aceita ^[a-z][a-z0-9-]{0,31}$. Um id fora disso passa no
    // TypeScript e quebra no INSERT, que é o pior lugar para descobrir.
    for (const id of Object.keys(BASEMAPS) as BasemapId[]) {
      expect(id, id).toMatch(/^[a-z][a-z0-9-]{0,31}$/);
    }
  });
});
