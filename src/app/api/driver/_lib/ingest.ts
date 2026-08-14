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
