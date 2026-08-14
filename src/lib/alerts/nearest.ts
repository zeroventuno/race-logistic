/**
 * Sugestão de apoio mais próximo.
 *
 * Quando um motorista dispara um alerta, a direção precisa decidir em segundos
 * quem vai atender. Esta função responde "quem" — e, mais importante, deixa
 * registrado POR QUÊ, num texto que um humano consegue contestar depois.
 *
 * Quatro decisões estruturam o cálculo:
 *
 *  1. DISTÂNCIA PELA ROTA, NÃO PELO AR. Numa estrada de montanha dois veículos
 *     podem estar a 80 m em linha reta e a 8 km pela estrada, em pernas opostas
 *     de um grampo. Despachar por proximidade geométrica mandaria a ambulância
 *     para o lado errado da montanha. Só usamos linha reta quando não há
 *     `route_offset_m` dos dois lados — e o resultado sai MARCADO como
 *     estimativa, porque uma linha reta sempre subestima a estrada.
 *
 *  2. QUEM JÁ PASSOU PAGA PEDÁGIO. Um veículo atrás do ponto do alerta chega
 *     seguindo o fluxo da prova. Um que já passou precisa achar onde retornar e
 *     voltar contra o fluxo, muitas vezes com a estrada ocupada pelo pelotão.
 *     A ETA reflete isso; ignorar essa assimetria é o erro que faz o sistema
 *     sugerir o veículo "mais perto" que na prática é o mais lento.
 *
 *  3. SINAL PERDIDO NÃO É CANDIDATO. Sugerir um veículo cuja última posição tem
 *     5 minutos é pior do que não sugerir nada: a direção liga para ele, não
 *     atende, e o tempo do socorro foi gasto numa pista falsa.
 *
 *  4. A CATEGORIA MANDA, MAS NÃO EXCLUI. Para um alerta médico a ambulância vem
 *     primeiro, sempre. Mas se a única ambulância está sem sinal, devolver lista
 *     vazia seria abandonar o alerta — então os demais veículos despacháveis
 *     aparecem depois, explicitamente marcados como fora da especialidade.
 *     É a mesma regra de "falhar para o lado do socorro" que rege o
 *     acionamento automático: alguém indo é melhor que ninguém indo.
 *
 * Módulo puro de propósito: nada de banco, nada de `server-only`. É o que
 * permite testá-lo com geometria conhecida em vez de com um banco de mentira.
 */

import { haversineMeters, type LatLng } from "@/lib/geo/distance";
import {
  ROLE_META,
  signalHealth,
  type AlertCategory,
  type PositionRole,
  type SignalHealth,
} from "@/lib/types";

/** Abaixo disto a velocidade média medida é ruído (veículo parado). */
const MIN_USABLE_SPEED_MPS = 1.5;

/**
 * Velocidade nominal por papel, usada só quando não há histórico de
 * deslocamento. Serve para ORDENAR candidatos de forma comparável; a ETA
 * resultante sai rotulada como estimada, nunca apresentada como medida.
 */
const NOMINAL_SPEED_MPS: Record<PositionRole, number> = {
  lead_car: 11,
  sweep_car: 9,
  moto: 13,
  ambulance: 11,
  mechanic: 10,
  support_car: 10,
  marshal: 6,
  other: 9,
};

/**
 * Tempo perdido para achar um lugar seguro de retornar numa estrada de prova
 * fechada. Valor conservador: o custo de subestimar é a direção esperar um
 * socorro que não chega.
 */
const TURNAROUND_SECONDS = 90;

/** Voltar contra o fluxo é mais lento que seguir com ele. */
const AGAINST_FLOW_FACTOR = 1.5;

/** Estrada real é mais longa que a linha reta entre dois pontos dela. */
const STRAIGHT_TO_ROAD_FACTOR = 1.3;

/**
 * Ordem de preferência de papel por categoria.
 *
 * `ROLE_META[role].handles` diz QUEM resolve; isto diz QUEM RESOLVE MELHOR.
 * Para um pneu furado, mecânico > carro de apoio > moto: todos os três
 * atendem, mas em ordem decrescente de chance de resolver na hora.
 */
const ROLE_PREFERENCE: Record<AlertCategory, PositionRole[]> = {
  medical: ["ambulance"],
  mechanical: ["mechanic", "support_car", "moto"],
  other: ["moto", "support_car", "marshal"],
};

/**
 * Peso de cada degrau de preferência, em segundos equivalentes.
 *
 * Preferência estrita ("mecânico sempre antes da moto") mandaria o mecânico a
 * 20 min de distância em vez da moto a 2 min. Ordenação puramente por tempo
 * ignoraria que a moto pode não ter a peça. Converter a preferência em tempo
 * resolve os dois: um degrau de especialidade vale 2 minutos de viagem, e a
 * conta decide. Um mecânico 3 min mais longe ainda ganha da moto; 10 min mais
 * longe, não.
 */
const PREFERENCE_STEP_SECONDS = 120;

