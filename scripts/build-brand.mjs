#!/usr/bin/env node
/**
 * Gera os arquivos de marca a partir da geometria única em src/brand/mark.ts.
 *
 * Rodar depois de qualquer ajuste na bandeirola:  npm run brand
 *
 * Os PNGs são derivados, não fonte. Se alguém editar um PNG à mão, a próxima
 * execução apaga a edição — que é o comportamento desejado: existe um lugar só
 * onde a marca é definida.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC = join(ROOT, "public");
const BRAND_DIR = join(PUBLIC, "brand");

const ROUGE = "#D92D20";
const ASPHALT = "#12171C";
const CHALK = "#ECEFF1";
const TRAKR_LIME = "#A6E51A";

const PENNANT_ICON = "8,20 92,20 66,50 92,80 8,80";
const POLE = { x: 16, y: 12, width: 7, height: 76 };
const FLAG = "23,22 88,22 68,44 88,66 23,66";

function iconSvg({ color = ROUGE, background = null, scale = 1, rounded = false }) {
  const inset = (100 * (1 - scale)) / 2;
  const bg = background
    ? rounded
      ? `<rect width="100" height="100" rx="22" fill="${background}"/>`
      : `<rect width="100" height="100" fill="${background}"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${bg}<g transform="translate(${inset} ${inset}) scale(${scale})"><polygon points="${PENNANT_ICON}" fill="${color}"/></g></svg>`;
}

/**
 * Pilha de fontes das assinaturas.
 *
 * ADVERTÊNCIA que vale registrar: um `<text>` em SVG só desenha na fonte
 * pedida se ela existir no contexto que renderiza. Dentro da aplicação a
 * Barlow está carregada e sai correta. Num arquivo SVG aberto solto, ou
 * colocado num editor de terceiros, ele cai para a reserva.
 *
 * Para IMPRESSÃO e para material que sai da aplicação, o texto precisa ser
 * convertido em contorno. Está anotado como pendência no manual — converter
 * exige um passo de vetorização que não vale automatizar antes de a fonte
 * estar definitiva.
 */
const FONT = "Barlow,Helvetica Neue,Arial,sans-serif";

function signatureSvg({ color = ROUGE, ink = ASPHALT, endorsed = false }) {
  // Assinatura horizontal: bandeirola com mastro + nome empilhado.
  // Duas palavras longas lado a lado empurrariam o símbolo para fora da caixa
  // e o conjunto deixaria de caber num cabeçalho.
  //
  // FLAMME em 300 e ROUGE em 700: o contraste de peso dá ritmo ao
  // empilhamento e faz a palavra vermelha carregar peso visual junto com a
  // cor, em vez de cor e peso competirem. A entreletra do ROUGE é menor
  // porque o peso maior já ocupa mais largura — igualar os dois trackings
  // deixaria as palavras desalinhadas na vertical.
  const endorsementBlock = endorsed
    ? `<text x="118" y="94" font-family="${FONT}" font-size="9" font-weight="500" letter-spacing="1.6" fill="${ink}" opacity="0.55">BY </text>
       <text x="137" y="94" font-family="${FONT}" font-size="9" font-weight="700" letter-spacing="1.6" fill="${TRAKR_LIME}">TRAKR</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 110" width="360" height="110">
  <g transform="translate(4 5) scale(0.9)">
    <rect x="${POLE.x}" y="${POLE.y}" width="${POLE.width}" height="${POLE.height}" fill="${color}"/>
    <polygon points="${FLAG}" fill="${color}"/>
  </g>
  <text x="118" y="46" font-family="${FONT}" font-size="34" font-weight="300" letter-spacing="4.4" fill="${ink}">FLAMME</text>
  <text x="118" y="78" font-family="${FONT}" font-size="34" font-weight="700" letter-spacing="3.6" fill="${color}">ROUGE</text>
  ${endorsementBlock}
</svg>`;
}

async function png(svg, size, outPath) {
  await sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toFile(outPath);
  return outPath;
}

async function main() {
  mkdirSync(BRAND_DIR, { recursive: true });

  const written = [];
  const put = (path, content) => {
    writeFileSync(path, content, "utf8");
    written.push(path);
  };

  // --- Fontes vetoriais ----------------------------------------------------

  put(join(PUBLIC, "icon.svg"), iconSvg({ color: ROUGE }));

  put(join(BRAND_DIR, "mark-rouge.svg"), iconSvg({ color: ROUGE }));
  put(join(BRAND_DIR, "mark-mono-dark.svg"), iconSvg({ color: CHALK }));
  put(join(BRAND_DIR, "mark-mono-light.svg"), iconSvg({ color: ASPHALT }));
  put(join(BRAND_DIR, "mark-with-pole.svg"), (() => {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="${POLE.x}" y="${POLE.y}" width="${POLE.width}" height="${POLE.height}" fill="${ROUGE}"/><polygon points="${FLAG}" fill="${ROUGE}"/></svg>`;
  })());

  put(join(BRAND_DIR, "signature.svg"), signatureSvg({}));
  put(join(BRAND_DIR, "signature-dark.svg"), signatureSvg({ ink: CHALK }));
  put(join(BRAND_DIR, "signature-endorsed.svg"), signatureSvg({ endorsed: true }));
  put(join(BRAND_DIR, "signature-endorsed-dark.svg"),
      signatureSvg({ ink: CHALK, endorsed: true }));

  // --- Rasterizações -------------------------------------------------------

  // Ícone do app: bandeirola branca sobre vermelho. Máximo reconhecimento
  // numa tela cheia de ícones concorrentes, e o vermelho aqui é legítimo —
  // a tela inicial do celular não é superfície operacional.
  const appIcon = iconSvg({ color: "#FFFFFF", background: ROUGE, scale: 0.62 });

  // Maskable: o sistema recorta numa forma que ele escolhe. Fora dos 80%
  // centrais, a ponta da bandeirola vira lixo cortado.
  const maskable = iconSvg({ color: "#FFFFFF", background: ROUGE, scale: 0.46 });

  written.push(await png(appIcon, 192, join(PUBLIC, "icon-192.png")));
  written.push(await png(appIcon, 512, join(PUBLIC, "icon-512.png")));
  written.push(await png(maskable, 512, join(PUBLIC, "icon-maskable-512.png")));
  written.push(await png(appIcon, 180, join(PUBLIC, "apple-touch-icon.png")));

  // Favicon PNG de apoio: fundo transparente, vermelho sólido. Sobrevive à
  // aba clara e à escura sem duas versões.
  written.push(
    await png(iconSvg({ color: ROUGE }), 32, join(PUBLIC, "favicon-32.png")),
  );

  console.log(`\n  ${written.length} arquivos de marca gerados:\n`);
  for (const p of written) {
    console.log(`    ${p.replace(ROOT + "\\", "").replace(ROOT + "/", "")}`);
  }
  console.log("");
}

main().catch((err) => {
  console.error(`\n  Falhou: ${err.message}\n`);
  process.exitCode = 1;
});
