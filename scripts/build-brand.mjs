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

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import * as fontkit from "fontkit";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC = join(ROOT, "public");
const BRAND_DIR = join(PUBLIC, "brand");

const ROUGE = "#D92D20";
const ASPHALT = "#12171C";
const CHALK = "#ECEFF1";

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
 * O LETREIRO É CURVA, NÃO TEXTO.
 *
 * Um `<text>` em SVG só desenha na fonte pedida se ela existir no contexto que
 * renderiza. Dentro da aplicação a Barlow está carregada e sai correta — mas o
 * arquivo aberto solto, colocado num editor de terceiros, impresso, ou
 * rasterizado por qualquer ferramenta que não tenha a fonte, cai para a
 * reserva. Foi o que aconteceu: `ROUGE` saía COM SERIFA, e o manual da marca
 * mostrava um logotipo que não é o logotipo.
 *
 * Duas tentativas antes desta, as duas verificadas olhando o resultado:
 * rasterizar com o `sharp` não usa a fonte, e embuti-la no próprio SVG como
 * `@font-face` com data URI também não — o librsvg ignora.
 *
 * Agora as letras viram `<path>` a partir do arquivo da fonte, que é
 * dependência declarada (`@fontsource/barlow-condensed`). O SVG passa a ser
 * autocontido: mesma forma em qualquer máquina, com ou sem fonte instalada,
 * na tela e no papel. É o que se espera de um arquivo de logotipo.
 */
const ARQUIVOS_DA_FONTE = join(
  ROOT,
  "node_modules/@fontsource/barlow-condensed/files",
);

/**
 * FONTKIT, E NÃO OPENTYPE.JS — e a escolha custou uma investigação.
 *
 * O opentype.js lê esta fonte e devolve avanços corretos, mas `getPath`
 * produzia `NaN` dentro do caminho de alguns glifos, e OS GLIFOS AFETADOS
 * MUDAVAM ENTRE EXECUÇÕES: numa rodada M, Q e S; noutra M, V e 3. O mesmo
 * glifo, chamado isolado com os mesmos argumentos, saía perfeito. Estado
 * compartilhado entre chamadas, portanto — e um gerador de logotipo não
 * determinístico é pior que nenhum.
 *
 * O fontkit converte os 26 glifos dos dois pesos sem uma única falha, e três
 * execuções seguidas dão byte idêntico.
 */
function carregarFonte(peso) {
  return fontkit.create(
    readFileSync(
      join(ARQUIVOS_DA_FONTE, `barlow-condensed-latin-${peso}-normal.woff`),
    ),
  );
}

/**
 * Uma palavra em curvas, esticada até a largura alvo.
 *
 * Reproduz o que `textLength` + `lengthAdjust="spacing"` faziam no `<text>`: a
 * folga vai para os ESPAÇOS ENTRE AS LETRAS, e não para dentro delas. Esticar o
 * glifo deformaria a face — que é justamente o que a entreletra existe para
 * evitar.
 *
 * A escala inverte o Y porque fonte é desenhada de baixo para cima e SVG de
 * cima para baixo; sem isso o letreiro sai espelhado na vertical.
 */
function palavraEmCurvas(fonte, texto, x, y, tamanho, larguraAlvo) {
  const escala = tamanho / fonte.unitsPerEm;
  const glifos = fonte.glyphsForString(texto);

  const avancos = glifos.map((g) => g.advanceWidth * escala);
  const natural = avancos.reduce((a, b) => a + b, 0);
  const vaos = glifos.length - 1;
  const extraPorVao = vaos > 0 ? (larguraAlvo - natural) / vaos : 0;

  let cursor = x;
  let d = "";

  glifos.forEach((g, i) => {
    d += g.path.scale(escala, -escala).translate(cursor, y).toSVG() + " ";
    cursor += avancos[i] + extraPorVao;
  });

  return d.trim();
}

/**
 * Larguras iguais para as duas palavras.
 *
 * O HTML resolve isso com flex; SVG não tem equivalente. Aqui o alinhamento
 * sai de `textLength` + `lengthAdjust="spacing"`: as duas linhas recebem a
 * MESMA largura alvo, e o renderizador distribui o espaço entre as letras.
 * "FLAMME" tem seis letras em peso leve e "ROUGE" cinco em peso pesado — sem
 * isto, as duas linhas terminam em pontos diferentes.
 */
const LARGURA_LETREIRO = 218;

function signatureSvg({ color = ROUGE, ink = ASPHALT }) {
  // Assinatura horizontal: bandeirola com mastro + nome empilhado.
  // Duas palavras longas lado a lado empurrariam o símbolo para fora da caixa
  // e o conjunto deixaria de caber num cabeçalho.
  //
  // FLAMME em 300 e ROUGE em 700: o contraste de peso dá ritmo ao
  // empilhamento e faz a palavra vermelha carregar peso visual junto com a
  // cor, em vez de cor e peso competirem.
  const leve = carregarFonte(300);
  const forte = carregarFonte(700);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 110" width="360" height="110">
  <g transform="translate(4 5) scale(0.9)">
    <rect x="${POLE.x}" y="${POLE.y}" width="${POLE.width}" height="${POLE.height}" fill="${color}"/>
    <polygon points="${FLAG}" fill="${color}"/>
  </g>
  <path d="${palavraEmCurvas(leve, "FLAMME", 118, 46, 36, LARGURA_LETREIRO)}" fill="${ink}"/>
  <path d="${palavraEmCurvas(forte, "ROUGE", 118, 80, 36, LARGURA_LETREIRO)}" fill="${color}"/>
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
  const markComMastro = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="${POLE.x}" y="${POLE.y}" width="${POLE.width}" height="${POLE.height}" fill="${ROUGE}"/><polygon points="${FLAG}" fill="${ROUGE}"/></svg>`;
  put(join(BRAND_DIR, "mark-with-pole.svg"), markComMastro);

  put(join(BRAND_DIR, "signature.svg"), signatureSvg({}));
  put(join(BRAND_DIR, "signature-dark.svg"), signatureSvg({ ink: CHALK }));

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

  // --- Marca para e-mail ---------------------------------------------------

  /*
   * SÓ A FLÂMULA, SEM O LETREIRO, e isso é conclusão de teste e não gosto.
   *
   * O letreiro depende de Barlow Condensed, e o rasterizador do `sharp`
   * (librsvg) não a tem: rasterizar `signature.svg` aqui devolve ROUGE com
   * SERIFA. Tentei embutir a fonte no próprio SVG como `@font-face` com data
   * URI — o librsvg ignora. Verificado nas duas formas antes de desistir.
   *
   * A flâmula é retângulo mais polígono, geometria pura: sai idêntica em
   * qualquer máquina, sem fonte instalada. No e-mail ela vai ao lado do
   * letreiro escrito em HTML, que é a combinação mais robusta de qualquer
   * jeito — cliente de e-mail bloqueia imagem por padrão, e um logo que é
   * só imagem vira um retângulo vazio para metade de quem recebe.
   *
   * `trim` porque o `viewBox` é quadrado e a flâmula não é: sem ele a imagem
   * carrega margem branca que o e-mail teria de compensar na mão.
   */
  {
    const destino = join(BRAND_DIR, "email-mark.png");
    await sharp(Buffer.from(markComMastro), { density: 512 })
      .resize({ width: 256 })
      .trim()
      .flatten({ background: "#ffffff" })
      .png({ compressionLevel: 9 })
      .toFile(destino);
    written.push(destino);
  }

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
