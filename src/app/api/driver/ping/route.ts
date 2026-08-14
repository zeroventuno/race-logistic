import "server-only";

import { NextResponse } from "next/server";

import { driverError, driverJson, readJsonBody } from "@/app/api/driver/_lib/http";
import {
  estimateClockSkewMs,
  validatePingBatch,
  type ValidatedPing,
} from "@/app/api/driver/_lib/ingest";
import { authenticateDriver, touchSession } from "@/app/api/driver/_lib/session";
import { rollingSpeedMps, type OffsetSample } from "@/lib/route/gap";
import { snapToRoute, type SnapPrevious } from "@/lib/route/snap";
import { loadRaceRoute } from "@/lib/route/store";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PingBatchResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Ingestão de GPS em lote.
 *
 * Este é o caminho quente do sistema: um veículo manda um lote a cada poucos
 * segundos, durante seis horas, e qualquer erro aqui aparece como um marcador
 * pulando pelo mapa da direção. Quatro invariantes sustentam a rota:
 *
 *  1. ORDEM CRONOLÓGICA, NÃO ORDEM DE CHEGADA. Quando o celular recupera sinal
 *     ele descarrega a fila offline junto com os pings novos. Processar na
 *     ordem em que chegaram faria o snap usar como "anterior" um ponto do
 *     futuro, e o veículo saltaria para a perna errada da estrada.
 *
 *  2. IDEMPOTÊNCIA POR `client_ping_id`. O app só tira um ping da fila depois
 *     do ack; se o ack se perder na rede, o mesmo ping volta. `ON CONFLICT DO
 *     NOTHING` sobre (position_id, client_ping_id) transforma reenvio em
 *     no-op — nunca em ponto duplicado no histórico.
 *
 *  3. CONTINUIDADE ALIMENTADA COM VELOCIDADE. Cada ping entrega ao próximo o
 *     offset E a velocidade. Sem velocidade, o modelo de movimento do snap
 *     assume veículo parado e erra sistematicamente para trás nos trechos em
 *     que a estrada volta por si mesma — o erro se acumula ping a ping, e um
 *     lote offline inteiro é reconstruído com o modelo degradado.
 *
 *  4. `position_state` SÓ AVANÇA. Um ping antigo que chega atrasado entra no
 *     histórico, mas não pode puxar o marcador do veículo para trás no mapa.
 */

/** Janela usada para a velocidade média ao longo do percurso. */
const ROLLING_WINDOW_MS = 180_000;

/** Quanto histórico buscar para calcular essa média. */
const ROLLING_LOOKBACK_MS = 300_000;

interface StateRow {
  recorded_at: string;
  route_offset_m: number | null;
  off_route: boolean;
  rolling_speed_mps: number | null;
  total_pings: number;
}

interface PreviousPingRow {
  recorded_at: string;
  route_offset_m: number | null;
  speed_mps: number | null;
}

interface PreparedRow {
  race_id: string;
  position_id: string;
  session_id: string;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  altitude_m: number | null;
  speed_mps: number | null;
  heading_deg: number | null;
  recorded_at: string;
  clock_skew_ms: number | null;
  route_offset_m: number | null;
  snap_distance_m: number | null;
  off_route: boolean;
  client_seq: number;
  client_ping_id: string;
  battery_pct: number | null;
  queued_offline: boolean;
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

  const serverNowMs = Date.now();
  const parsed = validatePingBatch(body.value, serverNowMs);

  if (!parsed.ok) {
    return driverError("bad_request", parsed.error);
  }

  const { accepted, rejected } = parsed.value;

  const { data: stateBefore } = await admin
    .from("position_state")
    .select("recorded_at, route_offset_m, off_route, rolling_speed_mps, total_pings")
    .eq("position_id", session.positionId)
    .maybeSingle<StateRow>();

  const route = await loadRouteSafely(session.raceId);
  const totalDistanceM = route?.track.totalDistanceM ?? null;

