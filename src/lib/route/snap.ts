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
}

export interface SnapOptions {
  previous?: SnapPrevious | null;
  /** Epoch em ms do ping sendo ancorado. */
  recordedAtMs: number;
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
  /** Metros percorridos de prova. É *o* número que o resto do sistema usa. */
  offsetM: number;
  /** Distância perpendicular do GPS ao percurso. */
  snapDistanceM: number;
  point: LatLng;
  segmentIndex: number;
  offRoute: boolean;
  method: SnapMethod;
  confidence: "high" | "medium" | "low";
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

interface Candidate {
  segmentIndex: number;
  offsetM: number;
  distanceM: number;
  point: LatLng;
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

  const previous = opts.previous ?? null;
  const elapsedMs = previous ? opts.recordedAtMs - previous.recordedAtMs : Infinity;

  // Janela só vale se o ping anterior for recente e não vier do futuro
  // (relógio do celular adiantado produz elapsed negativo).
  const windowUsable =
    previous !== null && elapsedMs >= 0 && elapsedMs <= staleAfterMs;

  const globalBest = searchGlobal(index, p);

  if (!windowUsable) {
    return finalize(globalBest, "global", offRouteThreshold, track, previous === null ? "medium" : "low");
  }

  const elapsedSec = elapsedMs / 1000;
  const forward = Math.max(DEFAULTS.minForwardWindowM, elapsedSec * maxSpeedMps);

  const windowStart = previous!.offsetM - maxBacktrackM;
  const windowEnd = previous!.offsetM + forward;

  const windowBest = searchOffsetWindow(track, p, windowStart, windowEnd);

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

function finalize(
  c: Candidate | null,
  method: SnapMethod,
  offRouteThreshold: number,
  track: RouteTrack,
  confidence: SnapResult["confidence"],
): SnapResult {
  if (!c) {
    // Só acontece se o percurso estiver vazio, o que buildRouteTrack impede.
    return {
      offsetM: 0,
      snapDistanceM: Infinity,
      point: { lat: track.points[0]?.[1] ?? 0, lng: track.points[0]?.[0] ?? 0 },
      segmentIndex: 0,
      offRoute: true,
      method,
      confidence: "low",
    };
  }

  const offRoute = c.distanceM > offRouteThreshold;

  return {
    offsetM: c.offsetM,
    snapDistanceM: c.distanceM,
    point: c.point,
    segmentIndex: c.segmentIndex,
    offRoute,
    method,
    confidence: offRoute && confidence === "high" ? "medium" : confidence,
  };
}

/** Melhor segmento entre os candidatos espaciais — usado sem histórico. */
function searchGlobal(index: RouteIndex, p: LatLng): Candidate | null {
  const candidates = index.candidatesNear(p);

  if (candidates.length === 0) {
    // Ponto longe demais de qualquer célula da grade: varre tudo. Custa caro,
    // mas só acontece quando o veículo está a quilômetros do percurso, o que
    // por si só já é uma informação que o diretor precisa ver.
    return bestOfSegments(index.track, p, 0, index.track.points.length - 2);
  }

  let best: Candidate | null = null;
  for (const segIdx of candidates) {
    const c = projectOnSegment(index.track, p, segIdx);
    if (c && (!best || c.distanceM < best.distanceM)) best = c;
  }
  return best;
}

/** Melhor segmento cuja extensão intersecta a janela de offset dada. */
function searchOffsetWindow(
  track: RouteTrack,
  p: LatLng,
  startM: number,
  endM: number,
): Candidate | null {
  const pts = track.points;
  const lo = Math.max(0, findSegmentIndex(track, Math.max(0, startM)));
  const hiSeed = findSegmentIndex(track, Math.min(track.totalDistanceM, endM));
  const hi = Math.min(pts.length - 2, hiSeed);

  if (hi < lo) return null;

  return bestOfSegments(track, p, lo, hi);
}

function bestOfSegments(
  track: RouteTrack,
  p: LatLng,
  fromIdx: number,
  toIdx: number,
): Candidate | null {
  let best: Candidate | null = null;
  for (let i = fromIdx; i <= toIdx; i++) {
    const c = projectOnSegment(track, p, i);
    if (c && (!best || c.distanceM < best.distanceM)) best = c;
  }
  return best;
}

function projectOnSegment(
  track: RouteTrack,
  p: LatLng,
  segIdx: number,
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

  return {
    segmentIndex: segIdx,
    offsetM: a[2] + segLen * proj.t,
    distanceM: proj.distanceM,
    point: proj.point,
  };
}

/**
 * Distância em linha reta — existe para o dashboard poder mostrar lado a lado
 * com a distância pela estrada e deixar a diferença explícita.
 */
export function straightLineMeters(a: LatLng, b: LatLng): number {
  return haversineMeters(a, b);
}
