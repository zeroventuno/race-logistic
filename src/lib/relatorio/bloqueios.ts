import type { AmostraDePing } from "./serie";

/**
 * Quando cada ponto de bloqueio fechou e quando reabriu.
 *
 * ------------------------------------------------------------------------
 * FECHOU É A ABERTURA. REABRIU É O FECHAMENTO.
 *
 * Os dois carros de referência existem para isso e só para isso: o de abertura
 * fecha a rua e liga o cronômetro naquele ponto; o de fechamento reabre a rua e
 * para o cronômetro. É a mesma janela da seção do gráfico, amostrada por ponto
 * em vez de por tempo — a duração de um bloqueio É a janela naquele quilômetro.
 *
 * O QUE VEM DEPOIS DO FECHAMENTO NÃO ENTRA NESSA CONTA. Atrás dele ainda há
 * prova — motos de apoio, mecânicos, ambulâncias, e por último a vassoura, que
 * acompanha o último ciclista e recolhe quem abandona. Mas a rua já está aberta
 * ao trânsito. Numa prova amadora é normal ter muita gente pedalando com a rua
 * já liberada, e é justamente por isso que esses ciclistas precisam de apoio.
 *
 * ESTA VERSÃO JÁ ESTEVE ERRADA, com a vassoura no lugar do fechamento. O efeito
 * era duplo e todo ruim: inflava a duração declarada de cada bloqueio, e fazia
 * a coluna sair vazia sempre que não houvesse vassoura — quando o dado
 * necessário estava lá o tempo todo, no veículo de referência que toda prova
 * tem por obrigação.
 *
 * ------------------------------------------------------------------------
 * INTERPOLA, MAS NÃO EXTRAPOLA
 *
 * O veículo transmite a cada ~20 s e a passagem por um ponto quase nunca cai
 * exatamente num ping. Entre dois pings que cercam o ponto, a hora é
 * interpolada — é aritmética sobre duas observações, e é honesta.
 *
 * Fora do intervalo coberto, não. Se o rastro do veículo começa depois do
 * ponto ou termina antes dele, a resposta é "não apurado" e não uma projeção
 * pela velocidade média. A diferença importa: a primeira frase pode ser
 * conferida, a segunda é um palpite com cara de medida.
 */

export interface PontoDeBloqueio {
  id: string;
  offsetM: number;
  nome: string | null;
}

export interface BloqueioApurado extends PontoDeBloqueio {
  /** Epoch ms da passagem do carro de abertura. */
  fechouMs: number | null;
  /** Epoch ms da passagem do último veículo do comboio. */
  reabriuMs: number | null;
  /** Segundos entre as duas. Nulo se qualquer uma faltar. */
  duracaoS: number | null;
}

/**
 * Instante em que o veículo cruzou `offsetM`, ou `null`.
 *
 * Procura o PRIMEIRO cruzamento no sentido do avanço. Num percurso de várias
 * voltas o mesmo offset é cruzado mais de uma vez, e o que interessa para
 * "fechou" é a primeira passagem; para "reabriu", a última. Por isso o sentido
 * da busca é parâmetro.
 */
export function instanteDaPassagem(
  pings: AmostraDePing[],
  offsetM: number,
  qual: "primeira" | "ultima",
): number | null {
  if (pings.length < 2) return null;

  const indices =
    qual === "primeira"
      ? Array.from({ length: pings.length - 1 }, (_, i) => i)
      : Array.from({ length: pings.length - 1 }, (_, i) => pings.length - 2 - i);

  for (const i of indices) {
    const a = pings[i]!;
    const b = pings[i + 1]!;

    // Só cruzamentos para a frente. Um recuo — moto voltando para atender um
    // chamado — não é a passagem que fechou a rua.
    if (b.offsetAbsolutoM < a.offsetAbsolutoM) continue;

    if (offsetM >= a.offsetAbsolutoM && offsetM <= b.offsetAbsolutoM) {
      const vao = b.offsetAbsolutoM - a.offsetAbsolutoM;
      if (vao <= 0) return a.atMs;
      const fracao = (offsetM - a.offsetAbsolutoM) / vao;
      return a.atMs + (b.atMs - a.atMs) * fracao;
    }
  }

  return null;
}

export interface EntradaDeBloqueios {
  pontos: PontoDeBloqueio[];
  /** Rastro do carro de abertura: é a passagem dele que fecha a rua. */
  abertura: AmostraDePing[];
  /**
   * Rastro do carro de fechamento: é a passagem dele que reabre a rua.
   *
   * Vazio significa que o carro de fechamento não transmitiu, e a coluna de
   * reabertura sai vazia em vez de sair errada.
   */
  fechamento: AmostraDePing[];
}

export function apurarBloqueios(e: EntradaDeBloqueios): BloqueioApurado[] {
  return e.pontos
    .slice()
    .sort((a, b) => a.offsetM - b.offsetM)
    .map((p) => {
      const fechouMs = instanteDaPassagem(e.abertura, p.offsetM, "primeira");
      const reabriuMs = instanteDaPassagem(e.fechamento, p.offsetM, "ultima");

      return {
        ...p,
        fechouMs,
        reabriuMs,
        duracaoS:
          fechouMs !== null && reabriuMs !== null && reabriuMs >= fechouMs
            ? Math.round((reabriuMs - fechouMs) / 1000)
            : null,
      };
    });
}
