/**
 * Especificação dos slots de mídia da landing.
 *
 * NENHUM ATIVO PAGO FOI GERADO. Este arquivo é o contrato entre a página e a
 * produção: cada slot já tem proporção, teto de peso, texto alternativo e o
 * briefing do que precisa aparecer no quadro. Enquanto `src` for `null`, o
 * componente desenha um espaço reservado com a ficha técnica impressa — a
 * página fica pronta para revisão de layout antes de qualquer crédito ser
 * gasto, e o dia em que os arquivos chegarem o trabalho é preencher `src`.
 *
 * O teto de peso não é aspiracional. É o orçamento de um organizador abrindo a
 * página no 4G do carro, e cada slot que estourar o valor aqui precisa de uma
 * decisão consciente, não de um "ficou grandinho".
 */

export type ProporcaoSlot = `${number}/${number}`;

export interface SlotImagem {
  id: string;
  tipo: "imagem";
  /** Proporção CSS. Reserva a caixa antes do byte chegar — sem CLS. */
  proporcao: ProporcaoSlot;
  /** Caminho em /public quando o ativo existir. `null` = espaço reservado. */
  src: string | null;
  /** Alternativa de texto. Descreve o que a imagem PROVA, não o que ela é. */
  alt: string;
  /** Teto de peso em KB, já comprimido. */
  maxKB: number;
  /** Formatos aceitos, em ordem de preferência. */
  formatos: readonly string[];
  /** Largura de referência para o corte principal. */
  larguraRef: number;
  /** O que o quadro precisa mostrar. Vai para o briefing de produção. */
  briefing: string;
}

export interface SlotVideo {
  id: string;
  tipo: "video";
  proporcao: ProporcaoSlot;
  /** Fontes em ordem: o navegador pega a primeira que entende. */
  fontes: readonly { readonly src: string; readonly type: string }[] | null;
  /** Pôster. Precisa se sustentar sozinho — ver comentário em HeroiPalco. */
  poster: string | null;
  alt: string;
  maxKB: number;
  duracaoSegundos: readonly [number, number];
  briefing: string;
}

export type Slot = SlotImagem | SlotVideo;

/**
 * Segundo, dentro do loop, em que o arco do último quilômetro sai por cima da
 * câmera. É o quadro em que a marca assenta na tela — o objeto real virando
 * logotipo. Ajustar quando a filmagem definitiva chegar; o herói já lê daqui.
 */
export const SEGUNDO_DO_ARCO = 2.6;

export const SLOTS = {
  heroi: {
    id: "heroi",
    tipo: "video",
    proporcao: "21/9",
    // Quando os arquivos existirem, troque por:
    // [{ src: "/marketing/heroi-pave.webm", type: "video/webm" },
    //  { src: "/marketing/heroi-pave.mp4",  type: "video/mp4"  }]
    fontes: null,
    poster: null,
    alt:
      "Vista de dentro do carro de direção numa estrada de paralelepípedo, " +
      "ciclistas à frente e o arco do último quilômetro passando por cima.",
    maxKB: 2500,
    duracaoSegundos: [6, 10],
    briefing:
      "POV do banco do diretor de prova. Pavé, ciclistas à frente, arco do " +
      "último quilômetro cruzando o topo do quadro. O arco sair de cena é o " +
      "corte em que a marca assenta.",
  },
  painel: {
    id: "painel",
    tipo: "imagem",
    proporcao: "16/10",
    src: null,
    alt:
      "Painel da direção de prova: mapa do percurso com os veículos de apoio, " +
      "janela entre abertura e vassoura marcada como medida, e a fila de alertas.",
    maxKB: 220,
    formatos: ["avif", "webp"],
    larguraRef: 1600,
    briefing:
      "Captura real do /dashboard em prova simulada. O vermelho que aparecer " +
      "aqui é estado operacional e não pode ser recolorido para combinar com a " +
      "página.",
  },
  app: {
    id: "app",
    tipo: "imagem",
    proporcao: "39/80",
    src: null,
    alt:
      "App do motorista no celular: papel do veículo, quilômetro atual no " +
      "percurso, estado do envio e os botões de alerta.",
    maxKB: 140,
    formatos: ["avif", "webp"],
    larguraRef: 780,
    briefing:
      "Captura real do /motorista em tela de celular, em uso, com a mão no " +
      "suporte do painel do carro se possível.",
  },
  pave: {
    id: "pave",
    tipo: "imagem",
    proporcao: "3/2",
    src: null,
    alt:
      "Pelotão esticado em trecho de paralelepípedo, com carros de apoio " +
      "separados por centenas de metros.",
    maxKB: 180,
    formatos: ["avif", "webp"],
    larguraRef: 1400,
    briefing:
      "Prova o argumento da seção: no pavé a prova deixa de ser um pelotão. " +
      "Precisa ter distância visível entre grupos.",
  },
} as const satisfies Record<string, Slot>;

export type SlotId = keyof typeof SLOTS;
