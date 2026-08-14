import "server-only";

import { unwrapEmbed } from "@/app/api/driver/_lib/http";
import {
  computeNearestSupport,
  type NearestCandidate,
  type NearestOrigin,
  type NearestSuggestion,
} from "@/lib/alerts/nearest";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AlertCategory, PositionRole } from "@/lib/types";

/**
 * Acionamento automático do socorro.
 *
 * A regra que decide tudo aqui é FALHAR PARA O LADO DO SOCORRO: o veículo é
 * acionado no mesmo instante em que o alerta é gravado, sem esperar ninguém
 * autorizar. O diretor pode REDIRECIONAR depois; ele não precisa AUTORIZAR
 * antes. Um alerta de acidente parado esperando um clique é um alerta que
 * falhou, e quem está no asfalto não tem como saber que o clique não veio.
 *
 * O outro lado dessa regra: o acionamento nunca pode derrubar a gravação do
 * alerta. Este módulo é chamado DEPOIS de o alerta existir, e quem chama
 * envolve tudo em `try/catch`. Se o acionamento falhar, o alerta continua no
 * banco, sem veículo designado — e essa ausência é reportada de forma visível,
 * nunca em silêncio.
 */

/**
 * Raio de aviso de proximidade e tempo de vida no mapa, por categoria.
 *
 * O raio é distância AO LONGO DO PERCURSO até o ponto do alerta. Os valores
 * saem da velocidade típica de um veículo de apoio (~60 km/h = 1 km/min):
 *
 *  - medical, 3 km ≈ 3 minutos de aviso. É o que dá tempo de reduzir a
 *    velocidade e chegar preparado numa cena de acidente, em vez de aparecer em
 *    cima dela numa curva.
 *  - mechanical, 1,5 km ≈ 1,5 minuto. Um carro parado no acostamento precisa
 *    ser evitado, não antecipado de longe.
 *  - other, 2 km. Meio-termo: pode ser estrada bloqueada, pode ser nada.
 *
 * A validade no mapa segue a mesma lógica: um socorro médico continua relevante
 * por horas; uma parada mecânica se resolve em minutos e vira poluição visual
 * se ficar. Alerta resolvido some antes disso, de qualquer forma.
 */
export const CATEGORY_VISIBILITY: Record<
  AlertCategory,
  { proximityRadiusM: number; visibleForMs: number }
> = {
  medical: { proximityRadiusM: 3000, visibleForMs: 3 * 60 * 60_000 },
  mechanical: { proximityRadiusM: 1500, visibleForMs: 45 * 60_000 },
  other: { proximityRadiusM: 2000, visibleForMs: 2 * 60 * 60_000 },
};

export interface DispatchTarget {
  positionId: string;
  label: string;
  role: PositionRole;
  reason: string;
  etaSeconds: number | null;
}

export interface DispatchOutcome {
  dispatched: DispatchTarget | null;
  suggestions: NearestSuggestion[];
  note: string;
}

interface StateEmbed {
  lat: number;
  lng: number;
  route_offset_m: number | null;
  rolling_speed_mps: number | null;
  recorded_at: string;
}

interface CandidateRow {
  id: string;
  label: string;
  role: PositionRole;
  is_dispatchable: boolean;
  position_state: StateEmbed | StateEmbed[] | null;
}

export interface LoadedPosition {
  positionId: string;
  label: string;
  role: PositionRole;
  isDispatchable: boolean;
  state: StateEmbed | null;
}

export async function loadPositions(raceId: string): Promise<LoadedPosition[]> {
  const { data, error } = await supabaseAdmin()
    .from("race_positions")
    .select(
      "id, label, role, is_dispatchable, " +
        "position_state!position_id(lat, lng, route_offset_m, rolling_speed_mps, recorded_at)",
    )
    .eq("race_id", raceId)
    .returns<CandidateRow[]>();

  if (error) throw new Error(`falha ao carregar posições: ${error.message}`);

  return (data ?? []).map((p) => ({
    positionId: p.id,
    label: p.label,
    role: p.role,
    isDispatchable: p.is_dispatchable,
    state: unwrapEmbed(p.position_state),
  }));
}

export function toCandidates(positions: LoadedPosition[]): NearestCandidate[] {
  return positions.map((p) => ({
    positionId: p.positionId,
    label: p.label,
    role: p.role,
    isDispatchable: p.isDispatchable,
    lat: p.state?.lat ?? null,
    lng: p.state?.lng ?? null,
    routeOffsetM: p.state?.route_offset_m ?? null,
    rollingSpeedMps: p.state?.rolling_speed_mps ?? null,
    recordedAtMs: p.state ? Date.parse(p.state.recorded_at) : null,
  }));
}

