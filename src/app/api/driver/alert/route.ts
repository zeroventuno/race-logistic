import { getTranslator } from "@/lib/i18n/server";
import "server-only";

import { NextResponse } from "next/server";

import {
  autoDispatch,
  CATEGORY_VISIBILITY,
  declinedPositions,
  loadPositions,
  logAlertEvent,
  scheduleDispatchRetry,
} from "@/app/api/driver/_lib/dispatch";
import {
  driverError,
  driverJson,
  readJsonBody,
  unwrapEmbed,
} from "@/app/api/driver/_lib/http";
import { authenticateDriver } from "@/app/api/driver/_lib/session";
import type { DriverAlertAck, DriverAlertStatus } from "@/lib/driver/protocol";
import { snapToRoute } from "@/lib/route/snap";
import { loadRaceRoute } from "@/lib/route/store";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  ALERT_CATEGORY_META,
  type AlertCategory,
  type AlertPriority,
  type ClientAlert,
  type PositionRole,
} from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Abertura de alerta pelo motorista.
 *
 * A regra que organiza tudo aqui: O ALERTA É SAGRADO, O ACIONAMENTO É
 * IMEDIATO, E OS DOIS SÃO INDEPENDENTES.
 *
 * Um motorista tocou no botão de ambulância porque tem alguém no chão. A partir
 * desse toque, a única falha inaceitável é o alerta não existir no banco. O
 * acionamento automático do socorro vem logo depois e no mesmo instante — sem
 * esperar autorização de ninguém — mas roda DEPOIS da gravação, dentro de
 * `try/catch`, sem poder derrubar nada.
 *
 * Daí as escolhas que parecem estranhas isoladas:
 *
 *  - O alerta é INSERIDO ANTES de calcular qualquer coisa. Se o percurso não
 *    carregar, se o cálculo explodir, se o banco de posições estiver lento — o
 *    alerta já está gravado e aparece no mapa de todo mundo.
 *
 *  - Dado inválido é REPARADO, não rejeitado. Categoria desconhecida vira
 *    "other"; `createdAt` corrompido vira a hora do servidor; `clientAlertId`
 *    fora do formato ganha um id do servidor. Rejeitar um alerta por causa de
 *    um campo malformado é perder um chamado de socorro para defender a
 *    higiene do banco de dados.
 *
 *  - Falha no acionamento é REPORTADA, não engolida. `dispatchFailed: true`
 *    faz o app dizer ao motorista que ninguém está a caminho — que é a
 *    informação que muda o comportamento dele (pegar o rádio).
 *
 *  - Reenvio devolve 200 com `deduplicated: true`. O app tenta até receber ack;
 *    se o ack se perde, ele tenta de novo. Responder erro num reenvio faria o
 *    app tentar para sempre um alerta que a direção já está atendendo.
 */

const ALERT_ACK_COLUMNS =
  "id, status, category, received_at, route_offset_m, absolute_offset_m, " +
  "route_offset_ambiguous, lat, lng, dispatched_position_id, dispatch_reason, " +
  "dispatch_retry_after, dispatch_attempts";

interface AlertRow {
  id: string;
  status: DriverAlertStatus;
  category: AlertCategory;
  received_at: string;
  route_offset_m: number | null;
  absolute_offset_m: number | null;
  route_offset_ambiguous: boolean;
  lat: number | null;
  lng: number | null;
  dispatched_position_id: string | null;
  dispatch_reason: string | null;
  dispatch_retry_after: string | null;
  dispatch_attempts: number;
}

interface PositionLabel {
  label: string;
  role: PositionRole;
}

interface SuggestionRow {
  position_id: string;
  rank: number;
  route_distance_m: number | null;
  eta_seconds: number | null;
  race_positions: PositionLabel | PositionLabel[] | null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const { t } = await getTranslator();
  const auth = await authenticateDriver(request);
  if (!auth.ok) return auth.response;

  const session = auth.session;
  const admin = supabaseAdmin();

  const body = await readJsonBody(request);
  if (!body.ok) {
    return driverError("bad_request", body.reason);
  }

  const input = sanitizeAlert(body.value);

  // Caminho do reenvio. Consultado ANTES de tentar inserir porque é o caso
  // comum quando a rede está ruim: o alerta chegou, o ack não voltou.
  const existing = await findExisting(session.raceId, input.clientAlertId);

