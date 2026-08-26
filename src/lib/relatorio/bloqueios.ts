import type { AmostraDePing } from "./serie";

/**
 * Quando cada ponto de bloqueio fechou e quando reabriu.
 *
 * ------------------------------------------------------------------------
 * FECHOU É A ABERTURA. REABRIU É A VASSOURA.
 *
 * Esta é a regra de domínio do arquivo inteiro e errá-la produziria um
 * documento que mente sobre segurança. A rua fecha quando o carro de abertura
 * passa. Mas ela NÃO reabre quando o carro de fechamento passa: atrás dele
 * ainda vem prova — motos de apoio, mecânicos, ambulâncias — e por último a
 * vassoura, que é quem recolhe quem abandonou. Quem devolve a rua ao trânsito
 * é o ÚLTIMO veículo do comboio.
 *
 * Um relatório que usasse o fechamento como reabertura declararia à prefeitura
 * uma rua liberada com ciclista ainda nela.
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
  /** Rastro do carro de abertura. */
  abertura: AmostraDePing[];
  /**
   * Rastro do ÚLTIMO veículo do comboio — a vassoura, quando existe.
   * Vazio significa que ninguém pôde ocupar esse papel, e a coluna de
   * reabertura sai vazia em vez de sair errada.
   */
  ultimo: AmostraDePing[];
}

export function apurarBloqueios(e: EntradaDeBloqueios): BloqueioApurado[] {
  return e.pontos
    .slice()
    .sort((a, b) => a.offsetM - b.offsetM)
    .map((p) => {
      const fechouMs = instanteDaPassagem(e.abertura, p.offsetM, "primeira");
      const reabriuMs = instanteDaPassagem(e.ultimo, p.offsetM, "ultima");

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
