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

import type { Clausula } from "@/lib/i18n/frase";
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
  // A vassoura anda no ritmo do último atleta, então é o veículo mais lento
  // do comboio — e superestimar a velocidade dela é prometer um socorro que
  // chega depois do prometido.
  broom_wagon: 7,
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

/**
 * Penalidade para candidato cuja âncora o snap marcou como ambígua.
 *
 * 10 minutos equivalentes: o suficiente para um veículo com posição confiável
 * vencer quase sempre, e pequeno o bastante para não esconder o único
 * candidato disponível quando todos estão ambíguos.
 */
const UNCERTAIN_POSITION_PENALTY_SECONDS = 600;

export interface NearestCandidate {
  positionId: string;
  label: string;
  role: PositionRole;
  isDispatchable: boolean;
  /** Última posição conhecida. `null` se o veículo nunca transmitiu. */
  lat: number | null;
  lng: number | null;
  /**
   * Metros percorridos de PROVA, contando as voltas (`absolute_offset_m`).
   *
   * Nunca o offset dentro do traçado: num circuito, o veículo na volta 3 e o
   * acidente na volta 1 ocupam o mesmo ponto do mapa e estão a duas voltas de
   * distância. Comparar offsets locais devolve "0 m" com toda a confiança.
   */
  routeOffsetM: number | null;
  /**
   * A âncora deste veículo foi escolhida por desempate, não por geometria?
   * Se sim, `routeOffsetM` pode estar a quilômetros do lugar certo.
   */
  ambiguous?: boolean;
  rollingSpeedMps: number | null;
  /** Epoch ms do último ping. `null` = nunca transmitiu. */
  recordedAtMs: number | null;
}

export interface NearestOrigin {
  lat: number | null;
  lng: number | null;
  /** Offset ABSOLUTO do alerta (com voltas). */
  routeOffsetM: number | null;
  /** A âncora do alerta é ambígua? Contamina a comparação com todos. */
  ambiguous?: boolean;
}

export interface NearestInput {
  category: AlertCategory;
  origin: NearestOrigin;
  candidates: NearestCandidate[];
  nowMs: number;
  maxResults?: number;
  /** Quem disparou o alerta não é sugerido para atender a si mesmo. */
  excludePositionId?: string | null;
  /**
   * Veículos que JÁ estão acionados para outro alerta ativo.
   *
   * Sem esta lista, o mesmo veículo é escolhido para vários acidentes ao mesmo
   * tempo: medido, três acidentes simultâneos acionaram a MESMA ambulância nos
   * três, e os motoristas de dois deles viam "Ambulância 1 acionada" — sinal
   * verde — sem ninguém a caminho.
   */
  busyPositionIds?: readonly string[];
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
  /**
   * Por que este veículo, em pedaços.
   *
   * Não é frase pronta: esta função roda no servidor, no instante do alerta, e
   * o resultado é GRAVADO. Quem lê depois — a direção no painel, o motorista
   * acionado no celular — pode estar em outro idioma. Ver `lib/i18n/frase`.
   */
  reason: Clausula[];
  method: NearestMethod;
  signal: SignalHealth;
  /** A ETA veio de velocidade medida ou de velocidade nominal? */
  etaEstimated: boolean;
  /** Este papel não é a especialidade da categoria — é escalonamento. */
  offSpecialty: boolean;
  /**
   * A posição usada (do candidato ou do alerta) veio de âncora ambígua. Este
   * número pode estar a quilômetros do certo; quem despacha precisa saber.
   */
  positionUncertain: boolean;
}

export interface NearestResult {
  suggestions: NearestSuggestion[];
  /** Por que a lista ficou como ficou — vai para a auditoria do alerta. */
  note: Clausula[];
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
      note: [{ k: "alerts.why.noOrigin" }],
    };
  }

  const scored: Scored[] = [];
  let ignoredNoSignal = 0;
  let ignoredRole = 0;
  let ignoredBusy = 0;
  let uncertainCount = 0;

  const busy = new Set(input.busyPositionIds ?? []);

  for (const c of input.candidates) {
    if (c.positionId === input.excludePositionId) continue;
    if (!c.isDispatchable) {
      ignoredRole++;
      continue;
    }

    // Já está indo para outro acidente. Acionar de novo produziria dois
    // motoristas esperando o mesmo veículo, e o índice único do banco recusaria
    // a segunda gravação de qualquer forma.
    if (busy.has(c.positionId)) {
      ignoredBusy++;
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

    // ÂNCORA AMBÍGUA NÃO É POSIÇÃO. Quando o snap avisa que escolheu por
    // desempate, o offset pode estar a dezenas de quilômetros do lugar certo —
    // e usá-lo como distância pela estrada produz exatamente o erro medido:
    // ambulância a 200 m anunciada a 37,6 km. Nesse caso a comparação cai para
    // a linha reta (que ao menos vem do GPS bruto) e o candidato é penalizado.
    const uncertain = Boolean(c.ambiguous) || Boolean(origin.ambiguous);
    if (uncertain) uncertainCount++;

    const canUseRoute =
      origin.routeOffsetM != null && c.routeOffsetM != null && !uncertain;

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
        : OFF_SPECIALTY_PENALTY_SECONDS) +
      // Quem tem âncora ambígua perde para quem tem posição confiável, mesmo
      // parecendo mais perto. Só ganha se for a única opção — e aí sai marcado.
      (uncertain ? UNCERTAIN_POSITION_PENALTY_SECONDS : 0);

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
      positionUncertain: uncertain,
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
        uncertain,
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

  return {
    suggestions,
    note: buildNote({
      suggestions,
      ignoredNoSignal,
      ignoredRole,
      ignoredBusy,
      uncertainCount,
      category: input.category,
    }),
  };
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
  uncertain: boolean;
}

