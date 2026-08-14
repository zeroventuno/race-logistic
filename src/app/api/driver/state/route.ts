import "server-only";

import { NextResponse } from "next/server";

import { driverError, sha256Hex, unwrapEmbed } from "@/app/api/driver/_lib/http";
import { authenticateDriver, touchSession } from "@/app/api/driver/_lib/session";
import {
  ACTIVE_ALERT_STATUSES,
  type AlertProximity,
  type DriverAlertView,
  type DriverAlertStatus,
  type DriverStateResponse,
  type DriverVehicle,
} from "@/lib/driver/protocol";
import { computeGap, type GapResult, type OffsetSample } from "@/lib/route/gap";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AlertCategory, PositionRole } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Estado ao vivo para o app do motorista (polling).
 *
 * O motorista não tem Realtime: o celular dele está com a tela ligada, o GPS
 * ligado e possivelmente 3G ruim, e uma conexão WebSocket persistente nesse
 * cenário cai, reconecta e gasta bateria sem entregar nada melhor que um GET
 * a cada 10 s.
 *
 * A resposta carrega três coisas de naturezas diferentes:
 *
 *  1. ONDE ESTÃO TODOS. O mapa do motorista é o mesmo mapa da direção.
 *
 *  2. QUAIS ALERTAS ESTÃO ATIVOS NA PROVA. Alerta não é informação privada da
 *     direção: uma moto que se aproxima do km 42 precisa saber que tem um
 *     acidente 800 m à frente antes de chegar nele.
 *
 *  3. O QUE É COMIGO. Fui acionado? Tem alerta na minha frente? Estes dois
 *     campos vêm separados e em destaque porque disputam a atenção de alguém
 *     dirigindo, e misturá-los com o resto é como esconder.
 *
 * Duas economias explícitas, porque quem paga o pacote de dados é o motorista:
 *
 *  - ETAG. A maior parte das respostas é idêntica à anterior. `If-None-Match`
 *    transforma o polling num 304 sem corpo. A assinatura ignora de propósito
 *    tudo que muda a cada segundo (hora do servidor, idade dos pings), senão
 *    o ETag nunca bateria e o cabeçalho seria decoração.
 *
 *  - IDADE CALCULADA NO CLIENTE. A resposta manda `recordedAt` e `serverTime`;
 *    quantos segundos faz é conta do app.
 */

/** Janela de histórico usada no cálculo medido do gap. */
const GAP_HISTORY_MS = 90 * 60_000;

/**
 * Memo curto do gap por prova.
 *
 * Com 12 motoristas consultando a cada 10 s, o histórico das duas posições de
 * referência seria lido 72 vezes por minuto para produzir sempre o mesmo
 * número. 5 s de cache tornam isso uma leitura a cada 5 s, e ninguém percebe a
 * diferença num valor que se move em minutos.
 */
const GAP_CACHE_TTL_MS = 5_000;

const gapCache = new Map<string, { atMs: number; value: GapResult }>();

interface StateEmbed {
  lat: number;
  lng: number;
  recorded_at: string;
  route_offset_m: number | null;
  off_route: boolean;
  rolling_speed_mps: number | null;
  battery_pct: number | null;
}

interface PositionRow {
  id: string;
  label: string;
  role: PositionRole;
  ordinal: number;
  is_reference_lead: boolean;
  is_reference_sweep: boolean;
  position_state: StateEmbed | StateEmbed[] | null;
}