  if (existing) {
    await logAlertEvent(existing.id, "resend_received", "driver", {
      clientAlertId: input.clientAlertId,
      positionId: session.positionId,
    });

    // O reenvio é a melhor oportunidade de reconsiderar um alerta órfão: se
    // ninguém estava disponível no instante do disparo, provavelmente havia
    // sinal ruim — e agora chegou um pedido pela rede, então alguém voltou.
    const retried = await retryDispatchIfDue(existing, session.raceId, session.positionId);

    return driverJson<DriverAlertAck>(await ackFor(retried ?? existing, true));
  }

  const priority = alertPriority(input);
  const visibility = CATEGORY_VISIBILITY[input.category];

  // O offset tem que ser calculado ANTES do insert: o gatilho `alerts_freeze_facts`
  // trata os fatos do alerta (inclusive `route_offset_m`) como imutáveis, e com
  // razão — um incidente que pode ser reposicionado depois não é testemunho.
  // O cálculo vai dentro de try/catch: sem offset o alerta ainda é gravado, e a
  // comparação de proximidade cai para linha reta, marcada como tal.
  const positions = await loadPositionsSafely(session.raceId);
  const self = positions.find((p) => p.positionId === session.positionId);
  const anchor = await resolveAnchorSafely(
    session.raceId,
    input.lat,
    input.lng,
    self?.state ?? null,
  );

  const { data: inserted, error: insertError } = await admin
    .from("alerts")
    .insert({
      race_id: session.raceId,
      raised_by_position_id: session.positionId,
      client_alert_id: input.clientAlertId,
      category: input.category,
      priority,
      note: input.note,
      lat: input.lat,
      lng: input.lng,
      accuracy_m: input.accuracyM,
      status: "open",
      created_at: input.createdAtIso,
      route_offset_m: anchor.offsetM,
      absolute_offset_m: anchor.absoluteOffsetM,
      lap: anchor.lap,
      route_offset_confidence: anchor.confidence,
      route_offset_ambiguous: anchor.ambiguous,
      proximity_radius_m: visibility.proximityRadiusM,
      visible_until: new Date(Date.now() + visibility.visibleForMs).toISOString(),
    })
    .select(ALERT_ACK_COLUMNS)
    .maybeSingle<AlertRow>();

  let alert = inserted ?? null;

  if (insertError) {
    // 23505: dois envios do MESMO alerta correram lado a lado e o outro
    // ganhou. Não é erro — é a idempotência funcionando. Qualquer outro código
    // é falha real, e aí o app tem que manter o alerta na fila.
    if (insertError.code === "23505") {
      alert = await findExisting(session.raceId, input.clientAlertId);
    }

    if (!alert) {
      return driverError(
        "server_error",
        t("driver.api.alertSaveFailed"),
      );
    }

    return driverJson<DriverAlertAck>(await ackFor(alert, true));
  }

  if (!alert) {
    return driverError(
      "server_error",
      t("driver.api.alertSaveFailed"),
    );
  }

  await logAlertEvent(alert.id, "created", "driver", {
    clientAlertId: input.clientAlertId,
    category: input.category,
    priority,
    repairs: input.repairs,
    anchor,
    positionId: session.positionId,
    positionLabel: session.position.label,
  });

  // A partir daqui nada mais pode falhar de forma relevante: o alerta existe e
  // já está visível para todos os veículos da prova.
  const ack = await dispatchAndAck({
    alert,
    raceId: session.raceId,
    positionId: session.positionId,
    category: input.category,
    lat: input.lat ?? self?.state?.lat ?? null,
    lng: input.lng ?? self?.state?.lng ?? null,
    routeOffsetM: anchor.absoluteOffsetM,
    ambiguous: anchor.ambiguous,
    positions,
  });

  return driverJson<DriverAlertAck>({ ...ack, repairs: input.repairs });
}

/**
 * Prioridade do alerta.
 *
 * Categoria desconhecida NÃO rebaixa a urgência. Ela vira "other" para caber no
 * enum do banco, mas mantém prioridade crítica: quando o sistema não sabe o que
 * está acontecendo, tratar como grave é o erro barato. O contrário — um cliente
 * novo mandando uma categoria que este servidor ainda não conhece e o chamado
 * virar rotina — é o erro caro.
 */
function alertPriority(input: SanitizedAlert): AlertPriority {
  if (input.categoryUnknown) return "critical";
  return ALERT_CATEGORY_META[input.category].defaultPriority;
}