function buildReason(r: ReasonInput): Clausula[] {
  const parts: Clausula[] = [];

  if (r.uncertain) {
    parts.push({ k: "alerts.why.uncertainAnchor" });
  }

  // A distância vai em METROS CRUS, e não formatada. Quem formata é o leitor,
  // com o `Intl` do idioma dele — o que de quebra conserta um defeito antigo
  // anotado logo abaixo: a frase saía com ponto decimal enquanto a janela ao
  // lado saía com vírgula, na mesma tela.
  if (r.method === "route" && r.routeDistanceM != null) {
    parts.push({
      k: r.isAhead ? "alerts.why.ahead" : "alerts.why.behind",
      v: { distance: { metros: r.routeDistanceM } },
    });
  } else {
    parts.push({
      k: "alerts.why.straightOnly",
      v: { distance: { metros: r.straightDistanceM } },
    });
  }

  parts.push(
    r.measuredSpeed != null
      ? {
          k: "alerts.why.speedMeasured",
          v: { speed: (r.measuredSpeed * 3.6).toFixed(0) },
        }
      : {
          k: "alerts.why.speedNominal",
          v: { speed: (NOMINAL_SPEED_MPS[r.role] * 3.6).toFixed(0) },
        },
  );

  if (r.signal === "stale" || r.signal === "delayed") {
    parts.push({
      k: "alerts.why.lastSeen",
      v: { seconds: Math.round(r.ageSeconds ?? 0) },
    });
  }

  if (!r.handles) {
    parts.push({
      k: "alerts.why.offSpecialty",
      v: {
        role: { chave: `roles.${r.role}.short` },
        category: { chave: `alerts.categories.${r.category}.short` },
      },
    });
  }

  return parts;
}

interface NoteInput {
  suggestions: NearestSuggestion[];
  ignoredNoSignal: number;
  ignoredRole: number;
  ignoredBusy: number;
  uncertainCount: number;
  category: AlertCategory;
}

function buildNote(input: NoteInput): Clausula[] {
  const { suggestions, ignoredNoSignal, ignoredRole, ignoredBusy, category } = input;

  if (suggestions.length === 0) {
    const parts: Clausula[] = [];
    if (ignoredNoSignal > 0) {
      parts.push({ k: "alerts.why.ignoredNoSignal", v: { count: ignoredNoSignal } });
    }
    if (ignoredBusy > 0) {
      parts.push({ k: "alerts.why.ignoredBusy", v: { count: ignoredBusy } });
    }

    // Sem candidato E sem motivo é outra coisa: ninguém foi ignorado porque
    // não havia ninguém para ignorar. A direção precisa distinguir "todos
    // indisponíveis agora" de "esta prova nunca teve apoio cadastrado".
    return parts.length > 0
      ? [{ k: "alerts.why.noneSuggested" }, ...parts]
      : [{ k: "alerts.why.noneDispatchable" }];
  }

  const parts: Clausula[] = [
    {
      k: "alerts.why.count",
      v: {
        count: suggestions.length,
        category: { chave: `alerts.categories.${category}.short` },
      },
    },
  ];

  if (input.uncertainCount > 0) {
    parts.push({
      k: "alerts.why.uncertainCount",
      v: { count: input.uncertainCount },
    });
  }
  if (ignoredBusy > 0) {
    parts.push({ k: "alerts.why.ignoredBusy", v: { count: ignoredBusy } });
  }

  // Escalonamento tem que gritar. Um alerta médico atendido por uma moto é uma
  // decisão consciente do sistema, e quem lê o histórico depois precisa ver que
  // não havia ambulância disponível — não concluir que o cálculo errou.
  if (suggestions[0]?.offSpecialty) {
    parts.push({
      k: "alerts.why.escalated",
      v: { role: { chave: `roles.${suggestions[0].role}.short` } },
    });
  }

  if (ignoredNoSignal > 0) {
    parts.push({ k: "alerts.why.ignoredNoSignal", v: { count: ignoredNoSignal } });
  }
  if (ignoredRole > 0) {
    parts.push({ k: "alerts.why.ignoredRole", v: { count: ignoredRole } });
  }
  if (suggestions.every((s) => s.method === "straight_fallback")) {
    parts.push({ k: "alerts.why.allStraight" });
  }

  return parts;
}

/*
 * A FORMATAÇÃO DA DISTÂNCIA SAIU DAQUI, e essa era a pendência anotada neste
 * lugar: o texto usava `toFixed`, que sempre escreve ponto decimal, e o painel
 * mostrava "4,00 km" na janela abertura↔fechamento e "2.10 km" na frase ao
 * lado. Dois separadores decimais na mesma tela, lida sob pressão, fazem o olho
 * tropeçar e duvidar do número.
 *
 * A cláusula agora carrega os metros crus e quem formata é o leitor, com o
 * `Intl` do idioma dele. O defeito não foi consertado — deixou de existir.
 */
