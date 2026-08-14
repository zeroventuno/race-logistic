import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { vehicleGlyphSvg, vehicleMarkerSvg } from "./vehicle";
import { ROLE_META, type PositionRole } from "@/lib/types";

const PAPEIS = Object.keys(ROLE_META) as PositionRole[];

/**
 * Estes testes existem por causa de uma regressão real.
 *
 * `ROLE_META.icon` já foi um emoji, e o campo era jogado direto na tela:
 * `{meta.icon}`. Quando virou um NOME de pictograma ("ambulance"), todo lugar
 * que continuou fazendo isso passou a escrever a palavra em inglês no meio da
 * interface — no painel da direção, no marcador do mapa, na folha impressa.
 * Nada quebrou: nem o compilador nem os testes reclamam de `string` renderada
 * como texto, porque é exatamente isso que ela é.
 *
 * O primeiro bloco cobre o desenho; o segundo é a rede contra a regressão em
 * si, e vale mais que o primeiro.
 */

describe("pictogramas dos veículos", () => {
  it("todo papel tem um símbolo próprio, sem cair no genérico", () => {
    // O alfinete genérico pertence ao papel "other" e só a ele. Qualquer outro
    // papel apontando para lá é papel novo que entrou sem símbolo — e no mapa
    // ele fica indistinguível de um veículo sem função declarada.
    const semSimbolo = PAPEIS.filter(
      (p) => p !== "other" && ROLE_META[p].icon === "other",
    );
    expect(semSimbolo).toEqual([]);
  });

  it("cada papel desenha um glifo com geometria de verdade", () => {
    for (const papel of PAPEIS) {
      const svg = vehicleGlyphSvg(papel, "#0a0c10", 18);

      expect(svg.startsWith("<svg"), papel).toBe(true);
      expect(svg.endsWith("</svg>"), papel).toBe(true);
      // Uma forma, no mínimo. Um `<svg>` vazio passaria em qualquer checagem
      // de "renderizou" e apareceria como um buraco no marcador.
      expect(svg, papel).toMatch(/<(path|circle)\b/);
      expect(svg, papel).toContain('width="18"');
    }
  });

  it("papéis diferentes não desenham a mesma coisa", () => {
    // Abertura e fechamento são as duas bandeiras: se um dia colarem no mesmo
    // path, o diretor perde de vista justamente o par que define a janela.
    const distintos = new Set(PAPEIS.map((p) => vehicleGlyphSvg(p, "#000", 20)));
    expect(distintos.size).toBe(PAPEIS.length);
  });

  it("o marcador do mapa leva disco na cor do papel", () => {
    const svg = vehicleMarkerSvg("ambulance", "#EF4444");
    expect(svg).toContain('fill="#EF4444"');
    expect(svg).toContain("<circle");
  });
});

// ---------------------------------------------------------------------------

const RAIZ = join(__dirname, "..", "..");
const ESTE_MODULO = join("components", "icons", "vehicle");

/** Todo .ts/.tsx de `src/`, menos o próprio módulo de ícones e os testes. */
function arquivosDeFonte(dir: string, saida: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      arquivosDeFonte(caminho, saida);
      continue;
    }
    if (!/\.tsx?$/.test(nome) || /\.test\.tsx?$/.test(nome)) continue;
    if (caminho.includes(ESTE_MODULO)) continue;
    saida.push(caminho);
  }
  return saida;
}

describe("nome de pictograma nunca vira texto na tela", () => {
  it("ninguém renderiza ROLE_META[...].icon", () => {
    // `ROLE_META[x].icon` é o nome do símbolo, para o módulo de ícones
    // resolver. Fora dele, qualquer uso é o bug de novo: ou está indo para
    // JSX, ou para `textContent`, ou para dentro de uma interpolação de
    // tradução — e nos três casos a tela mostra "ambulance".
    const culpados: string[] = [];

    for (const arquivo of arquivosDeFonte(RAIZ)) {
      const linhas = readFileSync(arquivo, "utf8").split("\n");
      linhas.forEach((linha, i) => {
        if (/ROLE_META\s*\[[^\]]+\]\s*\.icon\b/.test(linha)) {
          culpados.push(`${relative(RAIZ, arquivo)}:${i + 1}`);
        }
      });
    }

    expect(culpados).toEqual([]);
  });
});
