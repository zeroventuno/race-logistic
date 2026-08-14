import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  classifyGapBand,
  deltaToTarget,
  reconstructAbsoluteOffsets,
  type LiveAlertSuggestionView,
  type LiveAlertView,
  type LiveGapView,
  type LiveRaceView,
  type LiveRouteView,
  type LiveSnapshot,
  type LiveVehicleView,
} from "@/components/live/protocol";
import type { DriverAlertStatus } from "@/lib/driver/protocol";
import { ACTIVE_ALERT_STATUSES } from "@/lib/driver/protocol";
import { computeGap, type OffsetSample } from "@/lib/route/gap";
import { loadRaceRoute } from "@/lib/route/store";
import { findSegmentIndex, type RouteTrack } from "@/lib/route/track";
import { signalHealth, type AlertCategory, type AlertPriority, type PositionRole } from "@/lib/types";

/**
 * Montagem do estado ao vivo da prova para o painel da direção.
 *
 * Roda no servidor e SEMPRE com o cliente do usuário (RLS). O painel do diretor
 * fala com o Postgres direto pelo Realtime; se a reconciliação usasse
 * `service_role` ela enxergaria mais que a assinatura ao vivo, e as duas fontes
 * discordariam justamente para quem tem menos permissão — o pior lugar para uma
 * divergência aparecer.
 *
 * A única coisa que sai do RLS é a GEOMETRIA do percurso, lida do cache em
 * memória de `loadRaceRoute` (que usa `service_role`). Ela só é tocada depois de
 * a leitura de `races` ter confirmado, pelo RLS, que a pessoa enxerga a prova —
 * e o percurso não é dado sensível, é a linha que já está desenhada na tela.
 *
 * Por que o histórico de pings entra aqui e não fica só no cliente: o método
 * MEDIDO da janela pergunta "a que horas o carro de abertura passou pelo ponto
 * onde o fechamento está agora". Isso exige uma varredura no histórico dos dois
 * veículos, que é caro demais para mandar ao browser a cada 10 s e cedo demais
 * para confiar num cálculo feito lá.
 */

/** Janela de histórico usada no cálculo medido e na contagem de voltas. */
const HISTORY_WINDOW_MS = 3 * 60 * 60_000;

/** Teto de linhas por veículo de referência. Mantém a leitura previsível. */
const HISTORY_ROW_LIMIT = 4000;

/** Alertas já encerrados continuam visíveis por este tempo, para fechar o laço. */
const RESOLVED_TAIL_MS = 2 * 60 * 60_000;

/** Vértices do trecho ocupado enviados ao browser. Acima disto é peso sem leitura. */
const OCCUPIED_POINT_BUDGET = 160;

const POSITION_COLUMNS =
  "id, race_id, role, label, ordinal, driver_name, driver_phone, vehicle_plate, " +
  "is_reference_lead, is_reference_sweep, is_dispatchable";

const ALERT_COLUMNS =
  "id, client_alert_id, category, priority, status, note, created_at, received_at, " +
  "acknowledged_at, acknowledged_by, resolved_at, resolution_note, lat, lng, route_offset_m, " +
  // `absolute_offset_m` e `lap` são o km DA PROVA; `route_offset_m` é o km
  // dentro da volta. Exibir o segundo como se fosse o primeiro fazia um alerta
  // na volta 3 do km 23 aparecer como "no km 3,0" — e a lista de apoio mais
  // próximo comparava dois offsets locais, oferecendo como candidato nº 1 uma
  // moto que estava "a 0,5 km" e na verdade estava uma volta inteira atrás.
  "absolute_offset_m, lap, route_offset_confidence, route_offset_ambiguous, " +
  "raised_by_position_id, dispatched_position_id, dispatch_mode, dispatch_reason, " +
  "dispatched_at, dispatch_acknowledged_at, dispatch_declined_at, dispatch_decline_reason, on_scene_at";

interface PositionRow {
  id: string;
  race_id: string;
  role: PositionRole;
  label: string;
  ordinal: number;
  driver_name: string | null;
  driver_phone: string | null;
  vehicle_plate: string | null;
  is_reference_lead: boolean;
  is_reference_sweep: boolean;
  is_dispatchable: boolean;
}

