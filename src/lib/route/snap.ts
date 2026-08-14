/**
 * Ancoragem de um ponto de GPS ao percurso ("snap").
 *
 * Parece trivial — achar o segmento mais próximo — e não é. O caso que quebra
 * a versão ingênua é o percurso que passa perto de si mesmo: ida e volta pela
 * mesma estrada, uma alça, um grampo de montanha. O segmento geometricamente
 * mais próximo pode ser o da perna errada, e aí a posição do veículo na prova
 * salta 8 km num único ping, o gap entre abertura e fechamento vira lixo e o
 * dashboard mente para o diretor no pior momento possível.
 *
 * A solução é *continuidade*: sabendo onde o veículo estava e há quanto tempo,
 * só é fisicamente possível que ele esteja dentro de uma janela de percurso.
 * Buscamos primeiro dentro dessa janela. A busca global existe só como rede de
 * segurança — primeiro ping da sessão, ou veículo que sumiu tempo demais para
 * a janela ainda significar alguma coisa.
 *
 * LIMITAÇÃO CONHECIDA: este modelo assume percurso ponto-a-ponto (largada →
 * chegada), que é o caso das provas de estrada com carro de abertura e
 * vassoura. Circuito com várias voltas sobre o mesmo traçado precisaria de
 * contagem de voltas, que não está implementada.
 */

import { haversineMeters, projectPointOnSegment, type LatLng } from "@/lib/geo/distance";
import { findSegmentIndex, type RouteIndex, type RouteTrack } from "@/lib/route/track";

export interface SnapPrevious {
  offsetM: number;
  /** Epoch em ms do ping anterior. */
  recordedAtMs: number;
  /**
   * Velocidade ao longo do percurso no ping anterior, em m/s.
   *
   * FORNEÇA ISTO. Sem velocidade, o modelo de movimento assume que o veículo
   * está parado, e num trecho onde o percurso entra e volta pela mesma via a
   * posição estimada fica sistematicamente para trás — o erro se acumula ping
   * a ping até a geometria voltar a distinguir os sentidos. Medido num
   * percurso real: 11 pings em 1525 com erro acima de 100 m, chegando a 537 m,
   * todos concentrados num único trecho de retorno. Com a velocidade
   * informada, o mesmo trecho passa sem erro perceptível.
   *
   * O valor pode vir de `speed_mps` do próprio GPS ou de
   * `rolling_speed_mps` de `position_state`.
   */
  speedMps?: number | null;
  /**
   * Volta em que o veículo estava (0 = primeira). Só usado em circuito.
   * Sem isto, um veículo na segunda volta é indistinguível de um na primeira.
   */
  lap?: number;
}

export interface SnapOptions {
  previous?: SnapPrevious | null;
  /** Epoch em ms do ping sendo ancorado. */
  recordedAtMs: number;
  /**
   * Velocidade recente do veículo ao longo do percurso, se conhecida.
   * Alimenta o modelo de movimento: sabendo que o veículo vinha a 12 m/s há
   * 3 s, sabemos que ele avançou ~36 m, e isso desempata geometrias que a
   * distância perpendicular sozinha não distingue.
   */
  expectedSpeedMps?: number | null;
  /** Precisão informada pelo GPS neste ping, em metros. */
  accuracyM?: number | null;
  /**
   * Velocidade máxima plausível de um veículo de apoio, em m/s.
   * 45 m/s = 162 km/h — folgado de propósito: melhor a janela ser larga demais
   * do que travar um veículo que realmente acelerou numa descida.
   */
  maxSpeedMps?: number;
  /** Quanto o veículo pode ter recuado desde o último ping (moto voltando). */
  maxBacktrackM?: number;
  /** Acima disto, o resultado da janela é considerado ruim. */
  windowAcceptThresholdM?: number;
  /** Acima disto o veículo é marcado como fora do percurso. */
  offRouteThresholdM?: number;
  /** Idade do ping anterior a partir da qual a janela perde sentido. */
  staleAfterMs?: number;
}

export type SnapMethod =
  | "window"
  | "global"
  | "global_recovery"
  | "window_low_confidence";

