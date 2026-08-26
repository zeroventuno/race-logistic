import type { PontoDaSerie, Procedencia } from "./serie";

/**
 * A geometria do gráfico da janela.
 *
 * Função pura, sem React e sem PDF: recebe a série e devolve coordenadas. É
 * testável assim, e o desenho passa a ser um detalhe de apresentação em vez de
 * um lugar onde a verdade pode se perder.
 *
 * ------------------------------------------------------------------------
 * A LINHA É QUEBRADA POR PROCEDÊNCIA, e este é o ponto do arquivo inteiro.
 *
 * Uma linha contínua diria que a janela foi medida o tempo todo. Ela não foi:
 * parte é medida, parte é estimada pela velocidade, e parte não existe. Ligar
 * tudo com o mesmo traço seria transformar três coisas diferentes numa só,
 * exatamente na página que a autoridade de trânsito vai olhar.
 *
 * Então a série vira VÁRIOS segmentos, cada um com sua procedência, e o
 * desenho dá traço próprio a cada uma. Onde não há dado não há linha — o
 * buraco fica visível, que é o comportamento correto.
 */

/**
 * Três traços, não seis.
 *
 * A série distingue seis procedências, mas o gráfico só precisa de três
 * respostas visuais: isto foi medido, isto foi deduzido, e aqui não havia
 * dado. Dar traço próprio a cada sufixo transformaria a legenda num glossário
 * — e a legenda é lida por alguém que quer saber se a rua abriu na hora.
 *
 * Posição velha entra junto com estimativa de propósito: das duas o leitor
 * precisa saber a mesma coisa, que ali o número não foi observado.
 */
export type TracoDoGrafico = "medido" | "deduzido";

export interface SegmentoDoGrafico {
  /** `d` de um `<Path>`. */
  d: string;
  traco: TracoDoGrafico;
}

export function tracoDe(p: Procedencia): TracoDoGrafico | null {
  if (p === "measured") return "medido";
  if (p === "insufficient_data" || p === "insufficient_data_stale") return null;
  return "deduzido";
}

export interface FaixaAutorizada {
  y: number;
  altura: number;
  /** Rótulo do limite de cima, em minutos. */
  maxMin: number;
  minMin: number;
}

export interface MarcaDeEixo {
  pos: number;
  rotulo: string;
}

export interface GraficoDaJanela {
  largura: number;
  altura: number;
  segmentos: SegmentoDoGrafico[];
  faixa: FaixaAutorizada | null;
  /** Trechos em que a janela passou do autorizado. Coordenadas de retângulo. */
  estouros: { x: number; largura: number }[];
  marcasY: MarcaDeEixo[];
  marcasX: MarcaDeEixo[];
  /** Máximo do eixo vertical, em minutos. */
  tetoMin: number;
  /** Houve ao menos um ponto desenhável? */
  temLinha: boolean;
}

export interface OpcoesDoGrafico {
  largura?: number;
  altura?: number;
  janelaAlvoMin?: number | null;
  janelaMinMin?: number | null;
  janelaMaxMin?: number | null;
  /** Formata o rótulo do eixo do tempo. Injetado para o fuso da prova. */
  formatarHora?: (ms: number) => string;
}

const LARGURA = 520;
const ALTURA = 190;