interface StateRow {
  position_id: string;
  lat: number;
  lng: number;
  speed_mps: number | null;
  heading_deg: number | null;
  recorded_at: string;
  received_at: string;
  route_offset_m: number | null;
  /** Posição na PROVA, contando as voltas. Gravada pela ingestão. */
  absolute_offset_m: number | null;
  lap: number | null;
  snap_ambiguous: boolean | null;
  snap_confidence: "high" | "medium" | "low" | null;
  snap_distance_m: number | null;
  off_route: boolean;
  rolling_speed_mps: number | null;
  battery_pct: number | null;
  total_pings: number;
}

interface AlertRow {
  id: string;
  client_alert_id: string;
  category: AlertCategory;
  priority: AlertPriority;
  status: DriverAlertStatus;
  note: string | null;
  created_at: string;
  received_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  lat: number | null;
  lng: number | null;
  absolute_offset_m: number | null;
  lap: number | null;
  route_offset_ambiguous: boolean | null;
  route_offset_confidence: "high" | "medium" | "low" | null;
  route_offset_m: number | null;
  raised_by_position_id: string | null;
  dispatched_position_id: string | null;
  dispatch_mode: "auto" | "manual" | null;
  dispatch_reason: string | null;
  dispatched_at: string | null;
  dispatch_acknowledged_at: string | null;
  dispatch_declined_at: string | null;
  dispatch_decline_reason: string | null;
  on_scene_at: string | null;
}

export class LiveSnapshotError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "LiveSnapshotError";
    this.status = status;
  }
}