interface AlertRow {
  id: string;
  client_alert_id: string;
  category: AlertCategory;
  status: DriverAlertStatus;
  created_at: string;
  received_at: string;
  note: string | null;
  lat: number | null;
  lng: number | null;
  route_offset_m: number | null;
  proximity_radius_m: number;
  raised_by_position_id: string | null;
  dispatched_position_id: string | null;
  dispatch_mode: "auto" | "manual" | null;
  dispatch_reason: string | null;
  dispatched_at: string | null;
  dispatch_acknowledged_at: string | null;
  dispatch_declined_at: string | null;
  on_scene_at: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
}

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await authenticateDriver(request);
  if (!auth.ok) return auth.response;

  const session = auth.session;
  const admin = supabaseAdmin();
  const nowIso = new Date().toISOString();

  const [positionsResult, activeAlertsResult, ownAlertsResult] = await Promise.all([
    admin
      .from("race_positions")
      .select(
        "id, label, role, ordinal, is_reference_lead, is_reference_sweep, " +
          "position_state!position_id(lat, lng, recorded_at, route_offset_m, off_route, rolling_speed_mps, battery_pct)",
      )
      .eq("race_id", session.raceId)
      .order("ordinal", { ascending: true })
      .returns<PositionRow[]>(),
    admin
      .from("alerts")
      .select(ALERT_COLUMNS)
      .eq("race_id", session.raceId)
      .in("status", ACTIVE_ALERT_STATUSES as unknown as string[])
      .or(`visible_until.is.null,visible_until.gt.${nowIso}`)
      .order("received_at", { ascending: false })
      .limit(50)
      .returns<AlertRow[]>(),
    // Os alertas que EU disparei vêm mesmo depois de resolvidos: é assim que
    // o motorista vê o laço se fechar em vez de o alerta simplesmente sumir.
    admin
      .from("alerts")
      .select(ALERT_COLUMNS)
      .eq("race_id", session.raceId)
      .eq("raised_by_position_id", session.positionId)
      .order("received_at", { ascending: false })
      .limit(10)
      .returns<AlertRow[]>(),
  ]);

  if (positionsResult.error) {
    return driverError("server_error", "Falha ao carregar as posições da prova.");
  }

  const rows = positionsResult.data ?? [];
  const byId = new Map(rows.map((p) => [p.id, p]));

  const vehicles: DriverVehicle[] = rows.map((p) => {
    const state = unwrapEmbed(p.position_state);
    return {
      positionId: p.id,
      label: p.label,
      role: p.role,
      ordinal: p.ordinal,
      isReferenceLead: p.is_reference_lead,
      isReferenceSweep: p.is_reference_sweep,
      isSelf: p.id === session.positionId,
      lat: state?.lat ?? null,
      lng: state?.lng ?? null,
      recordedAt: state?.recorded_at ?? null,
      routeOffsetM: state?.route_offset_m ?? null,
      offRoute: state?.off_route ?? false,
      rollingSpeedMps: state?.rolling_speed_mps ?? null,
      batteryPct: state?.battery_pct ?? null,
    };
  });

  const selfOffsetM = vehicles.find((v) => v.isSelf)?.routeOffsetM ?? null;

  const alertRows = mergeAlerts(activeAlertsResult.data ?? [], ownAlertsResult.data ?? []);
  const confirmations = await loadConfirmations(alertRows.map((a) => a.id));

  const alerts: DriverAlertView[] = alertRows.map((a) => {
    const raiser = a.raised_by_position_id ? byId.get(a.raised_by_position_id) : undefined;
    const dispatched = a.dispatched_position_id ? byId.get(a.dispatched_position_id) : undefined;

    return {
      alertId: a.id,
      clientAlertId: a.client_alert_id,
      category: a.category,
      status: a.status,
      createdAt: a.created_at,
      receivedAt: a.received_at,
      note: a.note,
      lat: a.lat,
      lng: a.lng,
      routeOffsetM: a.route_offset_m,
      raisedBy: raiser
        ? { positionId: raiser.id, label: raiser.label, role: raiser.role }
        : null,
      raisedBySelf: a.raised_by_position_id === session.positionId,
      dispatch: a.dispatched_position_id
        ? {
            positionId: a.dispatched_position_id,
            label: dispatched?.label ?? "Apoio",
            role: dispatched?.role ?? "other",
            mode: a.dispatch_mode,
            reason: a.dispatch_reason,
            dispatchedAt: a.dispatched_at,
            acknowledgedAt: a.dispatch_acknowledged_at,
            declinedAt: a.dispatch_declined_at,
            onSceneAt: a.on_scene_at,
          }
        : null,
      dispatchedToSelf: a.dispatched_position_id === session.positionId,
      acknowledgedAt: a.acknowledged_at,
      resolvedAt: a.resolved_at,
      confirmations: confirmations.get(a.id) ?? { stillThere: 0, cleared: 0, notFound: 0 },
    };
  });

  const proximity = await computeProximity({
    raceId: session.raceId,
    positionId: session.positionId,
    selfOffsetM,
    alerts: alertRows,
  });

  const gap = await loadGap(session.raceId, rows);

  const payload: DriverStateResponse = {
    serverTime: new Date().toISOString(),
    race: session.race,
    self: {
      positionId: session.position.id,
      label: session.position.label,
      role: session.position.role,
      routeOffsetM: selfOffsetM,
    },
    vehicles,
    gap,
    alerts,
    proximity,
  };

  // A assinatura é feita só do que o motorista veria mudar na tela. Incluir
  // `serverTime` faria todo GET responder 200 e o ETag não pouparia um byte.
  const etag = `W/"${(
    await sha256Hex(
      JSON.stringify({
        v: vehicles.map((v) => [v.positionId, v.recordedAt, v.lat, v.lng, v.routeOffsetM]),
        a: alerts.map((a) => [
          a.alertId,
          a.status,
          a.dispatch?.positionId ?? null,
          a.dispatch?.acknowledgedAt ?? null,
          a.dispatch?.onSceneAt ?? null,
          a.confirmations.stillThere + a.confirmations.cleared + a.confirmations.notFound,
        ]),
        p: proximity.map((p) => [p.alertId, Math.round(p.distanceAheadM / 100), p.firstNotice]),
        g: [gap.method, gap.gapSeconds == null ? null : Math.round(gap.gapSeconds / 10)],
        r: payload.race.status,
      }),
    )
  ).slice(0, 32)}"`;

  await touchSession(session.sessionId, {});

  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json(payload, {
    headers: { ETag: etag, "Cache-Control": "no-store" },
  });
}