  if (accepted.length === 0) {
    return driverJson<PingBatchResponse>({
      accepted: [],
      rejected,
      state: {
        routeOffsetM: stateBefore?.route_offset_m ?? null,
        offRoute: stateBefore?.off_route ?? false,
        totalDistanceM,
      },
      serverTime: new Date(serverNowMs).toISOString(),
    });
  }

  const clockSkewMs = estimateClockSkewMs(accepted, serverNowMs);

  const previous = route
    ? await loadSnapCursor(
        session.positionId,
        accepted[0]!.recordedAtIso,
        stateBefore?.rolling_speed_mps ?? null,
      )
    : null;

  const prepared = prepareRows({
    accepted,
    session: {
      raceId: session.raceId,
      positionId: session.positionId,
      sessionId: session.sessionId,
    },
    route,
    previous,
    clockSkewMs,
    rollingSpeedFallbackMps: stateBefore?.rolling_speed_mps ?? null,
  });

  // `ignoreDuplicates` vira `ON CONFLICT DO NOTHING`: o reenvio de um lote já
  // gravado responde 200 sem tocar em nada, que é o que faz a fila offline do
  // aparelho conseguir esvaziar mesmo quando o ack se perde no caminho.
  const { error: insertError } = await admin
    .from("location_pings")
    .upsert(prepared.rows, {
      onConflict: "position_id,client_ping_id",
      ignoreDuplicates: true,
    });

  if (insertError) {
    // 500 de propósito: o app TEM que manter estes pings na fila e tentar de
    // novo. Responder 200 aqui apagaria o trecho do histórico para sempre.
    return driverError(
      "server_error",
      "Falha ao gravar os pings. Mantenha na fila e tente de novo.",
    );
  }

  const last = prepared.rows[prepared.rows.length - 1]!;
  const newestMs = Date.parse(last.recorded_at);

  const rolling = route
    ? await computeRollingSpeed(session.positionId, newestMs)
    : null;

  const advanced = await advancePositionState({
    session: {
      raceId: session.raceId,
      positionId: session.positionId,
      sessionId: session.sessionId,
    },
    row: last,
    rollingSpeedMps: rolling,
    totalPings: Number(stateBefore?.total_pings ?? 0) + prepared.rows.length,
    hadState: stateBefore != null,
  });

  await touchSession(session.sessionId, {
    lastPingAt: last.recorded_at,
    pingsReceived: session.pingsReceived + prepared.rows.length,
  });

  // Se o lote inteiro era mais antigo que o estado já gravado (chegada
  // atrasada), a resposta tem que refletir o estado REAL do veículo, não o
  // último ping do lote — senão o app desenha a si mesmo no passado.
  const stateIsNewer =
    !advanced && stateBefore != null && Date.parse(stateBefore.recorded_at) >= newestMs;

  return driverJson<PingBatchResponse>({
    accepted: prepared.rows.map((r) => r.client_ping_id),
    rejected,
    state: {
      routeOffsetM: stateIsNewer
        ? (stateBefore?.route_offset_m ?? null)
        : last.route_offset_m,
      offRoute: stateIsNewer ? (stateBefore?.off_route ?? false) : last.off_route,
      totalDistanceM,
    },
    serverTime: new Date().toISOString(),
  });
}

/**
 * Falha ao carregar o percurso não pode impedir a gravação dos pings.
 *
 * Sem rota o veículo perde o offset — o gap fica indisponível — mas as
 * coordenadas continuam chegando ao mapa da direção. Perder a posição do
 * veículo porque o cálculo de quilometragem falhou seria trocar um problema
 * por um pior.
 */
async function loadRouteSafely(raceId: string) {
  try {
    return await loadRaceRoute(raceId);
  } catch (error) {
    console.warn("[driver/ping] percurso indisponível:", (error as Error).message);
    return null;
  }
}