export interface SnapResult {
  /** Posição dentro de UMA volta do traçado, em metros. */
  offsetM: number;
  /** Volta atual (0 = primeira). Sempre 0 em percurso ponto-a-ponto. */
  lap: number;
  /**
   * Metros percorridos de prova contando as voltas: `lap × total + offsetM`.
   *
   * É ESTE o número que o cálculo de janela e a sugestão de apoio devem usar.
   * Usar `offsetM` num circuito compara a segunda volta com a primeira e
   * produz respostas confiantes e erradas.
   */
  absoluteOffsetM: number;
  /** Distância perpendicular do GPS ao percurso. */
  snapDistanceM: number;
  point: LatLng;
  segmentIndex: number;
  offRoute: boolean;
  method: SnapMethod;
  confidence: "high" | "medium" | "low";
  /**
   * O traçado passa por aqui em mais de um ponto a distâncias
   * estatisticamente iguais, e a escolha foi por desempate, não por geometria.
   * O consumidor precisa saber que este número pode estar a quilômetros do
   * certo mesmo com a distância perpendicular pequena.
   */
  ambiguous: boolean;
}

const DEFAULTS = {
  maxSpeedMps: 45,
  maxBacktrackM: 400,
  windowAcceptThresholdM: 120,
  offRouteThresholdM: 250,
  staleAfterMs: 10 * 60 * 1000,
  /** Piso da janela para frente, para o veículo parado não ficar preso. */
  minForwardWindowM: 250,
} as const;

/**
 * Incerteza de velocidade do modelo de movimento, em m/s.
 *
 * 8 m/s ≈ 29 km/h: um veículo de apoio pode acelerar ou parar bastante entre
 * dois pings. Generoso de propósito — o termo de movimento existe para
 * desempatar geometrias ambíguas, não para forçar o veículo a seguir uma
 * previsão.
 */
const SPEED_UNCERTAINTY_MPS = 8;

/** Piso da incerteza de movimento: nunca confiar cegamente na previsão. */
const MIN_MOTION_SIGMA_M = 60;

/**
 * Piso da incerteza de GPS. Aparelho que reporta precisão de 3 m ainda erra
 * mais que isso sob copa de árvore ou em vale fechado.
 */
const MIN_GPS_SIGMA_M = 12;

interface Candidate {
  segmentIndex: number;
  /** Posição dentro de uma volta do traçado. */
  offsetM: number;
  lap: number;
  /** `lap × total + offsetM`. É nesta escala que os custos são comparados. */
  absoluteOffsetM: number;
  distanceM: number;
  point: LatLng;
  /** Havia outra passagem estatisticamente empatada com esta. */
  ambiguous: boolean;
}

export function snapToRoute(
  index: RouteIndex,
  p: LatLng,
  opts: SnapOptions,
): SnapResult {
  const track = index.track;
  const maxSpeedMps = opts.maxSpeedMps ?? DEFAULTS.maxSpeedMps;
  const maxBacktrackM = opts.maxBacktrackM ?? DEFAULTS.maxBacktrackM;
  const windowAccept = opts.windowAcceptThresholdM ?? DEFAULTS.windowAcceptThresholdM;
  const offRouteThreshold = opts.offRouteThresholdM ?? DEFAULTS.offRouteThresholdM;
  const staleAfterMs = opts.staleAfterMs ?? DEFAULTS.staleAfterMs;

  // Entrada não confiável vinda de JSON de dispositivo: um NaN atravessando
  // silenciosamente faz `offRoute` virar false (NaN > x é false) e o veículo
  // passa como se estivesse sobre o percurso. Melhor recusar aqui.
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) {
    throw new SnapInputError(
      "Coordenada inválida: lat e lng precisam ser números finitos.",
    );
  }

  const previous = opts.previous ?? null;
  const previousLap = previous?.lap ?? 0;
  const elapsedMs = previous ? opts.recordedAtMs - previous.recordedAtMs : Infinity;

  // Janela só vale se o ping anterior for recente e não vier do futuro
  // (relógio do celular adiantado produz elapsed negativo).
  const windowUsable =
    previous !== null && elapsedMs >= 0 && elapsedMs <= staleAfterMs;

  const globalBest = searchGlobal(index, p, previousLap);

  if (!windowUsable) {
    // Sem continuidade num circuito não há como saber a volta: o mesmo ponto
    // do mapa serve a todas elas. Marcamos como ambíguo em vez de fingir.
    const ambiguousLap = track.isLoop;
    return finalize(
      globalBest,
      "global",
      offRouteThreshold,
      track,
      previous === null ? "medium" : "low",
      ambiguousLap,
    );
  }

  const elapsedSec = elapsedMs / 1000;
  const forward = Math.max(DEFAULTS.minForwardWindowM, elapsedSec * maxSpeedMps);

  const previousAbsolute = previousLap * track.totalDistanceM + previous!.offsetM;

  const expectedSpeedMps = opts.expectedSpeedMps ?? previous!.speedMps ?? 0;

  const sigmaGpsM = Math.max(
    MIN_GPS_SIGMA_M,
    Number.isFinite(opts.accuracyM ?? 0) ? (opts.accuracyM ?? 0) : 0,
  );

  const windowBest = searchAbsoluteWindow(
    track,
    p,
    previousAbsolute - maxBacktrackM,
    previousAbsolute + forward,
    {
      expectedOffsetM: previousAbsolute + expectedSpeedMps * elapsedSec,
      sigmaMotionM: Math.max(
        MIN_MOTION_SIGMA_M,
        elapsedSec * SPEED_UNCERTAINTY_MPS,
      ),
      sigmaGpsM,
    },
  );

  if (!windowBest) {
    return finalize(globalBest, "global_recovery", offRouteThreshold, track, "low");
  }

  if (windowBest.distanceM <= windowAccept) {
    return finalize(windowBest, "window", offRouteThreshold, track, "high");
  }

  // A janela não achou nada bom. Se a busca global achou algo muito melhor, o
  // veículo provavelmente teleportou — ficou sem sinal mais tempo do que o
  // `recorded_at` sugere, ou foi transportado. Aceitar o global aqui é o que
  // faz o veículo reaparecer no lugar certo depois de um buraco de cobertura.
  if (globalBest && globalBest.distanceM * 2 < windowBest.distanceM) {
    return finalize(globalBest, "global_recovery", offRouteThreshold, track, "low");
  }

  // Nem janela nem global convencem: o veículo está genuinamente fora do
  // percurso (desvio, apoio indo buscar alguém numa transversal). Mantemos o
  // resultado da janela porque a continuidade ainda é a melhor pista, mas
  // marcamos confiança baixa para o dashboard poder sinalizar.
  return finalize(windowBest, "window_low_confidence", offRouteThreshold, track, "low");
}