const ALERT_COLUMNS =
  "id, client_alert_id, category, status, created_at, received_at, note, lat, lng, " +
  "route_offset_m, proximity_radius_m, raised_by_position_id, dispatched_position_id, " +
  "dispatch_mode, dispatch_reason, dispatched_at, dispatch_acknowledged_at, " +
  "dispatch_declined_at, on_scene_at, acknowledged_at, resolved_at";

function mergeAlerts(active: AlertRow[], own: AlertRow[]): AlertRow[] {
  const byId = new Map<string, AlertRow>();
  for (const a of active) byId.set(a.id, a);
  for (const a of own) byId.set(a.id, a);
  return [...byId.values()].sort(
    (a, b) => Date.parse(b.received_at) - Date.parse(a.received_at),
  );
}

interface ConfirmationCounts {
  stillThere: number;
  cleared: number;
  notFound: number;
}

async function loadConfirmations(
  alertIds: string[],
): Promise<Map<string, ConfirmationCounts>> {
  const out = new Map<string, ConfirmationCounts>();
  if (alertIds.length === 0) return out;

  const { data } = await supabaseAdmin()
    .from("alert_confirmations")
    .select("alert_id, kind")
    .in("alert_id", alertIds)
    .limit(500);

  for (const row of data ?? []) {
    const id = row.alert_id as string;
    const counts = out.get(id) ?? { stillThere: 0, cleared: 0, notFound: 0 };
    if (row.kind === "still_there") counts.stillThere++;
    else if (row.kind === "cleared") counts.cleared++;
    else counts.notFound++;
    out.set(id, counts);
  }

  return out;
}

interface ProximityParams {
  raceId: string;
  positionId: string;
  selfOffsetM: number | null;
  alerts: AlertRow[];
}

/**
 * Alertas à frente no percurso.
 *
 * Usa distância AO LONGO DA ROTA, não em linha reta: numa estrada de montanha,
 * um acidente a 200 m em linha reta pode estar a 8 km de estrada, do outro lado
 * do grampo — avisar ali seria assustar o motorista com uma coisa que não está
 * no caminho dele. E só conta o que está À FRENTE: o que já passou não muda
 * mais a forma como ele dirige.
 *
 * `firstNotice` é marcado uma única vez por (alerta, veículo), gravado em
 * `alert_notifications`. É o que separa um aviso de um alarme repetido a cada
 * 10 segundos — e alarme repetido é alarme desligado.
 */
