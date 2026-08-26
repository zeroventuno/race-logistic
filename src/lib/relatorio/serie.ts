import { computeGap, type OffsetSample } from "@/lib/route/gap";

/**
 * A série histórica da janela, reconstruída depois da prova.
 *
 * ------------------------------------------------------------------------
 * POR QUE ISTO EXISTE, E NÃO SE LÊ `gap_snapshots`
 *
 * `gap_snapshots` é escrito pelo navegador do diretor: `useLiveState` chama o
 * endpoint enquanto a aba está aberta. O endpoint faz a coisa certa — recalcula
 * no servidor em vez de confiar no número que o browser mandou. Mas o DISPARO
 * ainda passa pelo browser, e notebook fechado, aba dormindo ou bateria
 * acabando param a gravação. Pior: o buraco resultante não fica marcado como
 * `insufficient_data`, fica SEM LINHA NENHUMA — indistinguível de um período
 * que não existiu.
 *
 * Para um painel ao vivo isso é aceitável. Para um documento que vai à
 * prefeitura, é onde ele quebra. Então o relatório não lê o histórico: ele o
 * RECONSTRÓI a partir de `location_pings`, que é registro do servidor e não
 * depende de ninguém estar olhando.
 *
 * ------------------------------------------------------------------------
 * O QUE NÃO PRECISA SER REFEITO
 *
 * `location_pings` já traz `route_offset_m`, `lap`, `snap_method` e
 * `snap_confidence`: a ancoragem foi feita na ingestão, no servidor, com o
 * índice espacial. Reancorar aqui seria refazer trabalho e — pior — abrir a
 * possibilidade de o relatório discordar do que o painel mostrou no dia.
 *
 * O que se refaz é só o `computeGap`, a mesma função que o painel usa. Assim o
 * relatório e a tela concordam por construção, não por coincidência.
 *
 * ------------------------------------------------------------------------
 * O RELATÓRIO MEDE ONDE O PAINEL SÓ CONSEGUE PROJETAR
 *
 * `computeGap` só devolve `measured` quando acha, no histórico do abertura, o
 * instante em que ele passou pelo ponto onde o fechamento está agora. Ao vivo
 * isso quase nunca acontece: o painel carrega poucos minutos de histórico, e
 * numa janela de 40 minutos o abertura passou por ali muito antes disso. O
 * `timeAtOffset` devolve `null` e o número cai para `projected` — estimado
 * pela velocidade do vassoura.
 *
 * O próprio comentário do `timeAtOffset` admite a causa: devolve nulo "quando
 * o histórico em memória não vai longe o bastante no passado".
 *
 * Aqui não existe essa limitação. O histórico é a prova inteira, do começo até
 * o instante calculado, então o cruzamento é encontrado de verdade e a janela
 * sai MEDIDA — diferença de horário entre duas passagens pelo mesmo ponto da
 * estrada, que é a definição literal do que a prefeitura autorizou.
 *
 * É a diferença entre um documento que estima e um que afere, e ela não custa
 * nada além de não truncar uma lista.
 *
 * ------------------------------------------------------------------------
 * A REGRA DA HONESTIDADE
 *
 * Cada ponto carrega o `method` que o `computeGap` devolveu. `measured`,
 * `projected` e `insufficient_data` são exibidos DIFERENTES no gráfico. A
 * tentação de interpolar os buracos para entregar uma curva bonita é o erro
 * mais caro possível aqui: um documento de prova vale pela credibilidade, e
 * credibilidade não é gradual.
 */

/** Um ping já ancorado, como sai de `location_pings`. */
export interface AmostraDePing {
  /** Relógio do dispositivo, epoch ms. Serve para ordenar. */
  atMs: number;
  /** Relógio do servidor quando o ping chegou, epoch ms. Mede idade. */
  receivedAtMs: number;
  /**
   * Metros percorridos de prova, contando voltas.
   * `lap × comprimento do traçado + route_offset_m`.
   */
  offsetAbsolutoM: number;
}

/**
 * A procedência de um ponto, no mesmo vocabulário que `gap_snapshots.method`
 * já grava. Não é invenção do relatório: é o que o sistema registra desde
 * sempre, e o documento herda em vez de criar dialeto próprio.
 *
 * O sufixo `_stale` existe porque a última posição conhecida NÃO EXPIRA
 * sozinha. Se o comboio para de transmitir, o `computeGap` continua achando o
 * cruzamento no histórico e devolvendo `measured` — sobre um veículo que pode
 * estar em qualquer lugar há horas. Sem esta distinção, o relatório
 * apresentaria posição congelada como medição, que é a mentira mais fácil de
 * cometer aqui e a mais cara de descobrir depois.
 */
export type Procedencia =
  | "measured"
  | "measured_stale"
  | "projected"
  | "projected_stale"
  | "insufficient_data"
  | "insufficient_data_stale";

export interface PontoDaSerie {
  atMs: number;
  gapM: number | null;
  gapSeconds: number | null;
  procedencia: Procedencia;
  leadOffsetM: number | null;
  sweepOffsetM: number | null;
  stale: boolean;
  /** A vassoura passou na frente do abertura — sempre erro operacional. */
  sweepAheadOfLead: boolean;
}

export interface EntradaDaSerie {
  lead: AmostraDePing[];
  sweep: AmostraDePing[];
  /** Distância total da PROVA: voltas × comprimento do traçado. */
  raceDistanceM: number;
  deMs: number;
  ateMs: number;
  /** Distância entre pontos da série. 30 s é o padrão. */
  passoMs?: number;
  staleThresholdMs?: number;
}

