import { describe, expect, it } from "vitest";

import {
  BASEMAPS,
  BASEMAP_PADRAO,
  basemapUtilizavel,
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

  it("fundo que exige chave só aparece quando a chave existe", () => {
    // Um item disponível que peça chave ausente renderiza mapa cinza sem
    // dizer por quê. A lista tem que já vir filtrada pelo ambiente.
    const temChave = Boolean(process.env.NEXT_PUBLIC_MAPTILER_KEY);
    for (const b of basemapsDisponiveis()) {
      if (b.exigeChave) expect(temChave, b.id).toBe(true);
    }
  });

  it("todo fundo disponível constrói estilo nos dois temas", () => {
    for (const b of basemapsDisponiveis()) {
      for (const tema of ["light", "dark"] as const) {
        const estilo = b.estilo(tema);

        if (typeof estilo === "string") {
          // Estilo do provedor, por URL. O que importa checar é que a chave
          // entrou: URL sem `key=` devolve 403 e o mapa fica cinza.
          expect(estilo, `${b.id}/${tema}`).toMatch(/^https:\/\//);
          if (b.exigeChave) {
            expect(estilo, `${b.id}/${tema}`).toMatch(/[?&]key=.+/);
          }
          continue;
        }

        expect(estilo.version, `${b.id}/${tema}`).toBe(8);

        /*
         * ESTILO SEM FONTE É LEGÍTIMO, e é o único caso.
         *
         * Sem chave de provedor o padrão cai para fundo liso: uma camada de
         * cor e nada mais. Não há dado de terceiro em jogo, então não há o que
         * atribuir — a exigência abaixo vale para quem USA dado alheio.
         *
         * A regra que este teste protege é a inversa e essa não cede: fonte
         * declarada SEM atribuição é violação de licença, e passaria calada.
         */
        const fontes = Object.values(estilo.sources) as { attribution?: string }[];

        if (fontes.length === 0) {
          expect(estilo.layers.length, `${b.id}/${tema}`).toBeGreaterThan(0);
          continue;
        }

        for (const fonte of fontes) {
          expect(fonte.attribution, `${b.id}/${tema}`).toBeTruthy();
        }
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

  it("fundo inutilizável cai no padrão", () => {
    // Dois casos reais, e os dois acabam aqui: o item foi desligado por
    // licença, ou a chave sumiu do ambiente. A prova não pode ficar sem mapa
    // por causa de nenhum dos dois.
    const inutilizavel = Object.values(BASEMAPS).find((b) => !basemapUtilizavel(b));
    if (inutilizavel) {
      expect(resolverBasemap(inutilizavel.id).id).toBe(BASEMAP_PADRAO);
    }
    // Com a chave presente todos são utilizáveis, e aí não há o que testar
    // aqui — o caso do identificador desconhecido já está coberto acima.
  });

  it("o identificador cabe na restrição do banco", () => {
    // A coluna aceita ^[a-z][a-z0-9-]{0,31}$. Um id fora disso passa no
    // TypeScript e quebra no INSERT, que é o pior lugar para descobrir.
    for (const id of Object.keys(BASEMAPS) as BasemapId[]) {
      expect(id, id).toMatch(/^[a-z][a-z0-9-]{0,31}$/);
    }
  });
});