export class SnapInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SnapInputError";
  }
}

function finalize(
  c: Candidate | null,
  method: SnapMethod,
  offRouteThreshold: number,
  track: RouteTrack,
  confidence: SnapResult["confidence"],
  forceAmbiguous = false,
): SnapResult {
  if (!c) {
    // Só acontece se o percurso estiver vazio, o que buildRouteTrack impede.
    return {
      offsetM: 0,
      lap: 0,
      absoluteOffsetM: 0,
      snapDistanceM: Infinity,
      point: { lat: track.points[0]?.[1] ?? 0, lng: track.points[0]?.[0] ?? 0 },
      segmentIndex: 0,
      offRoute: true,
      method,
      confidence: "low",
      ambiguous: true,
    };
  }

  const offRoute = c.distanceM > offRouteThreshold;
  const ambiguous = c.ambiguous || forceAmbiguous;

  // Ambiguidade rebaixa a confiança independentemente da distância
  // perpendicular. Era esta a lacuna que fazia um erro de quilômetros ser
  // rotulado igual a um snap perfeito: `finalize` só rebaixava quando o
  // veículo estava fora do percurso, e no caso ambíguo ele está EM CIMA do
  // percurso — só que possivelmente no trecho errado.
  let finalConfidence = confidence;
  if (offRoute && finalConfidence === "high") finalConfidence = "medium";
  if (ambiguous && finalConfidence !== "low") finalConfidence = "low";

  return {
    offsetM: c.offsetM,
    lap: c.lap,
    absoluteOffsetM: c.absoluteOffsetM,
    snapDistanceM: c.distanceM,
    point: c.point,
    segmentIndex: c.segmentIndex,
    offRoute,
    method,
    confidence: finalConfidence,
    ambiguous,
  };
}

/**
 * Distância de offset abaixo da qual dois candidatos são a MESMA passagem da
 * estrada por ali, e acima da qual são passagens distintas (ida e volta, ou
 * largada e chegada de um circuito).
 */
const PASSAGE_CLUSTER_M = 300;

/**
 * Quando duas passagens distintas estão praticamente à mesma distância do
 * ponto, a diferença está dentro do erro do GPS e escolher pela menor
 * distância é jogar cara ou coroa.
 */
const PASSAGE_TIE_TOLERANCE_M = 30;

