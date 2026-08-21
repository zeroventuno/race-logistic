#!/usr/bin/env node
/**
 * Otimiza as imagens da landing.
 *
 * As originais chegam como PNG de 2 a 3 MB. Servir isso a um organizador
 * abrindo a página no 4G do carro é perder a visita antes do primeiro
 * parágrafo — e é exatamente o público que a página precisa segurar.
 *
 * Cada imagem sai em AVIF (menor, moderno) e WebP (rede de segurança), em duas
 * larguras. O `<picture>` escolhe; o navegador baixa uma só.
 *
 * Os originais NÃO entram no repositório: ficam fora, e este script é o que
 * reconstrói os derivados. Guardar PNG de 2 MB versionado engorda o clone para
 * sempre por um arquivo que ninguém serve.
 */

import { mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public", "marketing");

const FONTES = {
  heroi: process.env.SRC_HEROI,
  pave: process.env.SRC_PAVE,
  painel: process.env.SRC_PAINEL,
  app: process.env.SRC_APP,
};

/**
 * Larguras e tetos.
 *
 * O herói é a maior imagem da página e a primeira coisa que carrega, então
 * leva o orçamento maior. O pavé aparece rolando, com o texto já lido — pode
 * ser mais leve.
 */
const PERFIS = {
  // As origens têm 1536 px de largura. Pedir 2400 não amplia (e não deve),
  // então gerar essa variante produziria um arquivo idêntico ao de 1536 com
  // nome diferente — peso morto no repositório e uma escolha inútil para o
  // navegador fazer.
  heroi: { larguras: [900, 1536], tetoKB: 320, qualidade: { avif: 52, webp: 74 } },
  pave: { larguras: [700, 1400], tetoKB: 180, qualidade: { avif: 50, webp: 72 } },

  // CAPTURA DE TELA NÃO É FOTOGRAFIA, e por isso leva qualidade mais alta que
  // o herói apesar de ser menor. Foto perdoa: ninguém sabe onde ficava cada
  // folha. Interface não — a mesma taxa que deixa um pavé impecável transforma
  // "66,2 km" numa mancha, e o argumento da seção depende de o visitante
  // conseguir LER o número na tela. Em compensação, área chapada comprime
  // muito bem, então o teto continua modesto mesmo com qualidade alta.
  // q62 é o degrau mais alto que cabe no teto: 212 KB contra 222 do q64. A
  // lista de veículos, que é o menor corpo de texto da tela, continua nítida
  // a 3x de zoom — conferido no recorte antes de fixar.
  painel: { larguras: [900, 1600], tetoKB: 220, qualidade: { avif: 62, webp: 76 } },
  app: { larguras: [420, 780], tetoKB: 140, qualidade: { avif: 64, webp: 84 } },
};

async function gerar(nome, origem) {
  if (!origem) {
    console.log(`  · ${nome}: sem origem definida (SRC_${nome.toUpperCase()}), pulando`);
    return [];
  }

  const perfil = PERFIS[nome];
  const meta = await sharp(origem).metadata();
  const saidas = [];

  for (const largura of perfil.larguras) {
    // Nunca ampliar: aumentar um raster só adiciona peso e borra o resultado.
    const alvo = Math.min(largura, meta.width ?? largura);

    for (const [formato, opcoes] of [
      ["avif", { quality: perfil.qualidade.avif, effort: 6 }],
      ["webp", { quality: perfil.qualidade.webp, effort: 6 }],
    ]) {
      const destino = join(OUT, `${nome}-${largura}.${formato}`);
      await sharp(origem)
        .resize(alvo, null, { withoutEnlargement: true })
        [formato](opcoes)
        .toFile(destino);

      const kb = statSync(destino).size / 1024;
      saidas.push({ destino, kb, largura, formato });
    }
  }

  return saidas;
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  let estouro = false;

  for (const [nome, origem] of Object.entries(FONTES)) {
    const saidas = await gerar(nome, origem);
    if (saidas.length === 0) continue;

    console.log(`\n  ${nome}:`);
    for (const s of saidas) {
      const teto = PERFIS[nome].tetoKB;
      // Só a MAIOR variante é medida contra o teto — as menores existem
      // justamente para caber com folga em tela pequena.
      const conta = s.largura === Math.max(...PERFIS[nome].larguras);
      const marca = conta && s.kb > teto ? "  ACIMA DO TETO" : "";
      if (conta && s.kb > teto && s.formato === "avif") estouro = true;
      console.log(
        `    ${s.destino.split("marketing\\").pop()}  ${s.kb.toFixed(0)} KB${marca}`,
      );
    }
  }

  if (estouro) {
    console.log(
      "\n  Alguma variante AVIF passou do teto. Baixe a qualidade em PERFIS ou reduza a largura.\n",
    );
    process.exitCode = 1;
  } else {
    console.log("");
  }
}

main().catch((err) => {
  console.error(`\n  Falhou: ${err.message}\n`);
  process.exitCode = 1;
});
