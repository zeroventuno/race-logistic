import "server-only";

import type { RouteTrack } from "@/lib/route/track";

/**
 * Detecção de cruzamentos ao longo do percurso, via OpenStreetMap.
 *
 * ------------------------------------------------------------------------
 * NUNCA DERRUBA A IMPORTAÇÃO DO PERCURSO
 *
 * Esta é a regra que manda em tudo aqui. O Overpass é um serviço público,
 * gratuito, sem contrato e frequentemente sobrecarregado — ele vai estar fora
 * do ar num dia em que alguém está cadastrando uma prova. O percurso é o
 * essencial; o ponto de bloqueio é acabamento.
 *
 * Toda falha devolve lista vazia: o percurso entra, o relatório sai com
 * quilômetro em vez de nome de rua, e ninguém fica sem cadastrar prova porque
 * um servidor de terceiro caiu.
 *
 * ------------------------------------------------------------------------
 * A VARREDURA É INCREMENTAL, PORQUE O SERVIÇO NÃO AGUENTA DE UMA VEZ
 *
 * Medido contra o Overpass público, num percurso real de 110 km: a consulta
 * inteira num pedido devolve 504. Fatiada em 14 lotes e disparada em paralelo,
 * 23 de 30 lotes falham — o serviço limita requisições simultâneas por IP.
 * Sequencial, 7 lotes levam 66 s e 3 falham mesmo assim.
 *
 * Não adianta insistir: é um serviço gratuito, sem contrato, e a resposta certa
 * é caber nele em vez de brigar. Cada chamada varre o que der dentro de um
 * orçamento de tempo, começando de onde a última parou, e devolve até onde
 * chegou. Tocar de novo continua dali.
 *
 * Isso combina com o que a lista é: rascunho para a direção podar. Meia lista
 * hoje e o resto amanhã não atrapalha ninguém — e o relatório sai com
 * quilômetro onde faltar nome.
 *
 * ------------------------------------------------------------------------
 * CORREDOR AO LONGO DA ROTA, NÃO A CAIXA ENVOLVENTE
 *
 * A primeira versão consultava a *bbox* do percurso. Numa prova de 110 km isso
 * é uma caixa de dezenas de quilômetros de lado, com cidades inteiras dentro —
 * milhares de cruzamentos que a prova nunca vai passar perto.
 *
 * `around` com a lista de coordenadas da rota devolve só o que está a poucos
 * metros da estrada percorrida. É a diferença entre uma consulta que responde
 * em segundos e uma que o Overpass recusa por tamanho.
 *
 * ------------------------------------------------------------------------
 * O CRUZAMENTO É CONTADO AQUI, NÃO LÁ
 *
 * Pedir ao Overpass que ele mesmo filtre nós compartilhados exige `foreach` com
 * avaliadores de contagem — sintaxe frágil que falhou em silêncio na primeira
 * tentativa. Trazer as vias com seus nós e contar em JavaScript é mais dado na
 * rede e muito menos coisa para dar errado.
 *
 * E o nome sai melhor: um nó de cruzamento quase nunca tem nome próprio, mas as
 * vias que se encontram nele têm. "Via Roma × Via Savona" é o que o fiscal
 * reconhece; o nome do nó seria vazio.
 */

export interface CruzamentoDetectado {
  /** Distância ao longo do percurso, em metros. */
  offsetM: number;
  /** Montado a partir das vias que se cruzam. */
  nome: string | null;
}

export interface VarreduraDeCruzamentos {
  cruzamentos: CruzamentoDetectado[];
  /** Até que quilometragem do percurso a varredura chegou. */
  ateOffsetM: number;
  /** Chegou ao fim do percurso? */
  completo: boolean;
  /** Lotes que o serviço recusou. Vai para a tela, não para o silêncio. */
  falhas: number;
}

export interface OpcoesDaVarredura {
  /** Retomar a partir daqui. */
  desdeOffsetM?: number;
  /** Teto de tempo. O padrão cabe folgado no limite de uma função da Vercel. */
  orcamentoMs?: number;
}

const OVERPASS = "https://overpass-api.de/api/interpreter";

/**
 * O Overpass responde 406 a requisição sem agente identificado — foi o que
 * fez a primeira versão devolver zero cruzamentos em 227 ms, silenciosamente.
 * A política do serviço pede que quem consome se identifique.
 */
const AGENTE = "FlammeRouge/1.0 (https://flammerouge.org)";

