/**
 * Validação e ordenação do lote de pings.
 *
 * Módulo puro (sem banco, sem `server-only`) porque é a parte da ingestão com
 * mais casos de borda e a que mais precisa de teste: relógio de celular
 * adiantado, fila offline descarregando fora de ordem, GPS devolvendo fixo de
 * antena com 3 km de erro, e o mesmo ping chegando duas vezes.
 *
 * Regras de rejeição são deliberadamente EXPLÍCITAS e viajam de volta ao app:
 * um ping rejeitado sai da fila offline do aparelho. Rejeitar sem motivo faria
 * o app reenviar o mesmo lixo para sempre; aceitar lixo faria o marcador do
 * veículo pular pelo mapa.
 */

import { snapToRoute, SnapInputError, type SnapPrevious } from "@/lib/route/snap";
import type { RouteIndex } from "@/lib/route/track";
import type { ClientPing } from "@/lib/types";

/** Um lote maior que isto é bug do cliente, não fila offline legítima. */
export const MAX_BATCH_SIZE = 500;

/**
 * Tolerância para relógio adiantado.
 *
 * Curta de propósito. `position_state` só avança para `recorded_at` mais
 * recente: um único ping com data no futuro congelaria o veículo no mapa até
 * aquele instante chegar de verdade. Um celular pode estar minutos errado, não
 * horas — e horas de erro tornam o dado inútil de qualquer forma.
 */
export const MAX_FUTURE_SKEW_MS = 15 * 60_000;

/** Fila offline legítima pode ser longa; mais que isto é dado de outra prova. */
export const MAX_PAST_AGE_MS = 48 * 60 * 60_000;

/**
 * Acima disto o "fixo" veio de triangulação de antena, não de GPS. Um ponto com
 * 2 km de incerteza colocado no mapa é pior que nenhum ponto.
 */
export const MAX_ACCURACY_M = 1500;

export interface ValidatedPing {
  clientPingId: string;
  clientSeq: number;
  lat: number;
  lng: number;
  accuracyM: number | null;
  altitudeM: number | null;
  speedMps: number | null;
  headingDeg: number | null;
  recordedAtMs: number;
  recordedAtIso: string;
  batteryPct: number | null;
  queuedOffline: boolean;
}

export interface PingRejection {
  clientPingId: string;
  reason: string;
}

export interface BatchValidation {
  accepted: ValidatedPing[];
  rejected: PingRejection[];
}

export type BatchParse =
  | { ok: true; value: BatchValidation }
  | { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validatePingBatch(raw: unknown, serverNowMs: number): BatchParse {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Corpo da requisição precisa ser um objeto JSON." };
  }

  const pings = (raw as { pings?: unknown }).pings;

  if (!Array.isArray(pings)) {
    return { ok: false, error: "Campo `pings` precisa ser um array." };
  }

  if (pings.length === 0) {
    return { ok: true, value: { accepted: [], rejected: [] } };
  }

  if (pings.length > MAX_BATCH_SIZE) {
    return {
      ok: false,
      error: `Lote com ${pings.length} pings excede o máximo de ${MAX_BATCH_SIZE}. Divida o envio.`,
    };
  }

  const accepted: ValidatedPing[] = [];
  const rejected: PingRejection[] = [];
  const seen = new Set<string>();

  for (const item of pings) {
    const outcome = validateOne(item, serverNowMs);

    if (!outcome.ok) {
      rejected.push(outcome.rejection);
      continue;
    }

    // Duplicata dentro do mesmo lote sai em silêncio: o id já está em
    // `accepted`, então o app o remove da fila de qualquer jeito. Reportá-lo
    // como rejeitado colocaria o mesmo id nas duas listas da resposta.
    if (seen.has(outcome.ping.clientPingId)) continue;

    seen.add(outcome.ping.clientPingId);
    accepted.push(outcome.ping);
  }

  // A ordem em que os pings chegaram não é a ordem em que aconteceram. Quando
  // a fila offline descarrega junto com os pings novos, processar na ordem de
  // chegada faria o snap usar como "anterior" um ponto do futuro e jogaria o
  // veículo para a perna errada da estrada.
  accepted.sort((a, b) =>
    a.recordedAtMs !== b.recordedAtMs
      ? a.recordedAtMs - b.recordedAtMs
      : a.clientSeq - b.clientSeq,
  );

  return { ok: true, value: { accepted, rejected } };
}