/**
 * Ponto de partida da continuidade.
 *
 * Busca o último ping ANTERIOR ao primeiro do lote, não o último ping em
 * absoluto. A diferença aparece quando a fila offline descarrega: os pings do
 * buraco de cobertura precisam continuar de onde o veículo estava quando o
 * sinal caiu, e não do ponto onde ele reapareceu.
 */
async function loadSnapCursor(
  positionId: string,
  firstRecordedAtIso: string,
  rollingSpeedFallbackMps: number | null,
): Promise<SnapPrevious | null> {
  const { data } = await supabaseAdmin()
    .from("location_pings")
    .select("recorded_at, route_offset_m, speed_mps")
    .eq("position_id", positionId)
    .not("route_offset_m", "is", null)
    .lte("recorded_at", firstRecordedAtIso)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle<PreviousPingRow>();

  if (!data || data.route_offset_m == null) return null;

  return {
    offsetM: data.route_offset_m,
    recordedAtMs: Date.parse(data.recorded_at),
    speedMps: data.speed_mps ?? rollingSpeedFallbackMps,
  };
}

interface PrepareParams {
  accepted: ValidatedPing[];
  session: { raceId: string; positionId: string; sessionId: string };
  route: Awaited<ReturnType<typeof loadRaceRoute>>;
  previous: SnapPrevious | null;
  clockSkewMs: number | null;
  rollingSpeedFallbackMps: number | null;
}

function prepareRows(params: PrepareParams): { rows: PreparedRow[] } {
  const rows: PreparedRow[] = [];
  let cursor = params.previous;

  for (const ping of params.accepted) {
    let routeOffsetM: number | null = null;
    let snapDistanceM: number | null = null;
    let offRoute = false;

    if (params.route) {
      const snapped = snapToRoute(
        params.route.index,
        { lat: ping.lat, lng: ping.lng },
        {
          previous: cursor,
          recordedAtMs: ping.recordedAtMs,
          // A precisão informada pelo GPS afina o peso da geometria contra o
          // modelo de movimento: fixo ruim, geometria vale menos.
          accuracyM: ping.accuracyM,
          expectedSpeedMps: ping.speedMps ?? cursor?.speedMps ?? null,
        },
      );

      routeOffsetM = snapped.offsetM;
      snapDistanceM = snapped.snapDistanceM;
      offRoute = snapped.offRoute;

      // Cada ping alimenta o próximo. É isto que faz um lote de 40 pings
      // acumulados offline ser reconstruído com a mesma qualidade de um fluxo
      // ao vivo, em vez de ser todo resolvido pela busca global.
      cursor = {
        offsetM: snapped.offsetM,
        recordedAtMs: ping.recordedAtMs,
        speedMps: derivedSpeedMps(ping, cursor, snapped.offsetM, params.rollingSpeedFallbackMps),
      };
    }

    rows.push({
      race_id: params.session.raceId,
      position_id: params.session.positionId,
      session_id: params.session.sessionId,
      lat: ping.lat,
      lng: ping.lng,
      accuracy_m: ping.accuracyM,
      altitude_m: ping.altitudeM,
      speed_mps: ping.speedMps,
      heading_deg: ping.headingDeg,
      recorded_at: ping.recordedAtIso,
      clock_skew_ms: clampSkew(params.clockSkewMs),
      route_offset_m: routeOffsetM,
      snap_distance_m: snapDistanceM,
      off_route: offRoute,
      client_seq: ping.clientSeq,
      client_ping_id: ping.clientPingId,
      battery_pct: ping.batteryPct,
      queued_offline: ping.queuedOffline,
    });
  }

  return { rows };
}

/**
 * Velocidade a entregar ao próximo ping, em ordem de confiabilidade:
 * a do GPS, a média móvel já conhecida, e — só se as duas faltarem — a
 * derivada dos próprios offsets, que é a menos confiável porque herda qualquer
 * erro do snap anterior.
 */