const VIAS =
  "^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street)$";

/**
 * Largura do corredor. Generosa de propósito: entre dois pontos amostrados a
 * rota é uma corda reta, e numa curva fechada a estrada real se afasta dessa
 * corda. 60 m absorve isso sem começar a pegar a rua paralela.
 */
const CORREDOR_M = 60;

/** Um cruzamento a menos disto do traçado conta como sendo dele. */
const RAIO_M = 30;

/** Cruzamentos mais próximos que isto são o mesmo cruzamento. */
const AGRUPAR_M = 60;

/** Espaçamento da amostragem da rota que vai na consulta. */
const AMOSTRA_M = 300;

/**
 * Coordenadas por lote.
 *
 * 40 estourou o servidor num trecho urbano; 25 passa. O custo do `around`
 * cresce com o número de pontos vezes a densidade de vias, e cidade é onde as
 * duas coisas são grandes ao mesmo tempo.
 */
const COORDS_POR_LOTE = 25;

const TIMEOUT_MS = 25_000;

/** Teto de tempo da varredura inteira. Cabe no limite de uma função. */
const ORCAMENTO_MS = 45_000;

/** Respiro entre lotes. Serviço gratuito não se martela. */
const PAUSA_MS = 250;

/** Acima disto a tela vira lista infinita e ninguém poda nada. */
const TETO = 300;

/** Um ponto da rota já preparado para a consulta. */
interface Amostra {
  lat: number;
  lng: number;
  offsetM: number;
}

interface ElementoOverpass {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  nodes?: number[];
  tags?: Record<string, string>;
}

export async function detectarCruzamentos(
  track: RouteTrack,
  opts: OpcoesDaVarredura = {},
): Promise<VarreduraDeCruzamentos> {
  const desde = opts.desdeOffsetM ?? 0;
  const orcamento = opts.orcamentoMs ?? ORCAMENTO_MS;
  const comeco = Date.now();

  const amostra = amostrarRota(track).filter((p) => p.offsetM >= desde);

  if (amostra.length < 2) {
    return {
      cruzamentos: [],
      ateOffsetM: track.totalDistanceM,
      completo: true,
      falhas: 0,
    };
  }

  // Lotes com uma coordenada de sobreposição: sem ela, a emenda entre dois
  // lotes fica fora de qualquer corredor, e some justamente o cruzamento que
  // calha de estar ali.
  const lotes: Amostra[][] = [];
  for (let i = 0; i < amostra.length; i += COORDS_POR_LOTE - 1) {
    lotes.push(amostra.slice(i, i + COORDS_POR_LOTE));
  }

  const elementos: ElementoOverpass[] = [];
  let falhas = 0;
  let ateOffsetM = desde;
  let completo = true;

  for (const lote of lotes) {
    if (Date.now() - comeco > orcamento) {
      completo = false;
      break;
    }

    const achou = await umLote(lote);
    if (achou === null) falhas++;
    else elementos.push(...achou);

    ateOffsetM = lote[lote.length - 1]!.offsetM;
    await pausa(PAUSA_MS);
  }

  return {
    cruzamentos: extrair(elementos, track),
    ateOffsetM,
    completo,
    falhas,
  };
}

/** Um lote. `null` quando o serviço recusou — nunca lança. */
async function umLote(lote: Amostra[]): Promise<ElementoOverpass[] | null> {
  const coords = lote.map((p) => `${p.lat},${p.lng}`).join(",");

  const consulta = `[out:json][timeout:${Math.round(TIMEOUT_MS / 1000)}];
way["highway"~"${VIAS}"](around:${CORREDOR_M},${coords});
out body;
>;
out skel qt;`;

  try {
    const resposta = await fetch(OVERPASS, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": AGENTE,
      },
      body: `data=${encodeURIComponent(consulta)}`,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!resposta.ok) return null;

    const dados = (await resposta.json()) as { elements?: ElementoOverpass[] };
    return dados.elements ?? [];
  } catch {
    return null;
  }
}

