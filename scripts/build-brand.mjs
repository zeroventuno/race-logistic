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

/*
 * A GEOMETRIA VEM DE mark.ts, E NÃO DE UMA CÓPIA AQUI.
 *
 * Este arquivo repetia os seis valores — três cores, o ícone, o mastro e a
 * bandeirola. Batiam com os do produto porque foram digitados iguais, não
 * porque um lesse o outro: mudar a marca exigia lembrar dos dois lugares, e o
 * dia em que alguém esquecesse metade produziria arquivos de marca que não são
 * a marca que o produto desenha.
 *
 * O Node 24 remove tipos de `.ts` nativamente, então o script importa a fonte
 * do produto direto. Uma definição, como o manual sempre afirmou ter.
 */
import { BRAND, PENNANT_ICON, PENNANT_WITH_POLE } from "../src/brand/mark.ts";

const ROUGE = BRAND.color.rouge;
const ASPHALT = BRAND.color.asphalt;
const CHALK = BRAND.color.chalk;

const POLE = PENNANT_WITH_POLE.pole;
const FLAG = PENNANT_WITH_POLE.flag;

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
 * ENTRELETRA da assinatura em uma linha.
 *
 * 0,34 em, o mesmo valor do `.fr-assinatura__nome--linha` do site. Aqui NÃO
 * há equalização de largura entre as palavras — e isso é decisão, não
 * esquecimento: empilhadas elas formam um bloco e precisam casar; lado a lado
 * o que dá ritmo é a entreletra corrida, e forçar larguras iguais abriria um
 * buraco entre FLAMME e ROUGE.
 */
const TRACKING_LINHA = 0.34;

/**
 * Uma palavra em curvas com entreletra fixa, sem esticar para largura alvo.
 *
 * Devolve o caminho e onde o cursor parou, para a próxima palavra continuar
 * de lá.
 */
function palavraCorrida(fonte, texto, x, y, tamanho, tracking) {
  const escala = tamanho / fonte.unitsPerEm;
  const glifos = fonte.glyphsForString(texto);
  const extra = tamanho * tracking;

  let cursor = x;
  let d = "";

  glifos.forEach((g) => {
    d += g.path.scale(escala, -escala).translate(cursor, y).toSVG() + " ";
    cursor += g.advanceWidth * escala + extra;
  });

  return { d: d.trim(), fim: cursor };
}

/**
 * Assinatura em UMA LINHA: bandeirola + FLAMME ROUGE lado a lado.
 *
 * É a forma que o produto usa em cabeçalho, e a única que existe nas duas
 * versões de mastro. A empilhada é sempre com mastro: ela é a assinatura de
 * material de marca, onde há altura, e sem o mastro as duas linhas de texto
 * ficariam grandes demais ao lado de uma bandeirola solta.
 */
function signatureInlineSvg({ color = ROUGE, ink = ASPHALT, semMastro = false }) {
  const leve = carregarFonte(300);
  const forte = carregarFonte(700);

  const TAMANHO = 34;
  const BASE = 46;
  const INICIO = semMastro ? 78 : 92;

  const flamme = palavraCorrida(leve, "FLAMME", INICIO, BASE, TAMANHO, TRACKING_LINHA);
  // Um espaço de palavra, e não só a entreletra: sem ele "FLAMMEROUGE" vira
  // uma palavra só à distância, que é onde o letreiro é lido.
  const rouge = palavraCorrida(
    forte,
    "ROUGE",
    flamme.fim + TAMANHO * 0.22,
    BASE,
    TAMANHO,
    TRACKING_LINHA,
  );

  // A largura acompanha o conteúdo: o último glifo não leva entreletra à
  // direita, então o `fim` do cursor sobra um tracking.
  const largura = Math.ceil(rouge.fim - TAMANHO * TRACKING_LINHA + 8);

  const mastro = semMastro
    ? ""
    : `<rect x="${POLE.x}" y="${POLE.y}" width="${POLE.width}" height="${POLE.height}" fill="${color}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largura} 60" width="${largura}" height="60">
  <g transform="translate(${semMastro ? -2 : 4} 6) scale(0.48)">
    ${mastro}
    <polygon points="${FLAG}" fill="${color}"/>
  </g>
  <path d="${flamme.d}" fill="${ink}"/>
  <path d="${rouge.d}" fill="${color}"/>
</svg>`;
}

/**
 * LARGURAS IGUAIS, E A LARGURA SAI DA PALAVRA MAIS LARGA.
 *
 * As duas palavras precisam ocupar exatamente a mesma largura para formarem um
 * bloco — "FLAMME" tem seis letras em peso leve e "ROUGE" cinco em peso
 * pesado, e sem isso as linhas terminam em pontos diferentes.
 *
 * O QUE ESTAVA ERRADO: a largura era 218, um número cravado à mão. O site não
 * faz isso — o `Assinatura` distribui as letras com `space-between` numa
 * coluna flex, então a coluna assume a largura da palavra MAIS LARGA e a outra
 * estica até bater. Cravar 218 abria a entreletra 40% além do que a marca é, e
 * o arquivo de marca ficava mais solto que o produto.
 *
 * Agora a conta é a mesma do site: cada palavra com a entreletra base, e o
 * alvo é a maior das duas. O número deixou de existir.
 */
const TRACKING_LETREIRO = 0.34;

function larguraDoLetreiro(fontes, palavras, tamanho) {
  return Math.max(
    ...palavras.map((t, i) => {
      const fonte = fontes[i];
      const escala = tamanho / fonte.unitsPerEm;
      const natural = fonte
        .glyphsForString(t)
        .reduce((a, g) => a + g.advanceWidth * escala, 0);
      return natural + tamanho * TRACKING_LETREIRO * (t.length - 1);
    }),
  );
}

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

  const largura = larguraDoLetreiro([leve, forte], ["FLAMME", "ROUGE"], 36);
  // A caixa acompanha o conteúdo em vez de sobrar à direita.
  const caixa = Math.ceil(118 + largura + 8);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${caixa} 110" width="${caixa}" height="110">
  <g transform="translate(4 5) scale(0.9)">
    <rect x="${POLE.x}" y="${POLE.y}" width="${POLE.width}" height="${POLE.height}" fill="${color}"/>
    <polygon points="${FLAG}" fill="${color}"/>
  </g>
  <path d="${palavraEmCurvas(leve, "FLAMME", 118, 46, 36, largura)}" fill="${ink}"/>
  <path d="${palavraEmCurvas(forte, "ROUGE", 118, 80, 36, largura)}" fill="${color}"/>
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

  /*
   * A ASSINATURA EM LINHA é a que tem as duas versões de mastro.
   *
   * Com mastro no site, sem mastro no painel da direção e no app do motorista:
   * num cabeçalho de altura fixa o mastro gasta altura sem acrescentar
   * reconhecimento, e some visualmente no tamanho em que aquele cabeçalho
   * roda. A empilhada não entra nessa escolha — ela é sempre com mastro.
   */
  put(join(BRAND_DIR, "signature-inline.svg"), signatureInlineSvg({}));
  put(
    join(BRAND_DIR, "signature-inline-dark.svg"),
    signatureInlineSvg({ ink: CHALK }),
  );
  put(
    join(BRAND_DIR, "signature-inline-no-pole.svg"),
    signatureInlineSvg({ semMastro: true }),
  );
  put(
    join(BRAND_DIR, "signature-inline-no-pole-dark.svg"),
    signatureInlineSvg({ ink: CHALK, semMastro: true }),
  );

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
