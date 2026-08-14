import "server-only";

import { NextResponse } from "next/server";

import {
  autoDispatch,
  CATEGORY_VISIBILITY,
  loadPositions,
  logAlertEvent,
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

interface AlertRow {
  id: string;
  status: DriverAlertStatus;
  received_at: string;
  route_offset_m: number | null;
  lat: number | null;
  lng: number | null;
  dispatched_position_id: string | null;
  dispatch_reason: string | null;
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
  const auth = await authenticateDriver(request);
  if (!auth.ok) return auth.response;

  const session = auth.session;
  const admin = supabaseAdmin();

  const body = await readJsonBody(request);
  if (!body.ok) {
    return driverError("bad_request", "Corpo da requisição não é JSON válido.");
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

    return driverJson<DriverAlertAck>(await ackFor(existing, true));
  }

  const priority = ALERT_CATEGORY_META[input.category].defaultPriority;
  const visibility = CATEGORY_VISIBILITY[input.category];

  // O offset tem que ser calculado ANTES do insert: o gatilho `alerts_freeze_facts`
  // trata os fatos do alerta (inclusive `route_offset_m`) como imutáveis, e com
  // razão — um incidente que pode ser reposicionado depois não é testemunho.
  // O cálculo vai dentro de try/catch: sem offset o alerta ainda é gravado, e a
  // comparação de proximidade cai para linha reta, marcada como tal.
  const positions = await loadPositionsSafely(session.raceId);
  const self = positions.find((p) => p.positionId === session.positionId);
  const routeOffsetM = await resolveOffsetSafely(
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
      route_offset_m: routeOffsetM,
      proximity_radius_m: visibility.proximityRadiusM,
      visible_until: new Date(Date.now() + visibility.visibleForMs).toISOString(),
    })
    .select(
      "id, status, received_at, route_offset_m, lat, lng, dispatched_position_id, dispatch_reason",
    )
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
        "Não foi possível registrar o alerta. Mantenha na fila e avise pelo rádio.",
      );
    }

    return driverJson<DriverAlertAck>(await ackFor(alert, true));
  }

  if (!alert) {
    return driverError(
      "server_error",
      "Não foi possível registrar o alerta. Mantenha na fila e avise pelo rádio.",
    );
  }

  await logAlertEvent(alert.id, "created", "driver", {
    clientAlertId: input.clientAlertId,
    category: input.category,
    priority,
    repairs: input.repairs,
    positionId: session.positionId,
    positionLabel: session.position.label,
  });

  // A partir daqui nada mais pode falhar de forma relevante: o alerta existe e
  // já está visível para todos os veículos da prova.
  return driverJson<DriverAlertAck>(
    await dispatchAndAck({
      alert,
      raceId: session.raceId,
      positionId: session.positionId,
      category: input.category,
      lat: input.lat ?? self?.state?.lat ?? null,
      lng: input.lng ?? self?.state?.lng ?? null,
      routeOffsetM,
      positions,
    }),
  );
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
async function resolveOffsetSafely(
  raceId: string,
  lat: number | null,
  lng: number | null,
  selfState: {
    lat: number;
    lng: number;
    route_offset_m: number | null;
    recorded_at: string;
    rolling_speed_mps: number | null;
  } | null,
): Promise<number | null> {
  if (lat == null || lng == null) return selfState?.route_offset_m ?? null;

  try {
    const route = await loadRaceRoute(raceId);
    if (!route) return selfState?.route_offset_m ?? null;

    const snapped = snapToRoute(route.index, { lat, lng }, {
      recordedAtMs: Date.now(),
      previous:
        selfState && selfState.route_offset_m != null
          ? {
              offsetM: selfState.route_offset_m,
              recordedAtMs: Date.parse(selfState.recorded_at),
              speedMps: selfState.rolling_speed_mps,
            }
          : null,
      expectedSpeedMps: selfState?.rolling_speed_mps ?? null,
    });

    return snapped.offsetM;
  } catch (error) {
    console.warn("[driver/alert] falha ao ancorar o alerta:", (error as Error).message);
    return selfState?.route_offset_m ?? null;
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
  };

  try {
    const outcome = await autoDispatch({
      alertId: params.alert.id,
      raceId: params.raceId,
      category: params.category,
      origin: { lat: params.lat, lng: params.lng, routeOffsetM: params.routeOffsetM },
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
      },
    );

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

    return { ...base, dispatchFailed: true };
  }
}

interface SanitizedAlert {
  clientAlertId: string;
  category: AlertCategory;
  note: string | null;
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  createdAtIso: string;
  /** O que precisou ser consertado — vai para a auditoria. */
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
  if (typeof p.category === "string" && CATEGORIES.includes(p.category as AlertCategory)) {
    category = p.category as AlertCategory;
  } else {
    repairs.push(`categoria inválida (${String(p.category)}) — registrada como "other"`);
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
    .select(
      "id, status, received_at, route_offset_m, lat, lng, dispatched_position_id, dispatch_reason",
    )
    .eq("race_id", raceId)
    .eq("client_alert_id", clientAlertId)
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