export interface ResumoDaSerie {
  pontos: PontoDaSerie[];
  /** Quantos pontos de cada procedência. É o que a legenda do gráfico explica. */
  porProcedencia: Record<Procedencia, number>;
  /** Só entre os pontos `measured` — os outros não sustentam afirmação. */
  gapSegundosMin: number | null;
  gapSegundosMax: number | null;
  gapSegundosMedio: number | null;
  /** Fração da prova em que houve medição de verdade, de 0 a 1. */
  coberturaMedida: number;
}

const PASSO_PADRAO_MS = 30_000;

/**
 * Reconstrói a série instante a instante.
 *
 * A varredura é de dois ponteiros sobre as duas listas de pings, já ordenadas —
 * cada amostra é visitada uma vez, não uma vez por instante da grade. Numa
 * prova de 6 h com passo de 30 s são 720 instantes contra ~2 200 pings; a
 * versão ingênua faria 1,5 milhão de comparações para chegar ao mesmo lugar.
 */
export function reconstruirSerie(entrada: EntradaDaSerie): ResumoDaSerie {
  const passoMs = entrada.passoMs ?? PASSO_PADRAO_MS;
  const lead = [...entrada.lead].sort((a, b) => a.atMs - b.atMs);
  const sweep = [...entrada.sweep].sort((a, b) => a.atMs - b.atMs);

  // Convertidos uma vez só. Dentro do laço cada instante recebe um PREFIXO
  // desta lista — o histórico até ali —, não uma cópia remontada ping a ping.
  const histLead = lead.map(paraAmostra);
  const histSweep = sweep.map(paraAmostra);

  const pontos: PontoDaSerie[] = [];
  let iLead = 0;
  let iSweep = 0;

  for (let t = entrada.deMs; t <= entrada.ateMs; t += passoMs) {
    while (iLead < lead.length && lead[iLead]!.atMs <= t) iLead++;
    while (iSweep < sweep.length && sweep[iSweep]!.atMs <= t) iSweep++;

    const r = computeGap({
      lead: veiculoEm(lead, histLead, iLead),
      sweep: veiculoEm(sweep, histSweep, iSweep),
      totalDistanceM: entrada.raceDistanceM,
      nowMs: t,
      staleThresholdMs: entrada.staleThresholdMs,
    });

    pontos.push({
      atMs: t,
      gapM: r.gapM,
      gapSeconds: r.gapSeconds,
      procedencia: (r.stale ? `${r.method}_stale` : r.method) as Procedencia,
      leadOffsetM: r.leadOffsetM,
      sweepOffsetM: r.sweepOffsetM,
      stale: r.stale,
      sweepAheadOfLead: r.sweepAheadOfLead,
    });
  }

  return resumir(pontos);
}

function paraAmostra(a: AmostraDePing): OffsetSample {
  return { offsetM: a.offsetAbsolutoM, atMs: a.atMs };
}

/**
 * O estado de um veículo no instante da grade, montado a partir do último ping
 * que já tinha chegado. `corte` é o índice do primeiro ping DEPOIS do instante.
 *
 * O histórico é o PREFIXO INTEIRO, não uma janela recente — ver a nota no topo
 * do arquivo. É o que permite ao `timeAtOffset` achar o cruzamento de verdade
 * e à janela sair medida em vez de projetada. Truncar aqui devolveria o
 * relatório à mesma cegueira do painel ao vivo.
 *
 * `rollingSpeedMps` pode receber a lista inteira sem risco: ela recorta a
 * própria janela de 180 s por dentro.
 *
 * Devolve `null` quando ainda não houve ping nenhum — e é isso que faz o
 * `computeGap` responder `insufficient_data` em vez de inventar posição. O
 * começo da prova, antes de os aparelhos vincularem, aparece no gráfico como
 * ausência declarada, que é como deve aparecer.
 */
function veiculoEm(
  amostras: AmostraDePing[],
  historico: OffsetSample[],
  corte: number,
) {
  if (corte === 0) return null;

  const ultima = amostras[corte - 1]!;

  return {
    offsetM: ultima.offsetAbsolutoM,
    atMs: ultima.atMs,
    receivedAtMs: ultima.receivedAtMs,
    history: historico.slice(0, corte),
  };
}

function resumir(pontos: PontoDaSerie[]): ResumoDaSerie {
  const porProcedencia: Record<Procedencia, number> = {
    measured: 0,
    measured_stale: 0,
    projected: 0,
    projected_stale: 0,
    insufficient_data: 0,
    insufficient_data_stale: 0,
  };
  for (const p of pontos) porProcedencia[p.procedencia]++;

  // SÓ OS MEDIDOS ENTRAM NA ESTATÍSTICA. Um mínimo de janela calculado em cima
  // de pontos projetados seria um número que ninguém observou, apresentado
  // como se tivesse sido observado — exatamente o que este relatório não faz.
  const medidos = pontos
    .filter((p) => p.procedencia === "measured" && p.gapSeconds !== null)
    .map((p) => p.gapSeconds!);

  return {
    pontos,
    porProcedencia,
    gapSegundosMin: medidos.length ? Math.min(...medidos) : null,
    gapSegundosMax: medidos.length ? Math.max(...medidos) : null,
    gapSegundosMedio: medidos.length
      ? Math.round(medidos.reduce((s, v) => s + v, 0) / medidos.length)
      : null,
    coberturaMedida: pontos.length ? porProcedencia.measured / pontos.length : 0,
  };
}
