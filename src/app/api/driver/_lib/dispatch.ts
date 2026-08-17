import "server-only";

import { unwrapEmbed } from "@/app/api/driver/_lib/http";
import {
  OCCUPYING_STATUSES as OCCUPYING,
  dispatchRetryDelayMs as retryDelayMs,
} from "@/app/api/driver/_lib/policy";
import {
  computeNearestSupport,
  type NearestCandidate,
  type NearestOrigin,
  type NearestSuggestion,
} from "@/lib/alerts/nearest";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AlertCategory, PositionRole } from "@/lib/types";

export {
  CATEGORY_VISIBILITY,
  OCCUPYING_STATUSES,
  dispatchRetryDelayMs,
} from "@/app/api/driver/_lib/policy";

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
  absolute_offset_m: number | null;
  lap: number | null;
  snap_ambiguous: boolean | null;
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
        "position_state!position_id(lat, lng, route_offset_m, absolute_offset_m, lap, " +
        "snap_ambiguous, rolling_speed_mps, recorded_at)",
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

/**
 * Veículos que já estão a caminho de outro alerta ativo.
 *
 * Consultado no INSTANTE do acionamento, não em cache: entre um acidente e
 * outro podem passar segundos, e o índice único do banco recusa a segunda
 * gravação de qualquer forma. Melhor escolher outro veículo do que descobrir
 * pelo erro.
 */
export async function busyPositions(raceId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin()
    .from("alerts")
    .select("dispatched_position_id")
    .eq("race_id", raceId)
    .not("dispatched_position_id", "is", null)
    .in("status", OCCUPYING as unknown as string[]);

  if (error) throw new Error(`falha ao consultar acionamentos ativos: ${error.message}`);

  return (data ?? [])
    .map((row) => row.dispatched_position_id as string | null)
    .filter((id): id is string => Boolean(id));
}

export function toCandidates(positions: LoadedPosition[]): NearestCandidate[] {
  return positions.map((p) => ({
    positionId: p.positionId,
    label: p.label,
    role: p.role,
    isDispatchable: p.isDispatchable,
    lat: p.state?.lat ?? null,
    lng: p.state?.lng ?? null,
    // Offset ABSOLUTO: num circuito é o único número comparável entre dois
    // veículos. `absolute_offset_m` pode ser nulo em linhas antigas, e aí o
    // offset local com a volta reconstruída é a melhor aproximação.
    routeOffsetM:
      p.state?.absolute_offset_m ??
      (p.state?.route_offset_m != null ? p.state.route_offset_m : null),
    ambiguous: p.state?.snap_ambiguous ?? false,
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
  /** Já acionados para outro alerta ativo. Consultado se não vier pronto. */
  busyPositionIds?: string[];
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
  const busy = params.busyPositionIds ?? (await busyPositions(params.raceId));

  const candidates = toCandidates(positions).filter((c) => !excluded.has(c.positionId));

  // O laço existe por causa da corrida entre dois acidentes simultâneos: entre
  // consultar quem está livre e gravar o acionamento, outro alerta pode ter
  // tomado o mesmo veículo. O índice único do banco recusa, e aí tentamos o
  // próximo da lista em vez de devolver um alerta sem dono.
  const takenNow = new Set(busy);

  for (let attempt = 0; attempt < 4; attempt++) {
    const result = computeNearestSupport({
      category: params.category,
      origin: params.origin,
      candidates,
      nowMs: Date.now(),
      maxResults: 5,
      busyPositionIds: [...takenNow],
    });

    if (attempt === 0 && params.persistSuggestions && result.suggestions.length > 0) {
      // `ignoreDuplicates` porque uma reacionação recalcula a mesma lista: a
      // tabela tem unique (alert_id, position_id) e o snapshot original é o que
      // interessa para a revisão pós-prova.
      const { error } = await admin.from('alert_suggestions').upsert(
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
        { onConflict: 'alert_id,position_id', ignoreDuplicates: true },
      );

      if (error) throw new Error(`gravação das sugestões falhou: ${error.message}`);
    }

    const top = result.suggestions[0];

    if (!top) {
      // NINGUÉM FOI ACIONADO — e o diretor precisa saber POR QUÊ, agora.
      //
      // "Nenhum apoio a caminho" sem explicação faz o diretor procurar o
      // problema no lugar errado. A nota diz o que aconteceu de verdade
      // ("2 candidatos ignorados por sinal perdido"), e essa frase é
      // acionável: significa pegar o rádio, não recarregar a página.
      //
      // Vai em `dispatch_reason`, que é o campo do "por que este
      // acionamento é o que é" — inclusive quando ele não existe. O guarda de
      // `dispatched_position_id` nulo impede que uma retentativa apague o
      // motivo de um acionamento que deu certo antes.
      const { error: notaErro } = await admin
        .from('alerts')
        .update({ dispatch_reason: result.note })
        .eq('id', params.alertId)
        .is('dispatched_position_id', null);

      if (notaErro) {
        // Não pode derrubar o alerta: sem a nota o diretor fica sem a
        // explicação, com o alerta perdido ele fica sem o acidente.
        console.warn(
          '[driver/alert] falha ao gravar o motivo de não acionar:',
          notaErro.message,
        );
      }

      return { dispatched: null, suggestions: result.suggestions, note: result.note };
    }

    const reason = describeDispatch(top);

    const { data, error: updateError } = await admin
      .from('alerts')
      .update({
        dispatched_position_id: top.positionId,
        dispatched_at: new Date().toISOString(),
        dispatch_mode: 'auto',
        dispatch_reason: reason,
        status: 'dispatched',
        // Um acionamento novo começa limpo: a recusa anterior vive em
        // `alert_events`, que é a trilha que ninguém sobrescreve.
        dispatch_acknowledged_at: null,
        dispatch_declined_at: null,
        dispatch_decline_reason: null,
        dispatch_retry_after: null,
      })
      .eq('id', params.alertId)
      .select('id');

    if (updateError) {
      // 23505 = o índice `alerts_one_active_dispatch_per_vehicle` recusou:
      // este veículo acabou de ser acionado para outro alerta entre a consulta
      // e a gravação. Tentamos o próximo da lista.
      if (updateError.code === '23505') {
        takenNow.add(top.positionId);
        continue;
      }
      throw new Error(`falha ao gravar acionamento: ${updateError.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('acionamento não gravado: alerta não encontrado.');
    }

    await admin.from('alert_notifications').upsert(
      {
        alert_id: params.alertId,
        position_id: top.positionId,
        race_id: params.raceId,
        kind: 'dispatch',
      },
      { onConflict: 'alert_id,position_id,kind', ignoreDuplicates: true },
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

  return {
    dispatched: null,
    suggestions: [],
    note: 'Todos os candidatos foram tomados por outros alertas durante o acionamento.',
  };
}

/**
 * Marca o alerta para nova tentativa de acionamento.
 *
 * Sem isto, o cenário do túnel é permanente: se todos os despacháveis estavam
 * sem sinal no instante do alerta, ninguém é acionado e NADA reconsidera —
 * trinta segundos depois a ambulância volta a transmitir e o alerta continua
 * órfão pelo resto da prova.
 */
export async function scheduleDispatchRetry(
  alertId: string,
  attempts: number,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('alerts')
    .update({
      dispatch_attempts: attempts + 1,
      dispatch_retry_after: new Date(
        Date.now() + retryDelayMs(attempts),
      ).toISOString(),
    })
    .eq('id', alertId);

  if (error) {
    console.warn('[driver/alert] falha ao agendar retentativa:', error.message);
  }
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
    if (typeof id === "string" && id) out.push(id);
  }
  return out;
}