export async function buildLiveSnapshot(
  supabase: SupabaseClient,
  raceId: string,
): Promise<LiveSnapshot> {
  const nowMs = Date.now();
  const warnings: string[] = [];

  const sinceIso = new Date(nowMs - HISTORY_WINDOW_MS).toISOString();
  const resolvedTailIso = new Date(nowMs - RESOLVED_TAIL_MS).toISOString();

  const [raceRes, positionsRes, statesRes, sessionsRes, trackRes, alertsRes] =
    await Promise.all([
      supabase
        .from("races")
        .select(
          "id, name, status, timezone, laps, actual_start, finished_at, scheduled_start, " +
            "target_gap_minutes, min_gap_minutes, max_gap_minutes",
        )
        .eq("id", raceId)
        .maybeSingle(),
      supabase
        .from("race_positions")
        .select(POSITION_COLUMNS)
        .eq("race_id", raceId)
        .order("ordinal", { ascending: true }),
      supabase.from("position_state").select("*").eq("race_id", raceId),
      supabase
        .from("position_sessions")
        .select("id, position_id, revoked_at")
        .eq("race_id", raceId)
        .is("revoked_at", null),
      supabase
        .from("route_tracks")
        .select("id, total_distance_m")
        .eq("race_id", raceId)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("alerts")
        .select(ALERT_COLUMNS)
        .eq("race_id", raceId)
        .or(
          `status.in.(${ACTIVE_ALERT_STATUSES.join(",")}),received_at.gte.${resolvedTailIso}`,
        )
        .order("received_at", { ascending: false })
        .limit(60),
    ]);

  if (raceRes.error) {
    throw new LiveSnapshotError(500, `Falha ao ler a prova: ${raceRes.error.message}`);
  }

  const raceRow = raceRes.data as Record<string, unknown> | null;
  // RLS: quem não é membro recebe zero linhas, não um 403. "Não existe para
  // você" é a resposta certa — não vaza nem a existência do evento.
  if (!raceRow) throw new LiveSnapshotError(404, "Prova não encontrada.");

  const laps = Math.max(1, Number(raceRow.laps ?? 1) || 1);

  const race: LiveRaceView = {
    id: String(raceRow.id),
    name: String(raceRow.name),
    status: raceRow.status as LiveRaceView["status"],
    timezone: String(raceRow.timezone),
    laps,
    actualStart: (raceRow.actual_start as string | null) ?? null,
    finishedAt: (raceRow.finished_at as string | null) ?? null,
    scheduledStart: (raceRow.scheduled_start as string | null) ?? null,
    targetGapSeconds: Number(raceRow.target_gap_minutes ?? 0) * 60,
    minGapSeconds:
      raceRow.min_gap_minutes == null ? null : Number(raceRow.min_gap_minutes) * 60,
    maxGapSeconds:
      raceRow.max_gap_minutes == null ? null : Number(raceRow.max_gap_minutes) * 60,
  };

  if (positionsRes.error) {
    throw new LiveSnapshotError(
      500,
      `Falha ao ler as posições: ${positionsRes.error.message}`,
    );
  }

  const positions = (positionsRes.data ?? []) as unknown as PositionRow[];

  if (statesRes.error) warnings.push("Falha ao ler as posições ao vivo dos veículos.");
  if (sessionsRes.error) warnings.push("Falha ao ler os vínculos de aparelho.");
  if (alertsRes.error) warnings.push(`Falha ao ler os alertas: ${alertsRes.error.message}`);

  const states = new Map<string, StateRow>();
  for (const s of (statesRes.data ?? []) as unknown as StateRow[]) {
    states.set(s.position_id, s);
  }

  const bound = new Set<string>();
  for (const s of (sessionsRes.data ?? []) as Array<{ position_id: string }>) {
    bound.add(s.position_id);
  }

  const lapDistanceM = Number(
    (trackRes.data as { total_distance_m?: number } | null)?.total_distance_m ?? 0,
  );

  // Geometria completa: cache em memória. Existe para o trecho ocupado e para
  // saber se o traçado é um circuito — sem ela o painel continua correto, só
  // deixa de desenhar a estrada ainda fechada.
  let track: RouteTrack | null = null;
  try {
    const loaded = await loadRaceRoute(raceId);
    track = loaded?.track ?? null;
  } catch (error) {
    warnings.push(
      `Geometria do percurso indisponível: ${(error as Error).message}. O trecho ocupado não será desenhado.`,
    );
  }

  const route: LiveRouteView | null =
    lapDistanceM > 0
      ? {
          lapDistanceM,
          raceDistanceM: lapDistanceM * laps,
          isLoop: track?.isLoop ?? false,
        }
      : null;

  // --- Voltas dos dois veículos de referência ------------------------------

  const leadRow = positions.find((p) => p.is_reference_lead) ?? null;
  const sweepRow = positions.find((p) => p.is_reference_sweep) ?? null;

  const referenceIds = [leadRow?.id, sweepRow?.id].filter(
    (id): id is string => typeof id === "string",
  );

  const histories = await loadHistories(supabase, referenceIds, sinceIso);

  const needsLapCounting = (route?.isLoop ?? false) && laps > 1;

  const historyComplete =
    !needsLapCounting ||
    referenceIds.every((id) => {
      const rows = histories.get(id);
      if (!rows || rows.length === 0) return false;
      if (rows.length >= HISTORY_ROW_LIMIT) return false;
      const start = race.actualStart ? Date.parse(race.actualStart) : null;
      // Sem largada registrada, o critério vira "o histórico cobre a janela
      // inteira" — que é o máximo que se pode afirmar honestamente.
      if (start === null) return Date.parse(sinceIso) <= nowMs - HISTORY_WINDOW_MS + 1000;
      return (rows[0]?.atMs ?? Infinity) <= start + 60_000;
    });

  if (needsLapCounting && !historyComplete) {
    warnings.push(
      "Prova em circuito com várias voltas: o histórico carregado não alcança a largada, " +
        "então a contagem de voltas pode estar subestimada.",
    );
  }

  const leadLaps = leadRow
    ? reconstructAbsoluteOffsets(histories.get(leadRow.id) ?? [], lapDistanceM, {
        isLoop: route?.isLoop ?? false,
        laps,
      })
    : null;

  const sweepLaps = sweepRow
    ? reconstructAbsoluteOffsets(histories.get(sweepRow.id) ?? [], lapDistanceM, {
        isLoop: route?.isLoop ?? false,
        laps,
      })
    : null;

  const lapByPosition = new Map<string, number>();
  if (leadRow && leadLaps) lapByPosition.set(leadRow.id, leadLaps.lap);
  if (sweepRow && sweepLaps) lapByPosition.set(sweepRow.id, sweepLaps.lap);

  // --- Veículos ------------------------------------------------------------

  const vehicles: LiveVehicleView[] = positions.map((p) => {
    const state = states.get(p.id) ?? null;
    const offset = state?.route_offset_m ?? null;

    // A INGESTÃO É A FONTE DA VOLTA, não este arquivo.
    //
    // `position_state.lap` e `absolute_offset_m` são gravados por ping, pelo
    // único código que tem o cursor de continuidade necessário para saber em
    // que volta o veículo está. Reconstruir aqui produzia dois defeitos
    // medidos:
    //
    //  - só os dois veículos de referência entravam na reconstrução, então os
    //    outros dezoito ficavam todos na volta 0. Duas ambulâncias a 20 km e
    //    duas voltas de distância apareciam a 50 m uma da outra — e a
    //    ordenação padrão da lista se chama "Posição na prova".
    //
    //  - quando a geometria do percurso não carregava, `isLoop` virava false,
    //    a reconstrução virava identidade, e a separação entre abertura e
    //    vassoura colapsava para ZERO. A tela mostrava "0 m pela estrada" com
    //    selo verde de MEDIDO: a afirmação de que os dois carros estão juntos
    //    e a estrada atrás está limpa, com 20 km entre eles.
    const dbLap = state?.lap ?? null;
    const dbAbsolute = state?.absolute_offset_m ?? null;

    const lap = dbLap ?? lapByPosition.get(p.id) ?? 0;
    const lapKnown =
      dbLap !== null || !needsLapCounting || lapByPosition.has(p.id);

    const clockSkewSeconds =
      state === null
        ? null
        : (Date.parse(state.recorded_at) - Date.parse(state.received_at)) / 1000;

    return {
      positionId: p.id,
      label: p.label,
      role: p.role,
      ordinal: p.ordinal,
      isReferenceLead: p.is_reference_lead,
      isReferenceSweep: p.is_reference_sweep,
      isDispatchable: p.is_dispatchable,
      driverName: p.driver_name,
      driverPhone: p.driver_phone,
      vehiclePlate: p.vehicle_plate,
      bound: bound.has(p.id),
      lat: state?.lat ?? null,
      lng: state?.lng ?? null,
      recordedAt: state?.recorded_at ?? null,
      receivedAt: state?.received_at ?? null,
      routeOffsetM: offset,
      lap,
      absoluteOffsetM:
        dbAbsolute ?? (offset === null ? null : lap * lapDistanceM + offset),
      lapKnown,
      offRoute: state?.off_route ?? false,
      snapDistanceM: state?.snap_distance_m ?? null,
      // A migração 0007 existe para que a ambiguidade da âncora chegue a quem
      // decide. O app do motorista já recebia; o painel da direção descartava
      // as duas colunas no `map`, e um veículo ancorado por desempate — que
      // pode estar a quilômetros do ponto mostrado — aparecia como candidato
      // nº 1 de um alerta médico, com ETA de 2 minutos.
      snapAmbiguous: state?.snap_ambiguous ?? false,
      snapConfidence: state?.snap_confidence ?? null,
      speedMps: state?.speed_mps ?? null,
      rollingSpeedMps: state?.rolling_speed_mps ?? null,
      batteryPct: state?.battery_pct ?? null,
      headingDeg: state?.heading_deg ?? null,
      totalPings: state?.total_pings ?? 0,
      clockSkewSeconds: Number.isFinite(clockSkewSeconds ?? NaN)
        ? (clockSkewSeconds as number)
        : null,
    };
  });

  const byId = new Map(vehicles.map((v) => [v.positionId, v]));

  // --- Janela --------------------------------------------------------------

  const leadVehicle = leadRow ? (byId.get(leadRow.id) ?? null) : null;
  const sweepVehicle = sweepRow ? (byId.get(sweepRow.id) ?? null) : null;

  const gapResult = computeGap({
    lead:
      leadVehicle && leadVehicle.absoluteOffsetM !== null && leadVehicle.recordedAt
        ? {
            offsetM: leadVehicle.absoluteOffsetM,
            atMs: Date.parse(leadVehicle.recordedAt),
            // O relógio do SERVIDOR. É o que impede um celular adiantado de
            // congelar o veículo no mapa exibindo "dado fresco".
            receivedAtMs: leadVehicle.receivedAt
              ? Date.parse(leadVehicle.receivedAt)
              : undefined,
            history: leadLaps?.samples ?? [],
          }
        : null,
    sweep:
      sweepVehicle && sweepVehicle.absoluteOffsetM !== null && sweepVehicle.recordedAt
        ? {
            offsetM: sweepVehicle.absoluteOffsetM,
            atMs: Date.parse(sweepVehicle.recordedAt),
            receivedAtMs: sweepVehicle.receivedAt
              ? Date.parse(sweepVehicle.receivedAt)
              : undefined,
            history: sweepLaps?.samples ?? [],
          }
        : null,
    totalDistanceM: lapDistanceM * laps,
    nowMs,
  });

  // `computeGap` só levanta suspeita de relógio quando NÃO recebe o carimbo do
  // servidor — e aqui ele recebe. A comparação recorded_at × received_at é a
  // única fonte de suspeita que sobra, e ela tem que ser feita aqui.
  const clockSuspect = [leadVehicle, sweepVehicle].some(
    (v) => v !== null && v.clockSkewSeconds !== null && Math.abs(v.clockSkewSeconds) > 60,
  );

  const gap: LiveGapView = {
    ...gapResult,
    clockSuspect: gapResult.clockSuspect || clockSuspect,
    computedAt: new Date(nowMs).toISOString(),
    lead: leadVehicle ? endpointView(leadVehicle) : null,
    sweep: sweepVehicle ? endpointView(sweepVehicle) : null,
    targetSeconds: race.targetGapSeconds,
    minSeconds: race.minGapSeconds,
    maxSeconds: race.maxGapSeconds,
    band: classifyGapBand(gapResult.gapSeconds, {
      targetSeconds: race.targetGapSeconds,
      minSeconds: race.minGapSeconds,
      maxSeconds: race.maxGapSeconds,
    }),
    deltaToTargetSeconds: deltaToTarget(gapResult.gapSeconds, race.targetGapSeconds),
    historyComplete,
    lapsInferred: needsLapCounting,
  };

  // --- Alertas -------------------------------------------------------------

  const alertRows = (alertsRes.data ?? []) as unknown as AlertRow[];
  const alertIds = alertRows.map((a) => a.id);

  const [suggestionsRes, confirmationsRes] = await Promise.all([
    alertIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from("alert_suggestions")
          .select(
            "alert_id, position_id, rank, route_distance_m, straight_distance_m, eta_seconds, is_ahead, reason",
          )
          .in("alert_id", alertIds)
          .order("rank", { ascending: true }),
    alertIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from("alert_confirmations")
          .select("alert_id, kind")
          .in("alert_id", alertIds)
          .limit(500),
  ]);

  const suggestionsByAlert = new Map<string, LiveAlertSuggestionView[]>();
  for (const s of (suggestionsRes.data ?? []) as Array<Record<string, unknown>>) {
    const alertId = String(s.alert_id);
    const positionId = String(s.position_id);
    const vehicle = byId.get(positionId);
    if (!vehicle) continue;

    const ageSeconds = vehicle.receivedAt
      ? Math.max(0, (nowMs - Date.parse(vehicle.receivedAt)) / 1000)
      : null;

    const list = suggestionsByAlert.get(alertId) ?? [];
    list.push({
      positionId,
      label: vehicle.label,
      role: vehicle.role,
      rank: Number(s.rank ?? 0),
      routeDistanceM: s.route_distance_m == null ? null : Number(s.route_distance_m),
      straightDistanceM: Number(s.straight_distance_m ?? 0),
      etaSeconds: s.eta_seconds == null ? null : Number(s.eta_seconds),
      isAhead: s.is_ahead == null ? null : Boolean(s.is_ahead),
      reason: (s.reason as string | null) ?? null,
      signal: signalHealth(ageSeconds),
      ageSeconds,
    });
    suggestionsByAlert.set(alertId, list);
  }

  const confirmations = new Map<
    string,
    { stillThere: number; cleared: number; notFound: number }
  >();
  for (const c of (confirmationsRes.data ?? []) as Array<{
    alert_id: string;
    kind: string;
  }>) {
    const counts = confirmations.get(c.alert_id) ?? {
      stillThere: 0,
      cleared: 0,
      notFound: 0,
    };
    if (c.kind === "still_there") counts.stillThere++;
    else if (c.kind === "cleared") counts.cleared++;
    else counts.notFound++;
    confirmations.set(c.alert_id, counts);
  }

  const alerts: LiveAlertView[] = alertRows.map((a) => {
    const raiser = a.raised_by_position_id ? byId.get(a.raised_by_position_id) : undefined;
    const dispatched = a.dispatched_position_id
      ? byId.get(a.dispatched_position_id)
      : undefined;

    return {
      alertId: a.id,
      clientAlertId: a.client_alert_id,
      category: a.category,
      priority: a.priority,
      status: a.status,
      note: a.note,
      createdAt: a.created_at,
      receivedAt: a.received_at,
      acknowledgedAt: a.acknowledged_at,
      acknowledgedBy: a.acknowledged_by,
      resolvedAt: a.resolved_at,
      resolutionNote: a.resolution_note,
      lat: a.lat,
      lng: a.lng,
      routeOffsetM: a.route_offset_m,
      lap: a.lap ?? 0,
      absoluteOffsetM:
        a.absolute_offset_m ??
        (a.route_offset_m === null
          ? null
          : (a.lap ?? 0) * lapDistanceM + a.route_offset_m),
      routeOffsetAmbiguous: a.route_offset_ambiguous ?? false,
      routeOffsetConfidence: a.route_offset_confidence ?? null,
      raisedBy: raiser
        ? { positionId: raiser.positionId, label: raiser.label, role: raiser.role }
        : null,
      dispatch: a.dispatched_position_id
        ? {
            positionId: a.dispatched_position_id,
            label: dispatched?.label ?? "—",
            role: dispatched?.role ?? "other",
            mode: a.dispatch_mode,
            reason: a.dispatch_reason,
            dispatchedAt: a.dispatched_at,
            acknowledgedAt: a.dispatch_acknowledged_at,
            declinedAt: a.dispatch_declined_at,
            declineReason: a.dispatch_decline_reason,
            onSceneAt: a.on_scene_at,
          }
        : null,
      suggestions: suggestionsByAlert.get(a.id) ?? [],
      confirmations:
        confirmations.get(a.id) ?? { stillThere: 0, cleared: 0, notFound: 0 },
    };
  });

  return {
    serverTime: new Date().toISOString(),
    race,
    route,
    vehicles,
    gap,
    alerts,
    occupiedSegment: buildOccupiedSegment(track, gap),
    warnings,
  };
}