/**
 * Reconsidera o acionamento de um alerta que ficou órfão.
 *
 * Só age quando o alerta está sem dono, ainda aberto, e o instante de nova
 * tentativa já passou. Devolve a linha atualizada, ou `null` se nada mudou.
 */
async function retryDispatchIfDue(
  alert: AlertRow,
  raceId: string,
  raisedByPositionId: string,
): Promise<AlertRow | null> {
  if (alert.dispatched_position_id) return null;
  if (alert.status !== "open" && alert.status !== "acknowledged") return null;
  if (alert.dispatch_retry_after && Date.parse(alert.dispatch_retry_after) > Date.now()) {
    return null;
  }

  try {
    const excluded = new Set(await declinedPositions(alert.id));
    excluded.add(raisedByPositionId);

    const outcome = await autoDispatch({
      alertId: alert.id,
      raceId,
      category: alert.category,
      origin: {
        lat: alert.lat,
        lng: alert.lng,
        routeOffsetM: alert.absolute_offset_m ?? alert.route_offset_m,
        ambiguous: alert.route_offset_ambiguous,
      },
      excludePositionIds: [...excluded],
      persistSuggestions: true,
    });

    await logAlertEvent(
      alert.id,
      outcome.dispatched ? "dispatch_retry_succeeded" : "dispatch_retry_failed",
      "system",
      {
        positionId: raisedByPositionId,
        attempts: alert.dispatch_attempts,
        note: outcome.note,
        dispatchedTo: outcome.dispatched?.positionId ?? null,
      },
    );

    if (!outcome.dispatched) {
      await scheduleDispatchRetry(alert.id, alert.dispatch_attempts);
      return null;
    }

    return await findExistingById(alert.id);
  } catch (error) {
    console.warn("[driver/alert] retentativa de acionamento falhou:", (error as Error).message);
    return null;
  }
}

/** Carregar posições nunca pode impedir a gravação do alerta. */
async function loadPositionsSafely(raceId: string) {
  try {
    return await loadPositions(raceId);
  } catch (error) {
    console.warn("[driver/alert] posições indisponíveis:", (error as Error).message);
    return [];
  }
}

/**
 * Onde o alerta aconteceu, em metros de prova.
 *
 * É o número que faz o acionamento escolher pela estrada em vez de pelo ar, e
 * o que permite avisar os veículos que vêm atrás. Sem coordenada no alerta
 * (GPS negado, fixo ainda não obtido), a última posição conhecida do próprio
 * veículo é a melhor aproximação disponível — e é muito melhor que desistir.
 */
interface AlertAnchor {
  /** Offset dentro do traçado. */
  offsetM: number | null;
  /** Offset de PROVA, com as voltas contadas. É o comparável. */
  absoluteOffsetM: number | null;
  lap: number;
  confidence: "high" | "medium" | "low" | null;
  /** A âncora saiu de desempate. Quem despachar precisa saber. */
  ambiguous: boolean;
}

type SelfState = {
  lat: number;
  lng: number;
  route_offset_m: number | null;
  absolute_offset_m: number | null;
  lap: number | null;
  snap_ambiguous: boolean | null;
  recorded_at: string;
  rolling_speed_mps: number | null;
} | null;

/** Âncora herdada do último estado do próprio veículo. */
function anchorFromState(selfState: SelfState): AlertAnchor {
  if (!selfState) {
    return { offsetM: null, absoluteOffsetM: null, lap: 0, confidence: null, ambiguous: false };
  }

  return {
    offsetM: selfState.route_offset_m,
    absoluteOffsetM: selfState.absolute_offset_m ?? selfState.route_offset_m,
    lap: selfState.lap ?? 0,
    // Herdada, não medida: o alerta pode ter sido disparado longe do último
    // ping. É menos confiável por construção.
    confidence: "low",
    ambiguous: selfState.snap_ambiguous ?? false,
  };
}

