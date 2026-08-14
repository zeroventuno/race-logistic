/**
 * A marca, definida uma única vez.
 *
 * A bandeirola do *flamme rouge* — o arco vermelho pendurado sobre a estrada no
 * último quilômetro. Toda arte da marca sai daqui: o favicon, os ícones do PWA,
 * o cabeçalho do painel e o timbre da folha de códigos impressa. Um SVG copiado
 * e colado em seis lugares vira seis marcas ligeiramente diferentes na primeira
 * vez que alguém ajusta um vértice.
 *
 * ARQUITETURA DE NOME
 *   Completo .... "Flamme Rouge"  — login, impressos, domínio, contrato
 *   Curto ....... "Flamme"        — cabeçalho estreito, ícone, rádio
 *
 * A forma curta é oficial, não uma abreviação que aconteceu sozinha. Doze
 * caracteres em duas palavras seriam encurtados de qualquer jeito na prática;
 * a diferença entre uma marca e duas é essa redução ser desenhada de propósito.
 */

export const BRAND = {
  fullName: "Flamme Rouge",
  shortName: "Flamme",
  tagline: {
    "pt-BR": "Direção de prova ao vivo",
    it: "Direzione gara in tempo reale",
    en: "Live race control",
    fr: "Direction de course en direct",
    es: "Dirección de carrera en directo",
    de: "Rennleitung in Echtzeit",
  },
  color: {
    /** Vermelho da bandeirola. Único uso decorativo de vermelho no sistema. */
    rouge: "#D92D20",
    rougeDeep: "#8F1A12",
    /** Versão para fundo escuro — o mesmo matiz, luminosidade compensada. */
    rougeOnDark: "#F2453A",
    asphalt: "#12171C",
    chalk: "#ECEFF1",
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

/** SVG do símbolo isolado, para embutir onde um componente React não cabe. */
export function markSvg(opts: {
  color?: string;
  background?: string;
  size?: number;
  /** Fração do lado ocupada pela marca. Ícone maskable precisa de folga. */
  scale?: number;
  rounded?: boolean;
} = {}): string {
  const {
    color = BRAND.color.rouge,
    background = "none",
    size = 512,
    scale = 1,
    rounded = false,
  } = opts;

  const inset = (100 * (1 - scale)) / 2;

  const bg =
    background === "none"
      ? ""
      : rounded
        ? `<rect width="100" height="100" rx="22" fill="${background}"/>`
        : `<rect width="100" height="100" fill="${background}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">${bg}<g transform="translate(${inset} ${inset}) scale(${scale})"><polygon points="${PENNANT_ICON}" fill="${color}"/></g></svg>`;
}