function endpointView(v: LiveVehicleView) {
  return {
    positionId: v.positionId,
    label: v.label,
    role: v.role,
    lap: v.lap,
    routeOffsetM: v.routeOffsetM,
    absoluteOffsetM: v.absoluteOffsetM,
    receivedAt: v.receivedAt,
    clockSkewSeconds: v.clockSkewSeconds,
  };
}

/**
 * Histórico de offsets, mais recente primeiro no banco e devolvido em ordem
 * crescente.
 *
 * A ordem da CONSULTA é decrescente de propósito: um `order asc` com limite
 * devolveria os pings mais ANTIGOS da janela e cortaria justamente o presente,
 * que é o que o cálculo precisa. A inversão acontece depois, na memória.
 */
async function loadHistories(
  supabase: SupabaseClient,
  positionIds: string[],
  sinceIso: string,
): Promise<Map<string, OffsetSample[]>> {
  const out = new Map<string, OffsetSample[]>();
  if (positionIds.length === 0) return out;

  const { data, error } = await supabase
    .from("location_pings")
    .select("position_id, recorded_at, route_offset_m")
    .in("position_id", positionIds)
    .not("route_offset_m", "is", null)
    .gte("recorded_at", sinceIso)
    .order("recorded_at", { ascending: false })
    .limit(HISTORY_ROW_LIMIT * positionIds.length);

  if (error || !data) return out;

  for (const row of data as Array<Record<string, unknown>>) {
    const id = String(row.position_id);
    const list = out.get(id) ?? [];
    list.push({
      offsetM: Number(row.route_offset_m),
      atMs: Date.parse(String(row.recorded_at)),
    });
    out.set(id, list);
  }

  for (const list of out.values()) {
    list.reverse();
  }

  return out;
}

