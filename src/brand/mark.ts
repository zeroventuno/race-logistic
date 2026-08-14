/**
 * A marca, definida uma única vez.
 *
 * A bandeirola do *flamme rouge* — o arco vermelho pendurado sobre a estrada no
 * último quilômetro. Toda arte da marca sai daqui: o favicon, os ícones do PWA,
 * o cabeçalho do painel e o timbre da folha de códigos impressa. Um SVG copiado
 * e colado em seis lugares vira seis marcas ligeiramente diferentes na primeira
 * vez que alguém ajusta um vértice.
 *
 * ---------------------------------------------------------------------------
 * ARQUITETURA DE MARCA — endossada
 *
 *   Flamme Rouge, by TRAKR
 *
 * A marca é própria porque o comprador é próprio: quem contrata um sistema de
 * direção de prova é organização e federação, não o atleta que usa o TRAKR nem
 * o treinador que usa o TRAKR+. São públicos vizinhos, com ciclos de venda
 * diferentes. Numa venda de sistema de SEGURANÇA, um nome que veio do mundo
 * fitness de consumidor é objeção; um nome que o comissariado reconhece é
 * credencial.
 *
 * O endosso existe porque a vizinhança é real: o diretor de prova conhece o
 * TRAKR pelos treinadores e atletas que passam pelos eventos dele. "by TRAKR"
 * carrega essa confiança sem diluir a marca própria.
 *
 * Formas do nome:
 *   Completo .... "Flamme Rouge"  — login, impressos, domínio, contrato
 *   Curto ....... "Flamme"        — cabeçalho estreito, ícone, rádio
 *   Endossado ... "Flamme Rouge, by TRAKR" — rodapé, comercial, primeiro contato
 *
 * A forma curta é oficial, não uma abreviação que aconteceu sozinha. Doze
 * caracteres em duas palavras seriam encurtados de qualquer jeito na prática;
 * a diferença entre uma marca e duas é essa redução ser desenhada de propósito.
 *
 * ---------------------------------------------------------------------------
 * REGRA DE COR — a única que não pode ser quebrada
 *
 * O vermelho da marca NÃO aparece dentro da superfície operacional.
 *
 * No painel e no app, vermelho significa uma coisa só: alguém precisa de
 * socorro. Se a marca ocupar o cabeçalho em vermelho, o olho para de tratar
 * vermelho como urgência em vinte minutos de prova — e a cor perde o poder
 * exatamente onde ele é necessário.
 *
 * Por isso a marca tem duas aplicações, e qual usar não é escolha estética:
 *
 *   `rouge`      → login, impressos, material comercial, ícone de app
 *   monocromática → cabeçalho do painel, app do motorista, qualquer tela que
 *                   também mostre estado operacional
 *
 * A forma da bandeirola é reconhecível pelo recorte, não pela cor. Ela não
 * perde identidade em branco.
 */

export const BRAND = {
  fullName: "Flamme Rouge",
  shortName: "Flamme",
  endorsement: "by TRAKR",
  endorsedName: "Flamme Rouge, by TRAKR",

  tagline: {
    "pt-BR": "Direção de prova ao vivo",
    it: "Direzione gara in tempo reale",
    en: "Live race control",
    fr: "Direction de course en direct",
    es: "Dirección de carrera en directo",
    de: "Rennleitung in Echtzeit",
  },

  color: {
    /** Vermelho da bandeirola. NUNCA dentro da superfície operacional. */
    rouge: "#D92D20",
    rougeDeep: "#8F1A12",
    asphalt: "#12171C",
    chalk: "#ECEFF1",
    /** Lime do TRAKR — usado só no endosso, nunca sozinho. */
    trakrLime: "#A6E51A",
  },
} as const;

/**
 * Geometria da bandeirola, em coordenadas de um viewBox 0 0 100 100.
 *
 * Duas construções, não uma. A versão com mastro é a assinatura; a versão sem
 * mastro é o ícone. Isso não é preguiça de manter uma só: a 16 px o mastro vira
 * uma linha de meio pixel que some ou borra dependendo do arredondamento do
 * navegador, e o que resta é uma bandeirola torta. O ícone sem mastro ocupa a
 * caixa inteira e continua nítido.
 */
export const PENNANT_WITH_POLE = {
  pole: { x: 16, y: 12, width: 7, height: 76 },
  flag: "23,22 88,22 68,44 88,66 23,66",
} as const;

export const PENNANT_ICON = "8,20 92,20 66,50 92,80 8,80" as const;

export interface MarkOptions {
  color?: string;
  background?: string;
  size?: number;
  /**
   * Fração do lado ocupada pela marca.
   *
   * Ícone maskable precisa de folga: o sistema operacional recorta o ícone
   * numa forma que ele escolhe (círculo, quadrado arredondado, gota), e o que
   * fica fora da zona segura de 80% é cortado. Uma bandeirola com a ponta
   * decepada não é a marca.
   */
  scale?: number;
  rounded?: boolean;
  withPole?: boolean;
}

/** SVG do símbolo, para gerar arquivos e embutir onde React não cabe. */
export function markSvg(opts: MarkOptions = {}): string {
  const {
    color = BRAND.color.rouge,
    background = "none",
    size = 512,
    scale = 1,
    rounded = false,
    withPole = false,
  } = opts;

  const inset = (100 * (1 - scale)) / 2;

  const bg =
    background === "none"
      ? ""
      : rounded
        ? `<rect width="100" height="100" rx="22" fill="${background}"/>`
        : `<rect width="100" height="100" fill="${background}"/>`;

  const shape = withPole
    ? `<rect x="${PENNANT_WITH_POLE.pole.x}" y="${PENNANT_WITH_POLE.pole.y}" width="${PENNANT_WITH_POLE.pole.width}" height="${PENNANT_WITH_POLE.pole.height}" fill="${color}"/>` +
      `<polygon points="${PENNANT_WITH_POLE.flag}" fill="${color}"/>`
    : `<polygon points="${PENNANT_ICON}" fill="${color}"/>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">` +
    bg +
    `<g transform="translate(${inset} ${inset}) scale(${scale})">${shape}</g>` +
    `</svg>`
  );
}
