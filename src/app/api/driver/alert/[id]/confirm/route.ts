import "server-only";

import { NextResponse } from "next/server";

import { logAlertEvent } from "@/app/api/driver/_lib/dispatch";
import { driverError, driverJson, readJsonBody } from "@/app/api/driver/_lib/http";
import { authenticateDriver } from "@/app/api/driver/_lib/session";
import type {
  AlertConfirmationKind,
  AlertConfirmationRequest,
  AlertConfirmationResult,
} from "@/lib/driver/protocol";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Confirmação colaborativa de um alerta.
 *
 * Quem passa pelo local diz o que viu. É o mecanismo que impede o mapa de
 * encher de alerta fantasma — e, mais importante, dá à direção uma segunda
 * fonte independente sobre um incidente que ela não consegue enxergar.
 *
 * O que este endpoint deliberadamente NÃO faz: encerrar o alerta. Três
 * "liberado" não resolvem um chamado médico. Confirmação é evidência, não
 * decisão — e a decisão de dar um incidente por encerrado é de quem responde
 * por ela. Fechar sozinho seria falhar contra o lado do socorro.
 */

const KINDS: AlertConfirmationKind[] = ["still_there", "cleared", "not_found"];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const payload = body.value as Partial<AlertConfirmationRequest>;

  const kind = payload?.kind;
  if (!kind || !KINDS.includes(kind)) {
    return driverError("bad_request", `Tipo de confirmação inválido: ${String(kind)}.`);
  }

  const clientConfirmationId =
    typeof payload.clientConfirmationId === "string" &&
    UUID_RE.test(payload.clientConfirmationId)
      ? payload.clientConfirmationId.toLowerCase()
      : crypto.randomUUID();

  const { data: alert } = await admin
    .from("alerts")
    .select("id")
    .eq("id", id)
    .eq("race_id", session.raceId)
    .maybeSingle<{ id: string }>();

  if (!alert) return driverError("not_found", "Alerta não encontrado nesta prova.");

  const { data: existing } = await admin
    .from("alert_confirmations")
    .select("id, kind")
    .eq("position_id", session.positionId)
    .eq("client_confirmation_id", clientConfirmationId)
    .maybeSingle<{ id: string; kind: AlertConfirmationKind }>();

  if (existing) {
    return driverJson<AlertConfirmationResult>({
      alertId: alert.id,
      kind: existing.kind,
      deduplicated: true,
    });
  }

  const { error } = await admin.from("alert_confirmations").insert({
    alert_id: alert.id,
    position_id: session.positionId,
    race_id: session.raceId,
    kind,
    note:
      typeof payload.note === "string" && payload.note.trim()
        ? payload.note.trim().slice(0, 500)
        : null,
    lat: typeof payload.lat === "number" ? payload.lat : null,
    lng: typeof payload.lng === "number" ? payload.lng : null,
    client_confirmation_id: clientConfirmationId,
  });

  if (error && error.code !== "23505") {
    return driverError("server_error", "Falha ao registrar a confirmação. Tente de novo.");
  }

  await logAlertEvent(alert.id, "confirmation", "driver", {
    positionId: session.positionId,
    positionLabel: session.position.label,
    kind,
  });

  return driverJson<AlertConfirmationResult>({
    alertId: alert.id,
    kind,
    // 23505 aqui significa que a mesma confirmação chegou duas vezes em
    // paralelo — o resultado final é idêntico, então é sucesso.
    deduplicated: Boolean(error),
  });
}