function derivedSpeedMps(
  ping: ValidatedPing,
  cursor: SnapPrevious | null,
  newOffsetM: number,
  rollingFallbackMps: number | null,
): number | null {
  if (ping.speedMps != null) return ping.speedMps;
  if (rollingFallbackMps != null) return rollingFallbackMps;

  if (!cursor) return null;

  const dtSeconds = (ping.recordedAtMs - cursor.recordedAtMs) / 1000;
  if (dtSeconds <= 0 || dtSeconds > 120) return null;

  return Math.max(0, (newOffsetM - cursor.offsetM) / dtSeconds);
}

/** `clock_skew_ms` é bigint no banco, mas absurdos não têm valor diagnóstico. */
function clampSkew(skewMs: number | null): number | null {
  if (skewMs == null) return null;
  const limit = 30 * 24 * 60 * 60_000;
  return Math.max(-limit, Math.min(limit, skewMs));
}

async function computeRollingSpeed(
  positionId: string,
  newestMs: number,
): Promise<number | null> {
  const since = new Date(newestMs - ROLLING_LOOKBACK_MS).toISOString();

  const { data } = await supabaseAdmin()
    .from("location_pings")
    .select("recorded_at, route_offset_m")
    .eq("position_id", positionId)
    .not("route_offset_m", "is", null)
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: true })
    .limit(400);

  if (!data || data.length < 2) return null;

  const history: OffsetSample[] = data.map((r) => ({
    offsetM: r.route_offset_m as number,
    atMs: Date.parse(r.recorded_at as string),
  }));

  return rollingSpeedMps(history, newestMs, ROLLING_WINDOW_MS);
}

interface AdvanceParams {
  session: { raceId: string; positionId: string; sessionId: string };
  row: PreparedRow;
  rollingSpeedMps: number | null;
  totalPings: number;
  hadState: boolean;
}

/**
 * Avança o snapshot do veículo, e só avança.
 *
 * A condição `recorded_at < novo` no próprio UPDATE é o que torna isto seguro
 * com dois lotes chegando ao mesmo tempo: o banco decide quem é mais recente,
 * não a aplicação. Sem isso, dois lotes concorrentes gravariam por último o que
 * terminasse depois — que não é o mesmo que o mais recente.
 */
async function advancePositionState(params: AdvanceParams): Promise<boolean> {
  const admin = supabaseAdmin();
  const { row } = params;

  const patch = {
    race_id: params.session.raceId,
    session_id: params.session.sessionId,
    lat: row.lat,
    lng: row.lng,
    accuracy_m: row.accuracy_m,
    speed_mps: row.speed_mps,
    heading_deg: row.heading_deg,
    recorded_at: row.recorded_at,
    received_at: new Date().toISOString(),
    route_offset_m: row.route_offset_m,
    snap_distance_m: row.snap_distance_m,
    off_route: row.off_route,
    rolling_speed_mps: params.rollingSpeedMps,
    battery_pct: row.battery_pct,
    total_pings: params.totalPings,
    updated_at: new Date().toISOString(),
  };

  if (!params.hadState) {
    const { error } = await admin
      .from("position_state")
      .upsert({ position_id: params.session.positionId, ...patch }, {
        onConflict: "position_id",
        ignoreDuplicates: true,
      });

    // Sem erro e sem linha anterior: inserimos agora. Com conflito ignorado,
    // a linha já existia e o UPDATE condicional abaixo resolve.
    if (!error) {
      const { data } = await admin
        .from("position_state")
        .select("recorded_at")
        .eq("position_id", params.session.positionId)
        .maybeSingle<{ recorded_at: string }>();

      if (data && data.recorded_at === row.recorded_at) return true;
    }
  }

  const { data, error } = await admin
    .from("position_state")
    .update(patch)
    .eq("position_id", params.session.positionId)
    .lt("recorded_at", row.recorded_at)
    .select("position_id");

  if (error) {
    console.warn("[driver/ping] falha ao atualizar position_state:", error.message);
    return false;
  }

  return (data?.length ?? 0) > 0;
}