export interface AutoDispatchParams {
  alertId: string;
  raceId: string;
  category: AlertCategory;
  origin: NearestOrigin;
  /** Quem NÃO pode ser acionado: o próprio autor e quem já recusou. */
  excludePositionIds: string[];
  positions?: LoadedPosition[];
  /** Numa reacionação as sugestões antigas já estão gravadas. */
  persistSuggestions: boolean;
}

/**
 * Escolhe o veículo, grava o acionamento e avisa o escolhido.
 *
 * Lança em caso de falha de banco — de propósito. Quem chama decide o que
 * fazer, e a decisão é sempre a mesma: registrar que o acionamento falhou e
 * seguir em frente com o alerta gravado.
 */
export async function autoDispatch(params: AutoDispatchParams): Promise<DispatchOutcome> {
  const admin = supabaseAdmin();

  const positions = params.positions ?? (await loadPositions(params.raceId));
  const excluded = new Set(params.excludePositionIds);

  const result = computeNearestSupport({
    category: params.category,
    origin: params.origin,
    candidates: toCandidates(positions).filter((c) => !excluded.has(c.positionId)),
    nowMs: Date.now(),
    maxResults: 5,
  });

  if (params.persistSuggestions && result.suggestions.length > 0) {
    // `ignoreDuplicates` porque uma reacionação recalcula a mesma lista: a
    // tabela tem unique (alert_id, position_id) e o snapshot original é o que
    // interessa para a revisão pós-prova.
    const { error } = await admin.from("alert_suggestions").upsert(
      result.suggestions.map((s) => ({
        alert_id: params.alertId,
        position_id: s.positionId,
        rank: s.rank,
        route_distance_m: s.routeDistanceM,
        straight_distance_m: s.straightDistanceM,
        eta_seconds: s.etaSeconds,
        is_ahead: s.isAhead,
        reason: s.reason,
      })),
      { onConflict: "alert_id,position_id", ignoreDuplicates: true },
    );

    if (error) throw new Error(`gravação das sugestões falhou: ${error.message}`);
  }

  const top = result.suggestions[0];

  if (!top) {
    return { dispatched: null, suggestions: result.suggestions, note: result.note };
  }

  const reason = describeDispatch(top);

  const { error: updateError } = await admin
    .from("alerts")
    .update({
      dispatched_position_id: top.positionId,
      dispatched_at: new Date().toISOString(),
      dispatch_mode: "auto",
      dispatch_reason: reason,
      status: "dispatched",
      // Um acionamento novo começa limpo: a recusa anterior vive em
      // `alert_events`, que é a trilha que ninguém sobrescreve.
      dispatch_acknowledged_at: null,
      dispatch_declined_at: null,
      dispatch_decline_reason: null,
    })
    .eq("id", params.alertId);

  if (updateError) throw new Error(`falha ao gravar acionamento: ${updateError.message}`);

  await admin.from("alert_notifications").upsert(
    {
      alert_id: params.alertId,
      position_id: top.positionId,
      race_id: params.raceId,
      kind: "dispatch",
    },
    { onConflict: "alert_id,position_id,kind", ignoreDuplicates: true },
  );

  return {
    dispatched: {
      positionId: top.positionId,
      label: top.label,
      role: top.role,
      reason,
      etaSeconds: top.etaSeconds,
    },
    suggestions: result.suggestions,
    note: result.note,
  };
}

/** Texto que o diretor lê para entender (e contestar) a escolha do sistema. */
function describeDispatch(s: NearestSuggestion): string {
  const eta = s.etaSeconds == null ? "ETA indisponível" : `~${Math.max(1, Math.round(s.etaSeconds / 60))} min`;
  return `${s.label} — ${s.reason} · ${eta}`;
}

/** Auditoria. Nunca lança: um evento perdido não pode derrubar um alerta. */
export async function logAlertEvent(
  alertId: string,
  type: string,
  actorType: "driver" | "director" | "system",
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await supabaseAdmin().from("alert_events").insert({
      alert_id: alertId,
      type,
      actor_type: actorType,
      actor_id: payload.positionId ? String(payload.positionId) : null,
      payload,
    });
  } catch (error) {
    console.warn("[driver/alert] evento de auditoria perdido:", (error as Error).message);
  }
}

/** Posições que já recusaram este alerta, lidas da trilha de auditoria. */
export async function declinedPositions(alertId: string): Promise<string[]> {
  const { data } = await supabaseAdmin()
    .from("alert_events")
    .select("payload")
    .eq("alert_id", alertId)
    .eq("type", "dispatch_declined")
    .limit(50);

  const out: string[] = [];
  for (const row of data ?? []) {
    const id = (row.payload as { positionId?: string } | null)?.positionId;
    if (id) out.push(id);
  }
  return out;
}