/**
 * Melhor segmento entre os candidatos espaciais — usado quando não há
 * histórico em que se apoiar.
 *
 * O caso que obriga esta função a ser mais que um `min()`: PROVA EM CIRCUITO.
 * Largada e chegada no mesmo lugar significa que o offset 0 e o offset 55 000
 * são o MESMO ponto do mapa. Um `min()` puro escolhe entre os dois pelo ruído
 * do GPS — e escolher a chegada ancora o veículo no fim da prova, de onde ele
 * não tem para onde avançar. O erro então não se corrige sozinho: a janela de
 * continuidade dos pings seguintes passa a defender ativamente a posição
 * errada. Foi exatamente isso que apareceu ao rodar um veículo simulado sobre
 * o Giro delle Langhe: 8 km de erro médio ao longo de toda a prova.
 *
 * A regra: agrupar os candidatos por passagem, e no empate ficar com a
 * passagem MAIS CEDO no percurso. Empate aqui significa "o GPS não sabe
 * distinguir", e nesse caso subestimar o avanço é o erro seguro — um veículo
 * reportado atrás do que está mantém a rua fechada por mais tempo; reportado à
 * frente, abre a rua com o pelotão ainda dentro.
 */
function searchGlobal(
  index: RouteIndex,
  p: LatLng,
  lap: number,
): Candidate | null {
  const candidates = index.candidatesNear(p);

  const projections =
    candidates.length === 0
      ? // Ponto longe demais de qualquer célula da grade: varre tudo. Custa
        // caro, mas só acontece quando o veículo está a quilômetros do
        // percurso, o que por si só já é informação que o diretor precisa ver.
        projectRange(index.track, p, 0, index.track.points.length - 2, lap)
      : projectSegments(index.track, p, candidates, lap);

  const passages = clusterIntoPassages(projections);
  if (passages.length === 0) return null;

  // `passages` vem ordenado por offset, então a primeira que empata é a mais
  // cedo no percurso — que é a escolha conservadora.
  return pickAmongTies(passages, () => 0);
}

/**
 * Agrupa projeções em "passagens": trechos distintos em que o percurso passa
 * perto do ponto consultado. Segmentos vizinhos do mesmo trecho viram uma
 * passagem só; a ida e a volta de um grampo viram duas.
 */
function clusterIntoPassages(projections: Candidate[]): Candidate[] {
  if (projections.length === 0) return [];

  const sorted = [...projections].sort((a, b) => a.offsetM - b.offsetM);

  const passages: Candidate[] = [];
  let currentBest = sorted[0]!;

  for (let i = 1; i < sorted.length; i++) {
    const c = sorted[i]!;
    if (c.offsetM - sorted[i - 1]!.offsetM > PASSAGE_CLUSTER_M) {
      passages.push(currentBest);
      currentBest = c;
    } else if (c.distanceM < currentBest.distanceM) {
      currentBest = c;
    }
  }
  passages.push(currentBest);

  return passages;
}

/**
 * Escolhe entre passagens estatisticamente empatadas usando um critério de
 * desempate externo (menor custo vence).
 *
 * Empate aqui significa "a diferença de distância perpendicular está dentro do
 * erro do GPS" — nesse caso a geometria não tem mais nada a dizer, e insistir
 * no mínimo numérico é seguir ruído. É o que produz jitter no ápice de um
 * grampo, onde as duas pernas ficam a poucos metros uma da outra: a posição na
 * prova oscilava mais de 150 m entre pings consecutivos de um veículo que
 * estava simplesmente fazendo a curva.
 */
function pickAmongTies(
  passages: Candidate[],
  cost: (c: Candidate) => number,
): Candidate {
  const minDistance = Math.min(...passages.map((c) => c.distanceM));

  let best = passages[0]!;
  let bestCost = Infinity;
  let tiedCount = 0;

  for (const passage of passages) {
    if (passage.distanceM > minDistance + PASSAGE_TIE_TOLERANCE_M) continue;

    tiedCount++;
    const c = cost(passage);
    if (c < bestCost) {
      bestCost = c;
      best = passage;
    }
  }

  // Mais de uma passagem empatada significa que a escolha veio do desempate,
  // não da geometria. Quem consome precisa saber: o número pode estar a
  // quilômetros do certo mesmo com a distância perpendicular em poucos metros.
  return tiedCount > 1 ? { ...best, ambiguous: true } : best;
}

interface MotionPrior {
  /** Onde o veículo deveria estar, segundo a última posição e velocidade. */
  expectedOffsetM: number;
  /** Incerteza dessa previsão, em metros. */
  sigmaMotionM: number;
  /** Incerteza da medição de GPS, em metros. */
  sigmaGpsM: number;
}