export function montarGrafico(
  pontos: PontoDaSerie[],
  opts: OpcoesDoGrafico = {},
): GraficoDaJanela {
  const largura = opts.largura ?? LARGURA;
  const altura = opts.altura ?? ALTURA;

  const comValor = pontos.filter((p) => p.gapSeconds !== null);

  const limiteAutorizado =
    opts.janelaMaxMin ?? opts.janelaAlvoMin ?? null;

  /*
   * O TETO NUNCA ESCONDE UM ESTOURO.
   *
   * Escalar pelo maior valor observado faria um estouro de 90 min encostar no
   * topo e parecer normal; escalar só pelo autorizado cortaria a linha fora do
   * quadro. O teto é o maior dos dois, com folga — assim o limite autorizado
   * fica sempre visível E a linha cabe, que é a única forma de a distância
   * entre os dois ser lida de relance.
   */
  const maiorObservadoMin = comValor.length
    ? Math.max(...comValor.map((p) => p.gapSeconds! / 60))
    : 0;

  const tetoMin = Math.max(
    10,
    Math.ceil((Math.max(maiorObservadoMin, limiteAutorizado ?? 0) * 1.15) / 5) * 5,
  );

  const t0 = pontos[0]?.atMs ?? 0;
  const t1 = pontos.at(-1)?.atMs ?? t0 + 1;
  const spanMs = Math.max(1, t1 - t0);

  const x = (ms: number) => ((ms - t0) / spanMs) * largura;
  const y = (min: number) => altura - (min / tetoMin) * altura;

  // --- a linha, quebrada por procedência -----------------------------------
  //
  // O acumulador é feito de variáveis simples e a função de fechamento recebe
  // tudo por parâmetro, em vez de capturar e mutar o que está em volta. Uma
  // closure que zera a própria variável que lê deixa o TypeScript sem
  // conseguir estreitar o tipo, e o código passa a precisar de `!` para
  // convencer o compilador de coisas que ele deveria enxergar sozinho.
  const segmentos: SegmentoDoGrafico[] = [];
  let metodo: TracoDoGrafico | null = null;
  let pts: string[] = [];

  const fechar = (m: TracoDoGrafico | null, p: string[]) => {
    if (m !== null && p.length >= 2) {
      segmentos.push({ d: `M ${p.join(" L ")}`, traco: m });
    }
  };

  for (const p of pontos) {
    const traco = tracoDe(p.procedencia);

    if (p.gapSeconds === null || traco === null) {
      fechar(metodo, pts);
      metodo = null;
      pts = [];
      continue;
    }

    const coord = `${round(x(p.atMs))} ${round(y(p.gapSeconds / 60))}`;

    if (metodo === null) {
      metodo = traco;
      pts = [coord];
      continue;
    }

    if (metodo !== traco) {
      // O ponto de virada entra nos DOIS segmentos, senão a troca de
      // procedência abre uma falha branca de um passo no meio da linha — que
      // o leitor entenderia como ausência de dado, e não é.
      const emenda = pts[pts.length - 1];
      fechar(metodo, pts);
      metodo = traco;
      pts = emenda === undefined ? [coord] : [emenda, coord];
      continue;
    }

    pts.push(coord);
  }
  fechar(metodo, pts);

  // --- estouros ------------------------------------------------------------
  const estouros: { x: number; largura: number }[] = [];
  if (limiteAutorizado !== null) {
    let inicio: number | null = null;

    for (const p of pontos) {
      const fora =
        p.gapSeconds !== null && p.gapSeconds / 60 > limiteAutorizado;

      if (fora && inicio === null) inicio = p.atMs;
      if (!fora && inicio !== null) {
        estouros.push({ x: round(x(inicio)), largura: round(x(p.atMs) - x(inicio)) });
        inicio = null;
      }
    }
    if (inicio !== null) {
      estouros.push({ x: round(x(inicio)), largura: round(largura - x(inicio)) });
    }
  }

  // --- faixa autorizada ----------------------------------------------------
  const faixa =
    opts.janelaMinMin != null && opts.janelaMaxMin != null
      ? {
          y: round(y(opts.janelaMaxMin)),
          altura: round(y(opts.janelaMinMin) - y(opts.janelaMaxMin)),
          maxMin: opts.janelaMaxMin,
          minMin: opts.janelaMinMin,
        }
      : opts.janelaAlvoMin != null
        ? {
            // Sem mínimo e máximo declarados, o alvo vira uma linha fina em vez
            // de uma faixa inventada. Desenhar largura que ninguém autorizou
            // seria o relatório afirmando por conta própria.
            y: round(y(opts.janelaAlvoMin)),
            altura: 0,
            maxMin: opts.janelaAlvoMin,
            minMin: opts.janelaAlvoMin,
          }
        : null;

  // --- eixos ---------------------------------------------------------------
  const marcasY: MarcaDeEixo[] = [];
  const passoY = tetoMin <= 30 ? 5 : tetoMin <= 90 ? 15 : 30;
  for (let m = 0; m <= tetoMin; m += passoY) {
    marcasY.push({ pos: round(y(m)), rotulo: `${m}` });
  }

  const formatar = opts.formatarHora ?? horaCurta;
  const marcasX: MarcaDeEixo[] = [];
  const quantasX = 5;
  for (let i = 0; i <= quantasX; i++) {
    const ms = t0 + (spanMs * i) / quantasX;
    marcasX.push({ pos: round(x(ms)), rotulo: formatar(ms) });
  }

  return {
    largura,
    altura,
    segmentos,
    faixa,
    estouros,
    marcasY,
    marcasX,
    tetoMin,
    temLinha: segmentos.length > 0,
  };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function horaCurta(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}