/**
 * A via ainda INTERDITADA pela prova: do carro de fechamento até a abertura.
 *
 * O limite traseiro é o FECHAMENTO, e não a vassoura. A passagem do fechamento
 * reabre a via: os ciclistas que ficaram para trás seguem em trânsito normal,
 * junto com os carros, e a vassoura vem depois apenas para recolher quem
 * abandona — ela não interdita nada.
 *
 * Esta faixa é, portanto, a tradução geográfica de um COMPROMISSO
 * ADMINISTRATIVO: o trecho que a organização combinou com a autoridade de
 * trânsito manter fechado, e por quanto tempo. Responde a pergunta que o
 * número da janela sozinho não responde — QUAL rua ainda não pode abrir.
 *
 * Desenhada só com os dois offsets presentes e dado fresco: uma faixa colorida
 * sobre a estrada é uma afirmação forte, e afirmá-la com dado de cinco minutos
 * atrás é o que faz alguém liberar cedo demais.
 */
function buildOccupiedSegment(
  track: RouteTrack | null,
  gap: LiveGapView,
): [number, number][] | null {
  if (!track) return null;
  if (gap.stale || gap.clockSuspect || gap.sweepAheadOfLead) return null;

  const leadAbs = gap.lead?.absoluteOffsetM ?? null;
  const sweepAbs = gap.sweep?.absoluteOffsetM ?? null;
  if (leadAbs === null || sweepAbs === null) return null;
  if (leadAbs < sweepAbs) return null;

  const total = track.totalDistanceM;
  if (!(total > 0)) return null;

  // Mais de uma volta de separação: a estrada inteira está ocupada, e recortar
  // um trecho aqui daria a impressão contrária.
  if (leadAbs - sweepAbs >= total) {
    return subsample(track.points.map((p) => [p[0], p[1]] as [number, number]));
  }

  const from = ((sweepAbs % total) + total) % total;
  const to = ((leadAbs % total) + total) % total;

  const slices: [number, number][] =
    from <= to
      ? sliceTrack(track, from, to)
      : // O trecho ocupado atravessa a linha de largada.
        [...sliceTrack(track, from, total), ...sliceTrack(track, 0, to)];

  return slices.length >= 2 ? subsample(slices) : null;
}

function sliceTrack(
  track: RouteTrack,
  fromM: number,
  toM: number,
): [number, number][] {
  const lo = findSegmentIndex(track, fromM);
  const hi = findSegmentIndex(track, toM);
  const out: [number, number][] = [];

  for (let i = lo; i <= Math.min(hi + 1, track.points.length - 1); i++) {
    const p = track.points[i];
    if (p) out.push([p[0], p[1]]);
  }

  return out;
}

function subsample(points: [number, number][]): [number, number][] {
  if (points.length <= OCCUPIED_POINT_BUDGET) return points;

  const step = points.length / OCCUPIED_POINT_BUDGET;
  const out: [number, number][] = [];

  for (let i = 0; i < OCCUPIED_POINT_BUDGET; i++) {
    const p = points[Math.floor(i * step)];
    if (p) out.push(p);
  }

  const last = points[points.length - 1];
  if (last) out.push(last);

  return out;
}