/**
 * Melhor posição dentro da janela, combinando geometria e modelo de movimento.
 *
 * Escolher só pela menor distância perpendicular falha num caso que aparece em
 * qualquer percurso real: quando a estrada entra e volta pela MESMA via — um
 * waypoint fora da via principal, um retorno, um trecho sem saída. As duas
 * passagens não estão "próximas": são a mesma geometria, a centímetros uma da
 * outra. Nenhum agrupamento por offset as separa, porque os candidatos formam
 * uma sequência contínua sem lacuna. A geometria simplesmente não tem a
 * informação.
 *
 * O que tem a informação é a física: o veículo estava no offset X há 3 s
 * viajando a 12 m/s, então está por volta de X+36 — não em X−200. Somando as
 * duas evidências como custos quadráticos normalizados pelas respectivas
 * incertezas (o mesmo princípio de um filtro de Kalman ou de map-matching por
 * HMM), a resposta certa cai fora naturalmente:
 *
 *   custo = (distância_perpendicular / σ_gps)² + (desvio_do_previsto / σ_movimento)²
 *
 * O comportamento degrada bem nos dois extremos. Se o GPS está claramente mais
 * perto de uma das opções, o primeiro termo domina e a geometria decide. Se as
 * opções são geometricamente indistinguíveis, o segundo termo domina e a
 * física decide. E se não há velocidade conhecida, σ_movimento cresce com o
 * tempo decorrido e o termo simplesmente perde força — sem nunca travar o
 * veículo no lugar.
 */
function searchAbsoluteWindow(
  track: RouteTrack,
  p: LatLng,
  startAbsM: number,
  endAbsM: number,
  motion: MotionPrior,
): Candidate | null {
  const total = track.totalDistanceM;

  // Percurso ponto-a-ponto: uma volta só, janela presa ao traçado.
  // Circuito: a janela pode atravessar a linha de largada, e é exatamente isso
  // que impedia o veículo de avançar — a busca parava no fim do traçado e ele
  // ficava preso lá, com confiança alta, enquanto dava mais uma volta inteira.
  const firstLap = track.isLoop ? Math.floor(startAbsM / total) : 0;
  const lastLap = track.isLoop ? Math.floor(endAbsM / total) : 0;

  let best: Candidate | null = null;
  let bestCost = Infinity;

  for (let lap = Math.max(0, firstLap); lap <= Math.max(0, lastLap); lap++) {
    const lapBase = lap * total;
    const localStart = Math.max(0, startAbsM - lapBase);
    const localEnd = Math.min(total, endAbsM - lapBase);

    if (localEnd < localStart) continue;

    const lo = Math.max(0, findSegmentIndex(track, localStart));
    const hi = Math.min(
      track.points.length - 2,
      findSegmentIndex(track, localEnd),
    );

    for (let i = lo; i <= hi; i++) {
      const c = projectOnSegment(track, p, i, lap);
      if (!c) continue;

      const geometryTerm = c.distanceM / motion.sigmaGpsM;
      const motionTerm =
        (c.absoluteOffsetM - motion.expectedOffsetM) / motion.sigmaMotionM;
      const cost = geometryTerm * geometryTerm + motionTerm * motionTerm;

      if (cost < bestCost) {
        bestCost = cost;
        best = c;
      }
    }
  }

  return best;
}

function projectRange(
  track: RouteTrack,
  p: LatLng,
  fromIdx: number,
  toIdx: number,
  lap: number,
): Candidate[] {
  const out: Candidate[] = [];
  for (let i = fromIdx; i <= toIdx; i++) {
    const c = projectOnSegment(track, p, i, lap);
    if (c) out.push(c);
  }
  return out;
}

function projectSegments(
  track: RouteTrack,
  p: LatLng,
  segmentIndices: number[],
  lap: number,
): Candidate[] {
  const out: Candidate[] = [];
  for (const i of segmentIndices) {
    const c = projectOnSegment(track, p, i, lap);
    if (c) out.push(c);
  }
  return out;
}

function projectOnSegment(
  track: RouteTrack,
  p: LatLng,
  segIdx: number,
  lap: number,
): Candidate | null {
  const pts = track.points;
  const a = pts[segIdx];
  const b = pts[segIdx + 1];
  if (!a || !b) return null;

  const proj = projectPointOnSegment(
    p,
    { lat: a[1], lng: a[0] },
    { lat: b[1], lng: b[0] },
  );

  const segLen = b[2] - a[2];
  const offsetM = a[2] + segLen * proj.t;

  return {
    segmentIndex: segIdx,
    offsetM,
    lap,
    absoluteOffsetM: lap * track.totalDistanceM + offsetM,
    distanceM: proj.distanceM,
    point: proj.point,
    ambiguous: false,
  };
}

/**
 * Distância em linha reta — existe para o dashboard poder mostrar lado a lado
 * com a distância pela estrada e deixar a diferença explícita.
 */
export function straightLineMeters(a: LatLng, b: LatLng): number {
  return haversineMeters(a, b);
}