type OneResult =
  | { ok: true; ping: ValidatedPing }
  | { ok: false; rejection: PingRejection };

function validateOne(item: unknown, serverNowMs: number): OneResult {
  const p = item as Partial<ClientPing> | null;

  const id = typeof p?.clientPingId === "string" ? p.clientPingId : "";

  // Sem id não há idempotência possível, e o índice único do banco é sobre um
  // uuid. Um id inválido é irrecuperável — rejeitar é a única saída honesta.
  if (!UUID_RE.test(id)) {
    return {
      ok: false,
      rejection: { clientPingId: id || "(sem id)", reason: "clientPingId não é um UUID válido." },
    };
  }

  const reject = (reason: string): OneResult => ({
    ok: false,
    rejection: { clientPingId: id, reason },
  });

  if (!isFiniteNumber(p?.lat) || !isFiniteNumber(p?.lng)) {
    return reject("Coordenada ausente ou não numérica.");
  }

  const lat = p!.lat as number;
  const lng = p!.lng as number;

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return reject("Coordenada fora do intervalo geográfico válido.");
  }

  // (0, 0) é o Golfo da Guiné: nenhuma prova acontece lá, e é o valor que
  // aparece quando a API de geolocalização devolve um objeto zerado.
  if (lat === 0 && lng === 0) {
    return reject("Coordenada (0, 0) — leitura inválida do GPS.");
  }

  const accuracyM = optionalNumber(p?.accuracyM);
  if (accuracyM != null && accuracyM > MAX_ACCURACY_M) {
    return reject(`Precisão de ${Math.round(accuracyM)} m acima do limite de ${MAX_ACCURACY_M} m.`);
  }

  const recordedAtMs = parseIsoMs(p?.recordedAt);
  if (recordedAtMs === null) {
    return reject("recordedAt não é uma data ISO 8601 válida.");
  }

  if (recordedAtMs - serverNowMs > MAX_FUTURE_SKEW_MS) {
    return reject(
      `recordedAt está ${Math.round((recordedAtMs - serverNowMs) / 60000)} min no futuro — relógio do aparelho desregulado.`,
    );
  }

  if (serverNowMs - recordedAtMs > MAX_PAST_AGE_MS) {
    return reject("recordedAt tem mais de 48 h — ping de outra prova ou fila corrompida.");
  }

  const batteryRaw = optionalNumber(p?.batteryPct);
  const batteryPct =
    batteryRaw == null ? null : Math.max(0, Math.min(100, Math.round(batteryRaw)));

  const headingRaw = optionalNumber(p?.headingDeg);
  const headingDeg =
    headingRaw == null ? null : ((headingRaw % 360) + 360) % 360;

  const speedRaw = optionalNumber(p?.speedMps);
  // Velocidade negativa existe em algumas implementações de `Geolocation` como
  // "desconhecida". Guardar -1 como velocidade envenenaria qualquer média.
  const speedMps = speedRaw == null || speedRaw < 0 ? null : speedRaw;

  const seqRaw = optionalNumber(p?.clientSeq);

  return {
    ok: true,
    ping: {
      clientPingId: id.toLowerCase(),
      clientSeq: seqRaw == null ? 0 : Math.trunc(seqRaw),
      lat,
      lng,
      accuracyM,
      altitudeM: optionalNumber(p?.altitudeM),
      speedMps,
      headingDeg,
      recordedAtMs,
      recordedAtIso: new Date(recordedAtMs).toISOString(),
      batteryPct,
      queuedOffline: p?.queuedOffline === true,
    },
  };
}

/**
 * Estimativa do desvio do relógio do aparelho.
 *
 * Só o ping mais recente que NÃO passou pela fila offline serve: para um ping
 * que ficou 2 minutos na fila, `agora − recordedAt` mede o tempo de fila, não o
 * erro do relógio. Confundir os dois faria o diagnóstico de "celular com hora
 * errada" acender toda vez que alguém perdesse sinal.
 */