async function resolveAnchorSafely(
  raceId: string,
  lat: number | null,
  lng: number | null,
  selfState: SelfState,
): Promise<AlertAnchor> {
  if (lat == null || lng == null) return anchorFromState(selfState);

  try {
    const route = await loadRaceRoute(raceId);
    if (!route) return anchorFromState(selfState);

    const snapped = snapToRoute(route.index, { lat, lng }, {
      recordedAtMs: Date.now(),
      previous:
        selfState && selfState.route_offset_m != null
          ? {
              offsetM: selfState.route_offset_m,
              lap: selfState.lap ?? 0,
              recordedAtMs: Date.parse(selfState.recorded_at),
              speedMps: selfState.rolling_speed_mps,
            }
          : null,
      expectedSpeedMps: selfState?.rolling_speed_mps ?? null,
    });

    const lap = Math.min(snapped.lap, Math.max(0, route.laps - 1));

    return {
      offsetM: snapped.offsetM,
      absoluteOffsetM: lap * route.track.totalDistanceM + snapped.offsetM,
      lap,
      confidence: snapped.confidence,
      ambiguous: snapped.ambiguous,
    };
  } catch (error) {
    console.warn("[driver/alert] falha ao ancorar o alerta:", (error as Error).message);
    return anchorFromState(selfState);
  }
}

interface DispatchAndAckParams {
  alert: AlertRow;
  raceId: string;
  positionId: string;
  category: AlertCategory;
  lat: number | null;
  lng: number | null;
  routeOffsetM: number | null;
  ambiguous: boolean;
  positions: Awaited<ReturnType<typeof loadPositions>>;
}

async function dispatchAndAck(params: DispatchAndAckParams): Promise<DriverAlertAck> {
  const base: DriverAlertAck = {
    alertId: params.alert.id,
    status: params.alert.status,
    receivedAt: params.alert.received_at,
    deduplicated: false,
    suggestions: [],
    dispatch: null,
    dispatchFailed: false,
    repairs: [],
  };

  try {
    const outcome = await autoDispatch({
      alertId: params.alert.id,
      raceId: params.raceId,
      category: params.category,
      origin: {
        lat: params.lat,
        lng: params.lng,
        routeOffsetM: params.routeOffsetM,
        ambiguous: params.ambiguous,
      },
      excludePositionIds: [params.positionId],
      positions: params.positions.length > 0 ? params.positions : undefined,
      persistSuggestions: true,
    });

    await logAlertEvent(
      params.alert.id,
      outcome.dispatched ? 'auto_dispatched' : 'dispatch_unavailable',
      'system',
      {
        positionId: params.positionId,
        note: outcome.note,
        dispatchedTo: outcome.dispatched?.positionId ?? null,
        dispatchReason: outcome.dispatched?.reason ?? null,
        originOffsetM: params.routeOffsetM,
        originAmbiguous: params.ambiguous,
      },
    );

    // Ninguém disponível agora não significa ninguém disponível daqui a 30 s.
    if (!outcome.dispatched) await scheduleDispatchRetry(params.alert.id, 0);

    return {
      ...base,
      status: outcome.dispatched ? 'dispatched' : base.status,
      dispatch: outcome.dispatched,
      // Ninguém disponível é falha de acionamento do ponto de vista de quem
      // pediu socorro. A distinção entre 'quebrou' e 'não havia ninguém' fica
      // na auditoria; para o motorista, os dois significam a mesma coisa:
      // ninguém está a caminho, use o rádio.
      dispatchFailed: outcome.dispatched === null,
      suggestions: outcome.suggestions.map((s) => ({
        positionId: s.positionId,
        label: s.label,
        role: s.role,
        routeDistanceM: s.routeDistanceM,
        etaSeconds: s.etaSeconds,
      })),
    };
  } catch (error) {
    await logAlertEvent(params.alert.id, 'dispatch_failed', 'system', {
      positionId: params.positionId,
      message: (error as Error).message,
    });

    // Falhou de verdade (banco fora, exceção): tem que ser reconsiderado, não
    // esquecido. Sem isto o alerta fica órfão pelo resto da prova.
    await scheduleDispatchRetry(params.alert.id, 0);

    return { ...base, dispatchFailed: true };
  }
}

