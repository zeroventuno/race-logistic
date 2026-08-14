import "server-only";

import { NextResponse } from "next/server";

import {
  autoDispatch,
  declinedPositions,
  logAlertEvent,
  scheduleDispatchRetry,
} from "@/app/api/driver/_lib/dispatch";
import { driverError, driverJson, readJsonBody } from "@/app/api/driver/_lib/http";
import { authenticateDriver } from "@/app/api/driver/_lib/session";
import type {
  DispatchResponseAction,
  DispatchResponseRequest,
  DispatchResponseResult,
  DriverAlertStatus,
} from "@/lib/driver/protocol";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AlertCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Resposta do veículo acionado.
 *
 * Fecha o laço que o acionamento automático abre. Sem isto, quem pediu socorro
 * vê "ambulância acionada" e não sabe se a ambulância viu, se está indo, ou se
 * o celular dela está no fundo da mochila.
 *
 * A recusa é a operação mais importante das três, e a mais fácil de fazer
 * errado: RECUSA SEM REACIONAMENTO É UM ALERTA ÓRFÃO. O veículo se desobriga,
 * a tela dele limpa, e o alerta fica marcado como "despachado" para alguém que
 * não vai. Por isso a recusa dispara imediatamente a escolha do próximo da
 * lista, e quando não há próximo isso é devolvido como `orphaned: true` — que a
 * interface transforma em instrução de pegar o rádio.
 *
 * Idempotente em todas as ações: a fila offline reenvia, e um "estou indo"
 * repetido não pode reabrir um alerta que já foi resolvido.
 */

const ACTIONS: DispatchResponseAction[] = ["on_my_way", "arrived", "decline"];

/** Estados finais: nenhuma resposta de acionamento os move. */
const CLOSED: DriverAlertStatus[] = ["resolved", "cancelled"];

interface AlertRow {
  id: string;
  race_id: string;
  category: AlertCategory;
  status: DriverAlertStatus;
  lat: number | null;
  lng: number | null;
  route_offset_m: number | null;
  absolute_offset_m: number | null;
  route_offset_ambiguous: boolean;
  dispatch_attempts: number;
  raised_by_position_id: string | null;
  dispatched_position_id: string | null;
  dispatch_acknowledged_at: string | null;
  on_scene_at: string | null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await authenticateDriver(request);
  if (!auth.ok) return auth.response;

  const session = auth.session;
  const admin = supabaseAdmin();
  const { id } = await context.params;

  const body = await readJsonBody(request);
  if (!body.ok) return driverError("bad_request", "Corpo da requisição não é JSON válido.");

  const payload = body.value as Partial<DispatchResponseRequest>;
  const action = payload?.action;

  if (!action || !ACTIONS.includes(action)) {
    return driverError("bad_request", `Ação inválida: ${String(action)}.`);
  }

  const { data: alert } = await admin
    .from("alerts")
    .select(
      "id, race_id, category, status, lat, lng, route_offset_m, absolute_offset_m, " +
        "route_offset_ambiguous, dispatch_attempts, raised_by_position_id, " +
        "dispatched_position_id, dispatch_acknowledged_at, on_scene_at",
    )
    .eq("id", id)
    .eq("race_id", session.raceId)
    .maybeSingle<AlertRow>();

  if (!alert) {
    return driverError("not_found", "Alerta não encontrado nesta prova.");
  }

  const result = (status: DriverAlertStatus, extra?: Partial<DispatchResponseResult>) =>
    driverJson<DispatchResponseResult>({
      alertId: alert.id,
      status,
      reassignedTo: null,
      orphaned: false,
      ...extra,
    });

  if (CLOSED.includes(alert.status)) {
    // Chegou tarde: o alerta já foi encerrado. Responder 200 é o que faz o app
    // parar de reenviar; um erro aqui viraria retry infinito.
    return result(alert.status);
  }