export function estimateClockSkewMs(
  accepted: ValidatedPing[],
  serverNowMs: number,
): number | null {
  let freshest: ValidatedPing | null = null;

  for (const p of accepted) {
    if (p.queuedOffline) continue;
    if (!freshest || p.recordedAtMs > freshest.recordedAtMs) freshest = p;
  }

  if (!freshest) return null;

  return Math.round(serverNowMs - freshest.recordedAtMs);
}

// ---------------------------------------------------------------------------
// Ancoragem do lote
// ---------------------------------------------------------------------------

/** Linha pronta para `location_pings`. */
export interface PreparedPingRow {
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
  snap_confidence: "high" | "medium" | "low" | null;
  snap_ambiguous: boolean;
  snap_method: string | null;
  lap: number;
  client_seq: number;
  client_ping_id: string;
  battery_pct: number | null;
  queued_offline: boolean;
}

export interface PrepareParams {
  accepted: ValidatedPing[];
  session: { raceId: string; positionId: string; sessionId: string };
  /** `null` quando a prova não tem percurso ativo — os pings entram sem âncora. */
  route: { index: RouteIndex; totalDistanceM: number; laps: number } | null;
  previous: SnapPrevious | null;
  clockSkewMs: number | null;
  rollingSpeedFallbackMps: number | null;
}

export interface PrepareResult {
  rows: PreparedPingRow[];
  /** Estado do último ping do lote, para atualizar `position_state`. */
  last: {
    absoluteOffsetM: number | null;
    lap: number;
    ambiguous: boolean;
    confidence: "high" | "medium" | "low" | null;
  } | null;
}

/**
 * Ancora cada ping e monta as linhas do banco.
 *
 * Duas coisas que a versão anterior desta função jogava fora, e que o banco
 * agora tem colunas para guardar:
 *
 *  1. QUALIDADE DA ÂNCORA (`confidence`, `ambiguous`, `method`). O snap SABE
 *     quando escolheu por desempate em vez de por geometria. Descartar esse
 *     aviso transformava palpite em fato: medido, 12 min sem sinal numa perna
 *     de retorno jogaram a âncora 37 km para trás, gravada com
 *     `off_route = false` e `snap_distance_m = 0` — indistinguível de uma
 *     posição perfeita, e a ambulância a 200 m do ciclista foi anunciada a
 *     37,6 km.
 *
 *  2. VOLTA (`lap`) e OFFSET ABSOLUTO. Num circuito, o mesmo ponto do mapa
 *     pertence a todas as voltas. Sem devolver `lap` ao cursor, todo ping
 *     volta a ser interpretado como primeira volta: medido, 120,7 km
 *     percorridos viraram 10,9 km gravados.
 *
 * Pura de propósito — recebe o índice do percurso pronto e não toca em banco.
 */