interface SanitizedAlert {
  clientAlertId: string;
  category: AlertCategory;
  /** A categoria enviada não é conhecida por este servidor. */
  categoryUnknown: boolean;
  note: string | null;
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  createdAtIso: string;
  /** O que precisou ser consertado — vai para a auditoria E para o app. */
  repairs: string[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CATEGORIES: AlertCategory[] = ["mechanical", "medical", "other"];

function sanitizeAlert(raw: unknown): SanitizedAlert {
  const p = (raw ?? {}) as Partial<ClientAlert>;
  const repairs: string[] = [];

  let clientAlertId = typeof p.clientAlertId === "string" ? p.clientAlertId.toLowerCase() : "";
  if (!UUID_RE.test(clientAlertId)) {
    clientAlertId = crypto.randomUUID();
    repairs.push("clientAlertId ausente ou malformado — id gerado no servidor");
  }

  let category: AlertCategory = "other";
  let categoryUnknown = false;

  if (typeof p.category === "string" && CATEGORIES.includes(p.category as AlertCategory)) {
    category = p.category as AlertCategory;
  } else {
    // Categoria desconhecida vira "other" no banco (é o que o enum aceita), mas
    // NÃO vira rotina: a prioridade sobe para crítica e o app recebe o aviso.
    // Rebaixar em silêncio um chamado que o servidor não entendeu é o pior
    // caminho possível — foi assim que uma moto foi acionada no lugar da
    // ambulância num alerta que o cliente marcou como emergência.
    categoryUnknown = true;
    repairs.push(
      `categoria "${String(p.category)}" não reconhecida — registrada como "other" com prioridade crítica`,
    );
  }

  const nowMs = Date.now();
  let createdAtMs = typeof p.createdAt === "string" ? Date.parse(p.createdAt) : NaN;

  if (!Number.isFinite(createdAtMs)) {
    createdAtMs = nowMs;
    repairs.push("createdAt inválido — usada a hora do servidor");
  } else if (createdAtMs > nowMs + 60_000) {
    // Relógio adiantado colocaria o alerta no futuro na linha do tempo da
    // direção, onde ninguém procura por ele.
    createdAtMs = nowMs;
    repairs.push("createdAt no futuro — usada a hora do servidor");
  }

  return {
    clientAlertId,
    category,
    categoryUnknown,
    note: typeof p.note === "string" && p.note.trim() ? p.note.trim().slice(0, 2000) : null,
    lat: validCoord(p.lat, 90),
    lng: validCoord(p.lng, 180),
    accuracyM: typeof p.accuracyM === "number" && Number.isFinite(p.accuracyM) ? p.accuracyM : null,
    createdAtIso: new Date(createdAtMs).toISOString(),
    repairs,
  };
}

function validCoord(v: unknown, limit: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  if (v < -limit || v > limit) return null;
  return v;
}

async function findExisting(raceId: string, clientAlertId: string): Promise<AlertRow | null> {
  const { data } = await supabaseAdmin()
    .from("alerts")
    .select(ALERT_ACK_COLUMNS)
    .eq("race_id", raceId)
    .eq("client_alert_id", clientAlertId)
    .maybeSingle<AlertRow>();

  return data ?? null;
}

async function findExistingById(alertId: string): Promise<AlertRow | null> {
  const { data } = await supabaseAdmin()
    .from("alerts")
    .select(ALERT_ACK_COLUMNS)
    .eq("id", alertId)
    .maybeSingle<AlertRow>();

  return data ?? null;
}

/** Ack de um alerta que já existia: estado atual, tal como está no banco. */
async function ackFor(alert: AlertRow, deduplicated: boolean): Promise<DriverAlertAck> {
  const suggestions = await loadStoredSuggestions(alert.id);
  const dispatched = alert.dispatched_position_id
    ? suggestions.find((s) => s.positionId === alert.dispatched_position_id)
    : undefined;

  return {
    alertId: alert.id,
    status: alert.status,
    receivedAt: alert.received_at,
    deduplicated,
    suggestions,
    dispatch: dispatched
      ? {
          positionId: dispatched.positionId,
          label: dispatched.label,
          role: dispatched.role,
          reason: alert.dispatch_reason ?? "",
          etaSeconds: dispatched.etaSeconds,
        }
      : null,
    dispatchFailed: alert.dispatched_position_id === null,
    repairs: [],
  };
}

async function loadStoredSuggestions(alertId: string): Promise<DriverAlertAck["suggestions"]> {
  const { data } = await supabaseAdmin()
    .from("alert_suggestions")
    .select("position_id, rank, route_distance_m, eta_seconds, race_positions!position_id(label, role)")
    .eq("alert_id", alertId)
    .order("rank", { ascending: true })
    .returns<SuggestionRow[]>();

  if (!data) return [];

  return data.map((s) => {
    const position = unwrapEmbed(s.race_positions);
    return {
      positionId: s.position_id,
      label: position?.label ?? "Apoio",
      role: position?.role ?? "other",
      routeDistanceM: s.route_distance_m,
      etaSeconds: s.eta_seconds,
    };
  });
}