async function computeProximity(params: ProximityParams): Promise<AlertProximity[]> {
  if (params.selfOffsetM == null) return [];

  const candidates = params.alerts.filter((a) => {
    if (a.route_offset_m == null) return false;
    // Meu próprio alerta e o que já foi acionado para mim aparecem na tela por
    // outros caminhos, muito mais destacados. Repetir aqui é ruído.
    if (a.raised_by_position_id === params.positionId) return false;
    if (a.dispatched_position_id === params.positionId) return false;

    const ahead = a.route_offset_m - params.selfOffsetM!;
    return ahead >= 0 && ahead <= a.proximity_radius_m;
  });

  if (candidates.length === 0) return [];

  const admin = supabaseAdmin();

  const { data: alreadyNotified } = await admin
    .from("alert_notifications")
    .select("alert_id")
    .eq("position_id", params.positionId)
    .eq("kind", "proximity")
    .in("alert_id", candidates.map((a) => a.id));

  const notified = new Set((alreadyNotified ?? []).map((r) => r.alert_id as string));

  const fresh = candidates.filter((a) => !notified.has(a.id));

  if (fresh.length > 0) {
    await admin.from("alert_notifications").upsert(
      fresh.map((a) => ({
        alert_id: a.id,
        position_id: params.positionId,
        race_id: params.raceId,
        kind: "proximity",
      })),
      { onConflict: "alert_id,position_id,kind", ignoreDuplicates: true },
    );
  }

  return candidates.map((a) => ({
    alertId: a.id,
    category: a.category,
    distanceAheadM: a.route_offset_m! - params.selfOffsetM!,
    firstNotice: !notified.has(a.id),
  }));
}

async function loadGap(raceId: string, rows: PositionRow[]): Promise<GapResult> {
  const cached = gapCache.get(raceId);
  if (cached && Date.now() - cached.atMs < GAP_CACHE_TTL_MS) {
    return cached.value;
  }

  const nowMs = Date.now();

  const leadRow = rows.find((p) => p.is_reference_lead);
  const sweepRow = rows.find((p) => p.is_reference_sweep);

  const leadState = leadRow ? unwrapEmbed(leadRow.position_state) : null;
  const sweepState = sweepRow ? unwrapEmbed(sweepRow.position_state) : null;

  const histories = await loadHistories(
    [leadRow?.id, sweepRow?.id].filter((id): id is string => Boolean(id)),
    nowMs,
  );

  const value = computeGap({
    lead:
      leadRow && leadState && leadState.route_offset_m != null
        ? {
            offsetM: leadState.route_offset_m,
            atMs: Date.parse(leadState.recorded_at),
            history: histories.get(leadRow.id) ?? [],
          }
        : null,
    sweep:
      sweepRow && sweepState && sweepState.route_offset_m != null
        ? {
            offsetM: sweepState.route_offset_m,
            atMs: Date.parse(sweepState.recorded_at),
            history: histories.get(sweepRow.id) ?? [],
          }
        : null,
    totalDistanceM: 0,
    nowMs,
  });

  gapCache.set(raceId, { atMs: nowMs, value });
  return value;
}

/**
 * Histórico de offsets das duas posições de referência.
 *
 * Uma consulta só para as duas: o método "medido" do gap precisa saber a que
 * horas o carro de abertura passou pelo ponto onde o vassoura está agora, e
 * isso exige histórico longo o bastante para cobrir a própria janela.
 */
async function loadHistories(
  positionIds: string[],
  nowMs: number,
): Promise<Map<string, OffsetSample[]>> {
  const out = new Map<string, OffsetSample[]>();
  if (positionIds.length === 0) return out;

  const { data } = await supabaseAdmin()
    .from("location_pings")
    .select("position_id, recorded_at, route_offset_m")
    .in("position_id", positionIds)
    .not("route_offset_m", "is", null)
    .gte("recorded_at", new Date(nowMs - GAP_HISTORY_MS).toISOString())
    .order("recorded_at", { ascending: true })
    .limit(4000);

  for (const row of data ?? []) {
    const id = row.position_id as string;
    const list = out.get(id) ?? [];
    list.push({
      offsetM: row.route_offset_m as number,
      atMs: Date.parse(row.recorded_at as string),
    });
    out.set(id, list);
  }

  return out;
}