export function prepareRows(params: PrepareParams): PrepareResult {
  const rows: PreparedPingRow[] = [];
  let cursor = params.previous;
  let last: PrepareResult["last"] = null;

  /**
   * Velocidade OBSERVADA ao longo do percurso, em escala absoluta.
   *
   * Não é a mesma coisa que a velocidade do GPS, e a diferença quebrou o
   * sistema num circuito: o modelo de movimento precisa saber quanto o veículo
   * avança DE PROVA por segundo, enquanto o GPS reporta quanto ele avança pelo
   * ESPAÇO. Numa descida sinuosa as duas já divergem; num aparelho cuja leitura
   * de velocidade está errada, divergem completamente.
   *
   * Medido: um veículo cobrindo 300 m de percurso a cada 7,5 s (40 m/s) que
   * reportava 12 m/s fazia o modelo esperar +90 m. Na linha de largada de um
   * circuito, essa previsão atrasada favorecia os candidatos ANTES da linha, a
   * volta nunca era contada, e o offset local passava a andar para trás — o
   * veículo aparecia dirigindo em sentido contrário. 442 pings, todos gravados
   * como volta 0, com a posição local correta e a distância de prova errada
   * por duas voltas inteiras.
   *
   * Ordem de preferência, da mais confiável para a menos:
   *   1. observada neste lote  — mede exatamente a grandeza que se quer prever
   *   2. média móvel gravada   — mesma grandeza, calculada em escala absoluta
   *   3. reportada pelo GPS    — grandeza diferente, usada só na falta das duas
   */
  let observedSpeedMps: number | null = null;

  for (const ping of params.accepted) {
    let routeOffsetM: number | null = null;
    let snapDistanceM: number | null = null;
    let offRoute = false;
    let confidence: "high" | "medium" | "low" | null = null;
    let ambiguous = false;
    let method: string | null = null;
    let lap = 0;

    if (params.route) {
      try {
        const snapped = snapToRoute(
          params.route.index,
          { lat: ping.lat, lng: ping.lng },
          {
            previous: cursor,
            recordedAtMs: ping.recordedAtMs,
            // A precisão informada pelo GPS afina o peso da geometria contra o
            // modelo de movimento: fixo ruim, geometria vale menos.
            accuracyM: ping.accuracyM,
            expectedSpeedMps:
              observedSpeedMps ??
              params.rollingSpeedFallbackMps ??
              ping.speedMps ??
              null,
          },
        );

        routeOffsetM = snapped.offsetM;
        snapDistanceM = snapped.snapDistanceM;
        offRoute = snapped.offRoute;
        confidence = snapped.confidence;
        ambiguous = snapped.ambiguous;
        method = snapped.method;
        // A volta não pode passar do que a prova tem. Ruído no fim da última
        // volta não pode inventar uma volta que não existe.
        lap = Math.min(snapped.lap, Math.max(0, params.route.laps - 1));

        // Velocidade observada em escala ABSOLUTA: sem contar a volta, a
        // passagem pela linha de largada faria o offset cair de 54 800 para 30
        // e a velocidade viraria um número negativo gigante.
        if (cursor) {
          const dtSeconds = (ping.recordedAtMs - cursor.recordedAtMs) / 1000;
          if (dtSeconds > 0 && dtSeconds <= 120) {
            const antes =
              (cursor.lap ?? 0) * params.route.totalDistanceM + cursor.offsetM;
            const agora = lap * params.route.totalDistanceM + snapped.offsetM;
            observedSpeedMps = Math.max(0, (agora - antes) / dtSeconds);
          }
        }

        // Cada ping alimenta o próximo — offset, VOLTA e velocidade. É isto
        // que faz um lote acumulado offline ser reconstruído com a mesma
        // qualidade de um fluxo ao vivo, em vez de ser resolvido pela busca
        // global (que, num circuito, não tem como saber a volta).
        cursor = {
          offsetM: snapped.offsetM,
          lap,
          recordedAtMs: ping.recordedAtMs,
          // `SnapPrevious.speedMps` documenta "velocidade ao longo do
          // percurso". Entregar a do GPS aqui cumpria a assinatura e mentia
          // sobre a grandeza.
          speedMps:
            observedSpeedMps ??
            params.rollingSpeedFallbackMps ??
            ping.speedMps ??
            null,
        };

        last = {
          absoluteOffsetM: lap * params.route.totalDistanceM + snapped.offsetM,
          lap,
          ambiguous,
          confidence,
        };
      } catch (error) {
        // `SnapInputError` só acontece com coordenada não finita, que a
        // validação já barra. Se acontecer, o ping ainda vale como posição
        // bruta: gravar sem âncora é melhor que perder o ponto.
        if (!(error instanceof SnapInputError)) throw error;
      }
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
      snap_confidence: confidence,
      snap_ambiguous: ambiguous,
      snap_method: method,
      lap,
      client_seq: ping.clientSeq,
      client_ping_id: ping.clientPingId,
      battery_pct: ping.batteryPct,
      queued_offline: ping.queuedOffline,
    });
  }

  return { rows, last };
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

function isFiniteNumber(v: unknown): boolean {
  return typeof v === "number" && Number.isFinite(v);
}

function optionalNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function parseIsoMs(v: unknown): number | null {
  if (typeof v !== "string" || v.length === 0) return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
}