function pausa(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function extrair(
  elementos: ElementoOverpass[],
  track: RouteTrack,
): CruzamentoDetectado[] {
  const vias = elementos.filter((e) => e.type === "way");
  const nos = new Map<number, { lat: number; lon: number }>();

  for (const e of elementos) {
    if (e.type === "node" && typeof e.lat === "number" && typeof e.lon === "number") {
      nos.set(e.id, { lat: e.lat, lon: e.lon });
    }
  }

  // Nó → nomes das vias que passam por ele. O `Set` de nomes é o que decide se
  // é cruzamento de verdade: duas vias com o MESMO nome que se tocam são a
  // mesma rua partida em dois trechos pelo editor do OSM, não uma esquina.
  const porNo = new Map<number, { vias: number; nomes: Set<string> }>();

  for (const v of vias) {
    const nome = v.tags?.name;
    for (const id of v.nodes ?? []) {
      const atual = porNo.get(id) ?? { vias: 0, nomes: new Set<string>() };
      atual.vias++;
      if (nome) atual.nomes.add(nome);
      porNo.set(id, atual);
    }
  }

  const brutos: CruzamentoDetectado[] = [];

  for (const [id, info] of porNo) {
    if (info.vias < 2) continue;

    // Duas vias com um nome só entre elas é continuação, não cruzamento.
    if (info.nomes.size === 1 && info.vias === 2) continue;

    const no = nos.get(id);
    if (!no) continue;

    const offsetM = offsetSeProximo(track, no.lat, no.lon);
    if (offsetM === null) continue;

    const nomes = [...info.nomes];
    brutos.push({
      offsetM,
      nome: nomes.length === 0 ? null : nomes.slice(0, 3).join(" × "),
    });
  }

  return agrupar(brutos);
}

/**
 * A rota reduzida a uma polilinha que cabe na consulta.
 *
 * Amostragem por DISTÂNCIA e não por índice: um GPX pode ter pontos densos na
 * cidade e esparsos na estrada, e pular de N em N deixaria buracos justamente
 * onde a estrada é reta e longa.
 */
function amostrarRota(track: RouteTrack): Amostra[] {
  const saida: Amostra[] = [];
  let proximo = 0;

  for (const [lng, lat, offset] of track.points) {
    if (offset >= proximo) {
      saida.push({ lat: arredondar(lat), lng: arredondar(lng), offsetM: offset });
      proximo = offset + AMOSTRA_M;
    }
  }

  const ultimo = track.points[track.points.length - 1];
  if (ultimo) {
    saida.push({
      lat: arredondar(ultimo[1]),
      lng: arredondar(ultimo[0]),
      offsetM: ultimo[2],
    });
  }

  return saida;
}

/** Seis casas são ~11 cm. Mais que isso só engorda a consulta. */
function arredondar(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * O offset do ponto do traçado mais próximo, se estiver dentro do raio.
 *
 * Varredura simples sobre os pontos do percurso. Não usa o `RouteIndex` porque
 * isto roda uma vez no cadastro, fora de qualquer caminho quente, e a grade
 * espacial existe para responder milhares de vezes por prova — não uma.
 */
function offsetSeProximo(
  track: RouteTrack,
  lat: number,
  lng: number,
): number | null {
  let melhorD2 = Infinity;
  let melhorOffset = 0;

  // Aproximação plana: a poucos metros de escala a curvatura não muda nada, e
  // um cosseno por ponto sobre milhares de pontos custa mais que o erro vale.
  const cos = Math.cos((lat * Math.PI) / 180);

  for (const [pLng, pLat, offset] of track.points) {
    const dx = (pLng - lng) * cos * 111_320;
    const dy = (pLat - lat) * 110_540;
    const d2 = dx * dx + dy * dy;

    if (d2 < melhorD2) {
      melhorD2 = d2;
      melhorOffset = offset;
    }
  }

  return Math.sqrt(melhorD2) <= RAIO_M ? melhorOffset : null;
}

/**
 * Junta cruzamentos vizinhos.
 *
 * Uma rotatória é meia dúzia de nós no OSM, e uma esquina com canteiro são
 * dois. Para quem bloqueia a rua é um lugar só e uma pessoa só. O nome que
 * sobrevive é o primeiro que existir — sem nome nenhum, o relatório imprime o
 * quilômetro.
 */
function agrupar(brutos: CruzamentoDetectado[]): CruzamentoDetectado[] {
  const ordenados = brutos.slice().sort((a, b) => a.offsetM - b.offsetM);
  const saida: CruzamentoDetectado[] = [];

  for (const c of ordenados) {
    const anterior = saida[saida.length - 1];

    if (anterior && c.offsetM - anterior.offsetM < AGRUPAR_M) {
      if (!anterior.nome && c.nome) anterior.nome = c.nome;
      continue;
    }

    saida.push({ ...c });
    if (saida.length >= TETO) break;
  }

  return saida;
}