/**
 * Penalidade para quem NÃO atende a categoria. Grande o bastante para que o
 * escalonamento só aconteça quando não há mais ninguém da especialidade — e
 * finito de propósito, porque lista vazia num alerta médico é inaceitável.
 */
const OFF_SPECIALTY_PENALTY_SECONDS = 3600;

export interface NearestCandidate {
  positionId: string;
  label: string;
  role: PositionRole;
  isDispatchable: boolean;
  /** Última posição conhecida. `null` se o veículo nunca transmitiu. */
  lat: number | null;
  lng: number | null;
  routeOffsetM: number | null;
  rollingSpeedMps: number | null;
  /** Epoch ms do último ping. `null` = nunca transmitiu. */
  recordedAtMs: number | null;
}

export interface NearestOrigin {
  lat: number | null;
  lng: number | null;
  routeOffsetM: number | null;
}

export interface NearestInput {
  category: AlertCategory;
  origin: NearestOrigin;
  candidates: NearestCandidate[];
  nowMs: number;
  maxResults?: number;
  /** Quem disparou o alerta não é sugerido para atender a si mesmo. */
  excludePositionId?: string | null;
}

export type NearestMethod = "route" | "straight_fallback";

export interface NearestSuggestion {
  positionId: string;
  label: string;
  role: PositionRole;
  rank: number;
  /** Distância pela estrada. `null` quando só houve linha reta. */
  routeDistanceM: number | null;
  /** Sempre presente — a coluna do banco é NOT NULL e a honestidade também. */
  straightDistanceM: number;
  etaSeconds: number | null;
  /** O veículo já passou pelo ponto do alerta? `null` sem dado de rota. */
  isAhead: boolean | null;
  reason: string;
  method: NearestMethod;
  signal: SignalHealth;
  /** A ETA veio de velocidade medida ou de velocidade nominal? */
  etaEstimated: boolean;
  /** Este papel não é a especialidade da categoria — é escalonamento. */
  offSpecialty: boolean;
}

export interface NearestResult {
  suggestions: NearestSuggestion[];
  /** Por que a lista ficou como ficou — vai para a auditoria do alerta. */
  note: string;
}

interface Scored extends NearestSuggestion {
  /** ETA já somada às penalidades de especialidade. É a chave da ordenação. */
  adjustedCostSeconds: number;
}

export function computeNearestSupport(input: NearestInput): NearestResult {
  const maxResults = input.maxResults ?? 3;
  const origin = input.origin;

  const originPoint: LatLng | null =
    origin.lat != null && origin.lng != null && Number.isFinite(origin.lat) && Number.isFinite(origin.lng)
      ? { lat: origin.lat, lng: origin.lng }
      : null;

  if (!originPoint && origin.routeOffsetM == null) {
    return {
      suggestions: [],
      note: "Sem posição de origem do alerta: nenhuma sugestão calculável.",
    };
  }

  const scored: Scored[] = [];
  let ignoredNoSignal = 0;
  let ignoredRole = 0;

  for (const c of input.candidates) {
    if (c.positionId === input.excludePositionId) continue;
    if (!c.isDispatchable) {
      ignoredRole++;
      continue;
    }

    const ageSeconds = c.recordedAtMs == null ? null : (input.nowMs - c.recordedAtMs) / 1000;
    const signal = signalHealth(ageSeconds);

    if (signal === "lost" || signal === "never") {
      ignoredNoSignal++;
      continue;
    }

    if (c.lat == null || c.lng == null) {
      // `position_state` exige lat/lng, então isto só acontece com dado
      // corrompido. Ignorar em silêncio seria esconder o problema; contamos.
      ignoredNoSignal++;
      continue;
    }

    const candidatePoint: LatLng = { lat: c.lat, lng: c.lng };

    const straightDistanceM = originPoint
      ? haversineMeters(originPoint, candidatePoint)
      : Number.POSITIVE_INFINITY;

    const canUseRoute = origin.routeOffsetM != null && c.routeOffsetM != null;

    const routeDistanceM = canUseRoute
      ? Math.abs(c.routeOffsetM! - origin.routeOffsetM!)
      : null;

    const isAhead = canUseRoute ? c.routeOffsetM! > origin.routeOffsetM! : null;

    const method: NearestMethod = canUseRoute ? "route" : "straight_fallback";

    // Sem rota e sem coordenada de origem não há distância nenhuma — o
    // candidato não é comparável e sai da lista em vez de virar Infinity.
    if (!canUseRoute && !Number.isFinite(straightDistanceM)) {
      ignoredNoSignal++;
      continue;
    }

    const measuredSpeed =
      c.rollingSpeedMps != null && c.rollingSpeedMps >= MIN_USABLE_SPEED_MPS
        ? c.rollingSpeedMps
        : null;

    const speedMps = measuredSpeed ?? NOMINAL_SPEED_MPS[c.role];

    const travelDistanceM = canUseRoute
      ? routeDistanceM!
      : straightDistanceM * STRAIGHT_TO_ROAD_FACTOR;

    let etaSeconds = travelDistanceM / speedMps;
    if (isAhead === true) {
      etaSeconds = etaSeconds * AGAINST_FLOW_FACTOR + TURNAROUND_SECONDS;
    }

    const handles = ROLE_META[c.role].handles.includes(input.category);
    const preferenceIndex = ROLE_PREFERENCE[input.category].indexOf(c.role);

    // Quem atende a categoria mas não está na lista de preferência entra logo
    // depois dos listados, não junto com quem não atende.
    const preferenceRank =
      preferenceIndex >= 0
        ? preferenceIndex
        : ROLE_PREFERENCE[input.category].length;

    const adjustedCostSeconds =
      etaSeconds +
      (handles
        ? preferenceRank * PREFERENCE_STEP_SECONDS
        : OFF_SPECIALTY_PENALTY_SECONDS);

    scored.push({
      positionId: c.positionId,
      label: c.label,
      role: c.role,
      rank: 0,
      routeDistanceM,
      straightDistanceM: Number.isFinite(straightDistanceM) ? straightDistanceM : 0,
      etaSeconds: Math.round(etaSeconds),
      isAhead,
      method,
      signal,
      etaEstimated: measuredSpeed === null || !canUseRoute,
      offSpecialty: !handles,
      reason: buildReason({
        method,
        isAhead,
        routeDistanceM,
        straightDistanceM,
        measuredSpeed,
        role: c.role,
        signal,
        ageSeconds,
        handles,
        category: input.category,
      }),
      adjustedCostSeconds,
    });
  }

  scored.sort((a, b) => {
    if (a.adjustedCostSeconds !== b.adjustedCostSeconds) {
      return a.adjustedCostSeconds - b.adjustedCostSeconds;
    }
    return a.straightDistanceM - b.straightDistanceM;
  });

  const suggestions = scored.slice(0, maxResults).map((s, i) => {
    const { adjustedCostSeconds: _cost, ...rest } = s;
    return { ...rest, rank: i + 1 };
  });

  return { suggestions, note: buildNote(suggestions, ignoredNoSignal, ignoredRole, input.category) };
}

