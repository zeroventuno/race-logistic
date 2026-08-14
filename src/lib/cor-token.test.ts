import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Rede contra o bug que apagou o percurso do mapa.
 *
 * `getComputedStyle(el).getPropertyValue("--x")` devolve o TEXTO da
 * propriedade personalizada, não o valor resolvido. Com os tokens escritos em
 * `light-dark(claro, escuro)`, quem lê assim recebe a string literal
 * `"light-dark(#1f6fb2, #78bef0)"` — que o CSS entende quando usada como
 * valor, e que o MapLibre (ou qualquer canvas, ou qualquer biblioteca fora do
 * CSS) não entende de jeito nenhum. A camada simplesmente não desenha.
 *
 * O que torna isso perigoso é que nada acusa: o tipo é `string` nos dois
 * casos, o compilador fica quieto e a tela some sem erro no console.
 *
 * Quem precisa de uma cor fora do CSS usa `resolverCor`, que pinta um elemento
 * de sonda e lê a cor computada dele.
 */

const RAIZ = join(__dirname, "..");
const PERMITIDO = join("lib", "cor-token");

function arquivosDeFonte(dir: string, saida: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      arquivosDeFonte(caminho, saida);
      continue;
    }
    if (!/\.tsx?$/.test(nome) || /\.test\.tsx?$/.test(nome)) continue;
    saida.push(caminho);
  }
  return saida;
}

describe("token de cor lido fora do CSS", () => {
  it("ninguém usa getPropertyValue num token de cor", () => {
    const culpados: string[] = [];

    for (const arquivo of arquivosDeFonte(RAIZ)) {
      if (arquivo.includes(PERMITIDO)) continue;

      readFileSync(arquivo, "utf8")
        .split("\n")
        .forEach((linha, i) => {
          // `getPropertyValue("--route-line")`, `--color-critical` etc.
          if (/getPropertyValue\(\s*["'`]--/.test(linha)) {
            culpados.push(`${relative(RAIZ, arquivo)}:${i + 1}`);
          }
        });
    }

    expect(culpados).toEqual([]);
  });

  it("todo token de cor no CSS é um par light-dark", () => {
    // Se um token de cor deixar de ser `light-dark()`, a leitura crua volta a
    // "funcionar" por acaso — e o próximo a escrevê-la não descobre o
    // problema até alguém trocar de tema.
    const css = readFileSync(join(RAIZ, "app", "globals.css"), "utf8");
    const rota = css.match(/--route-line:\s*([^;]+);/)?.[1] ?? "";
    expect(rota).toContain("light-dark(");
  });
});