  // O acionamento pode ter mudado de dono enquanto a resposta estava na fila
  // offline. Aplicar mesmo assim moveria o alerta para trás no tempo.
  if (alert.dispatched_position_id !== session.positionId) {
    await logAlertEvent(alert.id, "stale_response_ignored", "driver", {
      positionId: session.positionId,
      action,
      currentDispatch: alert.dispatched_position_id,
    });
    return result(alert.status);
  }

  const now = new Date().toISOString();

  if (action === "on_my_way") {
    if (alert.dispatch_acknowledged_at) return result(alert.status);

    await admin
      .from("alerts")
      .update({ dispatch_acknowledged_at: now, status: "en_route" })
      .eq("id", alert.id);

    await logAlertEvent(alert.id, "dispatch_accepted", "driver", {
      positionId: session.positionId,
      positionLabel: session.position.label,
    });

    return result("en_route");
  }

  if (action === "arrived") {
    if (alert.on_scene_at) return result(alert.status);

    await admin
      .from("alerts")
      .update({
        on_scene_at: now,
        // Chegar implica ter aceitado, mesmo que o "estou indo" tenha se
        // perdido na rede. Sem isto o histórico mostraria uma chegada sem
        // partida.
        dispatch_acknowledged_at: alert.dispatch_acknowledged_at ?? now,
        status: "on_scene",
      })
      .eq("id", alert.id);

    await logAlertEvent(alert.id, "on_scene", "driver", {
      positionId: session.positionId,
      positionLabel: session.position.label,
    });

    return result("on_scene");
  }

  // --- Recusa ---------------------------------------------------------------

  const reason =
    typeof payload.reason === "string" && payload.reason.trim()
      ? payload.reason.trim().slice(0, 300)
      : "sem motivo informado";

  await admin
    .from("alerts")
    .update({
      dispatch_declined_at: now,
      dispatch_decline_reason: reason,
      // Volta a "aberto" antes de reacionar: se o reacionamento falhar no meio,
      // o alerta fica visivelmente sem dono em vez de parecer despachado.
      status: "open",
      dispatched_position_id: null,
    })
    .eq("id", alert.id);

  await logAlertEvent(alert.id, "dispatch_declined", "driver", {
    positionId: session.positionId,
    positionLabel: session.position.label,
    reason,
  });

  try {
    const excluded = new Set<string>(await declinedPositions(alert.id));
    excluded.add(session.positionId);
    if (alert.raised_by_position_id) excluded.add(alert.raised_by_position_id);

    const outcome = await autoDispatch({
      alertId: alert.id,
      raceId: alert.race_id,
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
      outcome.dispatched ? "auto_redispatched" : "dispatch_exhausted",
      "system",
      {
        positionId: session.positionId,
        declinedBy: [...excluded],
        dispatchedTo: outcome.dispatched?.positionId ?? null,
        note: outcome.note,
      },
    );

    if (!outcome.dispatched) {
      // Ninguém agora. O alerta fica marcado para nova tentativa: o veículo que
      // está num túnel volta a transmitir em segundos, e sem isto o alerta
      // ficaria órfão pelo resto da prova.
      await scheduleDispatchRetry(alert.id, alert.dispatch_attempts);
      return result("open", { orphaned: true });
    }

    return result("dispatched", {
      reassignedTo: {
        positionId: outcome.dispatched.positionId,
        label: outcome.dispatched.label,
        role: outcome.dispatched.role,
      },
    });
  } catch (error) {
    await logAlertEvent(alert.id, "redispatch_failed", "system", {
      positionId: session.positionId,
      message: (error as Error).message,
    });

    // A recusa foi registrada e o alerta está sem dono. Dizer isso é o que
    // permite ao motorista que recusou avisar pelo rádio — melhor um humano
    // sabendo do buraco do que um estado bonito e falso.
    await scheduleDispatchRetry(alert.id, alert.dispatch_attempts);
    return result("open", { orphaned: true });
  }
}