interface ReasonInput {
  method: NearestMethod;
  isAhead: boolean | null;
  routeDistanceM: number | null;
  straightDistanceM: number;
  measuredSpeed: number | null;
  role: PositionRole;
  signal: SignalHealth;
  ageSeconds: number | null;
  handles: boolean;
  category: AlertCategory;
}

function buildReason(r: ReasonInput): string {
  const parts: string[] = [];

  if (r.method === "route" && r.routeDistanceM != null) {
    parts.push(
      r.isAhead
        ? `${formatDistance(r.routeDistanceM)} à frente do alerta (precisa retornar)`
        : `${formatDistance(r.routeDistanceM)} atrás do alerta, no sentido da prova`,
    );
  } else {
    parts.push(
      `${formatDistance(r.straightDistanceM)} em linha reta — sem posição na rota, distância pela estrada é maior`,
    );
  }

  parts.push(
    r.measuredSpeed != null
      ? `velocidade média medida ${(r.measuredSpeed * 3.6).toFixed(0)} km/h`
      : `ETA estimada por velocidade nominal (${(NOMINAL_SPEED_MPS[r.role] * 3.6).toFixed(0)} km/h): sem deslocamento recente medido`,
  );

  if (r.signal === "stale" || r.signal === "delayed") {
    parts.push(`última posição há ${Math.round(r.ageSeconds ?? 0)} s`);
  }

  if (!r.handles) {
    parts.push(
      `${ROLE_META[r.role].shortLabel} não é a especialidade para "${r.category}" — sugerido por proximidade`,
    );
  }

  return parts.join(" · ");
}

function buildNote(
  suggestions: NearestSuggestion[],
  ignoredNoSignal: number,
  ignoredRole: number,
  category: AlertCategory,
): string {
  if (suggestions.length === 0) {
    if (ignoredNoSignal > 0) {
      return `Nenhum apoio sugerido: ${ignoredNoSignal} veículo(s) despachável(is) estão sem sinal.`;
    }
    return "Nenhum veículo despachável cadastrado nesta prova.";
  }

  const parts = [`${suggestions.length} sugestão(ões) para categoria "${category}".`];

  // Escalonamento tem que gritar. Um alerta médico atendido por uma moto é uma
  // decisão consciente do sistema, e quem lê o histórico depois precisa ver que
  // não havia ambulância disponível — não concluir que o cálculo errou.
  if (suggestions[0]?.offSpecialty) {
    parts.push(
      `ESCALONADO: nenhum veículo da especialidade disponível; acionado ${ROLE_META[suggestions[0].role].shortLabel}.`,
    );
  }

  if (ignoredNoSignal > 0) parts.push(`${ignoredNoSignal} ignorado(s) por sinal perdido.`);
  if (ignoredRole > 0) parts.push(`${ignoredRole} não despachável(is).`);
  if (suggestions.every((s) => s.method === "straight_fallback")) {
    parts.push("Todas em linha reta: sem posição na rota para comparar.");
  }
  return parts.join(" ");
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return km >= 10 ? `${km.toFixed(1)} km` : `${km.toFixed(2)} km`;
}
