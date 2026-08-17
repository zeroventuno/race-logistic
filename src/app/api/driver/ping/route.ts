import { getTranslator } from "@/lib/i18n/server";
import "server-only";

import { NextResponse } from "next/server";

import { driverError, driverJson, readJsonBody } from "@/app/api/driver/_lib/http";
import {
  estimateClockSkewMs,
  prepareRows,
  validatePingBatch,
  type PreparedPingRow,
} from "@/app/api/driver/_lib/ingest";
import { authenticateDriver, touchSession } from "@/app/api/driver/_lib/session";
import { rollingSpeedMps, type OffsetSample } from "@/lib/route/gap";
import type { SnapPrevious } from "@/lib/route/snap";
import { loadRaceRoute } from "@/lib/route/store";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PingBatchResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Ingestão de GPS em lote.
 *
 * Este é o caminho quente do sistema: um veículo manda um lote a cada poucos
 * segundos, durante seis horas, e qualquer erro aqui aparece como um marcador
 * pulando pelo mapa da direção. Cinco invariantes sustentam a rota:
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
 *  3. CONTINUIDADE COMPLETA. Cada ping entrega ao próximo o offset, a VOLTA e
 *     a velocidade. Faltando qualquer um dos três a reconstrução degrada: sem
 *     velocidade o erro chega a 537 m num trecho de retorno; sem volta, um
 *     circuito de 3 voltas grava 10,9 km dos 120,7 km percorridos.
 *
 *  4. A QUALIDADE DA ÂNCORA É GRAVADA JUNTO. `snap_confidence`,
 *     `snap_ambiguous` e `snap_method` viajam para o banco. Sem eles, uma
 *     âncora escolhida por desempate — que pode estar 37 km fora — é
 *     indistinguível de uma posição perfeita.
 *
 *  5. `position_state` SÓ AVANÇA. Um ping antigo que chega atrasado entra no
 *     histórico, mas não pode puxar o marcador do veículo para trás no mapa.
 */

/** Janela usada para a velocidade média ao longo do percurso. */
const ROLLING_WINDOW_MS = 180_000;

/** Quanto histórico buscar para calcular essa média. */
const ROLLING_LOOKBACK_MS = 300_000;

interface StateRow {
  recorded_at: string;
  route_offset_m: number | null;
  absolute_offset_m: number | null;
  lap: number;
  off_route: boolean;
  rolling_speed_mps: number | null;
  total_pings: number;
}

interface PreviousPingRow {
  recorded_at: string;
  route_offset_m: number | null;
  speed_mps: number | null;
  lap: number | null;
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

  const serverNowMs = Date.now();
  const parsed = validatePingBatch(body.value, serverNowMs, t);

  if (!parsed.ok) {
    return driverError("bad_request", parsed.error);
  }

  const { accepted, rejected } = parsed.value;

  const { data: stateBefore } = await admin
    .from("position_state")
    .select(
      "recorded_at, route_offset_m, absolute_offset_m, lap, off_route, rolling_speed_mps, total_pings",
    )
    .eq("position_id", session.positionId)
    .maybeSingle<StateRow>();

  const route = await loadRouteSafely(session.raceId);
  const raceDistanceM = route?.raceDistanceM ?? null;

  if (accepted.length === 0) {
    return driverJson<PingBatchResponse>({
      accepted: [],
      rejected,
      state: {
        routeOffsetM: stateBefore?.route_offset_m ?? null,
        offRoute: stateBefore?.off_route ?? false,
        totalDistanceM: raceDistanceM,
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
    route: route
      ? {
          index: route.index,
          totalDistanceM: route.track.totalDistanceM,
          laps: route.laps,
        }
      : null,
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
    console.error("[driver/ping] falha ao gravar pings:", insertError.message);
    return driverError(
      "server_error",
      "Falha ao gravar os pings. Mantenha na fila e tente de novo.",
    );
  }

  const last = prepared.rows[prepared.rows.length - 1]!;
  const newestMs = Date.parse(last.recorded_at);

  const rolling = route
    ? await computeRollingSpeed(
        session.positionId,
        newestMs,
        route.track.totalDistanceM,
      )
    : null;

  const advanced = await advancePositionState({
    session: {
      raceId: session.raceId,
      positionId: session.positionId,
      sessionId: session.sessionId,
    },
    row: last,
    absoluteOffsetM: prepared.last?.absoluteOffsetM ?? null,
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
      totalDistanceM: raceDistanceM,
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
 *
 * A VOLTA vem junto. Sem ela, o cursor diz "km 3" e o snap entende "km 3 da
 * primeira volta" — o veículo na terceira volta é jogado 100 km para trás a
 * cada lote.
 */
async function loadSnapCursor(
  positionId: string,
  firstRecordedAtIso: string,
  rollingSpeedFallbackMps: number | null,
): Promise<SnapPrevious | null> {
  const { data } = await supabaseAdmin()
    .from("location_pings")
    .select("recorded_at, route_offset_m, speed_mps, lap")
    .eq("position_id", positionId)
    .not("route_offset_m", "is", null)
    .lte("recorded_at", firstRecordedAtIso)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle<PreviousPingRow>();

  if (!data || data.route_offset_m == null) return null;

  return {
    offsetM: data.route_offset_m,
    lap: data.lap ?? 0,
    recordedAtMs: Date.parse(data.recorded_at),
    // A média móvel primeiro: ela é calculada em escala absoluta e mede avanço
    // AO LONGO DO PERCURSO, que é a grandeza que o modelo de movimento prevê.
    // `speed_mps` é a leitura do GPS — velocidade pelo espaço — e só serve
    // quando não há histórico suficiente para a média.
    speedMps: rollingSpeedFallbackMps ?? data.speed_mps,
  };
}

/**
 * Velocidade média ao longo da PROVA, em escala absoluta.
 *
 * Usar `route_offset_m` cru aqui faria a passagem pela linha de largada
 * (offset volta a zero) virar velocidade negativa gigante, e o `Math.max(0)`
 * de `rollingSpeedMps` transformaria isso em "parado" — o veículo mais rápido
 * do circuito reportado como imóvel a cada volta.
 */
async function computeRollingSpeed(
  positionId: string,
  newestMs: number,
  trackTotalM: number,
): Promise<number | null> {
  const since = new Date(newestMs - ROLLING_LOOKBACK_MS).toISOString();

  const { data } = await supabaseAdmin()
    .from("location_pings")
    .select("recorded_at, route_offset_m, lap")
    .eq("position_id", positionId)
    .not("route_offset_m", "is", null)
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: true })
    .limit(400);

  if (!data || data.length < 2) return null;

  const history: OffsetSample[] = data.map((r) => ({
    offsetM: (Number(r.lap ?? 0) || 0) * trackTotalM + (r.route_offset_m as number),
    atMs: Date.parse(r.recorded_at as string),
  }));

  return rollingSpeedMps(history, newestMs, ROLLING_WINDOW_MS);
}

interface AdvanceParams {
  session: { raceId: string; positionId: string; sessionId: string };
  row: PreparedPingRow;
  absoluteOffsetM: number | null;
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
    absolute_offset_m: params.absoluteOffsetM,
    lap: row.lap,
    snap_distance_m: row.snap_distance_m,
    off_route: row.off_route,
    snap_confidence: row.snap_confidence,
    snap_ambiguous: row.snap_ambiguous,
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
