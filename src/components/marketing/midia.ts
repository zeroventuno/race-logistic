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

import type { TranslationKey } from "@/lib/i18n/translate";

export type ProporcaoSlot = `${number}/${number}`;

export interface SlotImagem {
  id: string;
  tipo: "imagem";
  /** Proporção CSS. Reserva a caixa antes do byte chegar — sem CLS. */
  proporcao: ProporcaoSlot;
  /** Caminho em /public quando o ativo existir. `null` = espaço reservado. */
  src: string | null;
  /** Alternativa de texto. Descreve o que a imagem PROVA, não o que ela é. */
  altChave: TranslationKey;
  /** Teto de peso em KB, já comprimido. */
  maxKB: number;
  /** Formatos aceitos, em ordem de preferência. */
  formatos: readonly string[];
  /** Largura de referência para o corte principal. */
  larguraRef: number;
  /** O que o quadro precisa mostrar. Vai para o briefing de produção. */
  briefing: string;
}

/**
 * Pôster responsivo.
 *
 * O atributo `poster` de um `<video>` aceita uma URL só, sem `srcset`. Como
 * aqui o pôster também é o que ocupa o palco quando NÃO há vídeo — e esse é o
 * caso normal, não a exceção — ele precisa das variantes: servir 1536 px a um
 * celular é gastar banda de quem está no 4G do carro para nada.
 */
export interface PosterResponsivo {
  /** Caminho sem largura nem extensão: `/marketing/heroi`. */
  base: string;
  /** Larguras geradas, da menor para a maior. */
  larguras: readonly number[];
  /** Formatos em ordem de preferência. O navegador pega o primeiro que entende. */
  formatos: readonly string[];
}

export interface SlotVideo {
  id: string;
  tipo: "video";
  proporcao: ProporcaoSlot;
  /** Fontes em ordem: o navegador pega a primeira que entende. */
  fontes: readonly { readonly src: string; readonly type: string }[] | null;
  /** URL única, para o atributo `poster` do `<video>`. */
  poster: string | null;
  /** Variantes, para quando o pôster é o próprio conteúdo do palco. */
  posterSet: PosterResponsivo | null;
  altChave: TranslationKey;
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
    // 3/2, e não os 21/9 originais: a composição precisa de altura. O arco
    // ocupa o topo, a bandeirola pende no centro e o guidão da moto ancora a
    // base — um corte panorâmico decepa justamente os dois elementos que
    // fazem o quadro ser este quadro.
    proporcao: "3/2",
    // Ainda não há filmagem. O pôster carrega o herói sozinho, que é o caso
    // que este slot sempre precisou atender: a maioria dos visitantes nunca
    // vê o vídeo rodar.
    fontes: null,
    poster: "/marketing/heroi-1536.avif",
    posterSet: {
      base: "/marketing/heroi",
      larguras: [900, 1536],
      formatos: ["avif", "webp"],
    },
    altChave: "landing.screens.altHero",
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
    // A PROPORÇÃO VEM DA CAPTURA, e não o contrário. 16/10 era um palpite feito
    // antes de o ativo existir; a tela real é 1862x939, quase 2:1, porque é uma
    // janela de navegador em monitor largo — que é onde o painel vive. Cortar
    // 19% da largura para caber no palpite decepava a coluna de veículos, que é
    // metade do argumento desta seção.
    // A proporção é a do ARQUIVO ENTREGUE (1600x806), não a da origem: é a
    // caixa que o navegador reserva antes do byte chegar, e um desencontro
    // aqui é um salto de layout no meio da página.
    proporcao: "1600/806",
    src: "/marketing/painel-1600.avif",
    altChave: "landing.screens.altPanel",
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
    // Mesma regra do painel: a proporção é a do ARQUIVO ENTREGUE (780x1312),
    // vinda de um celular real, não o 39/80 teórico de um aparelho de catálogo.
    proporcao: "780/1312",
    src: "/marketing/app-780.avif",
    altChave: "landing.screens.altApp",
    maxKB: 140,
    formatos: ["avif", "webp"],
    larguraRef: 780,
    briefing:
      "Captura real do /driver em tela de celular, em uso, com a mão no " +
      "suporte do painel do carro se possível.",
  },
  pave: {
    id: "pave",
    tipo: "imagem",
    proporcao: "3/2",
    src: "/marketing/pave-1400.avif",
    altChave: "landing.screens.altPave",
    maxKB: 180,
    formatos: ["avif", "webp"],
    larguraRef: 1400,
    briefing:
      "Prova o argumento da seção: no pavé a prova deixa de ser um pelotão. " +
      "Precisa ter distância visível entre grupos.",
  },
} as const satisfies Record<string, Slot>;

export type SlotId = keyof typeof SLOTS;
