"use client";

/**
 * Captura de posição.
 *
 * `watchPosition` em vez de `getCurrentPosition` em laço: o navegador mantém o
 * chip de GPS ligado entre as leituras e entrega fixos melhores gastando menos
 * bateria do que ligar e desligar a cada intervalo.
 *
 * A vazão bruta do `watchPosition` não serve para transmissão — em movimento
 * ele dispara várias vezes por segundo, e parado repete o mesmo ponto. O
 * amortecedor abaixo transforma isso em uma trilha útil: um ponto a cada
 * ~4 s, ou antes disso se o veículo andou o bastante para o ponto novo
 * significar alguma coisa.
 */

export type GeolocationStatus =
  | "idle"
  | "acquiring"
  | "ok"
  | "denied"
  | "unavailable"
  | "timeout";

export interface GeoFix {
  lat: number;
  lng: number;
  accuracyM: number | null;
  altitudeM: number | null;
  speedMps: number | null;
  headingDeg: number | null;
  recordedAtMs: number;
}

export interface WatchHandlers {
  onFix: (fix: GeoFix) => void;
  onStatus: (status: GeolocationStatus, message: string | null) => void;
}

/** Intervalo mínimo entre pontos transmitidos. */
const MIN_INTERVAL_MS = 4000;

/** Distância que, sozinha, justifica um ponto novo antes do intervalo. */
const MIN_MOVE_M = 30;

/**
 * Espelha o limite do servidor (`MAX_ACCURACY_M` na ingestão). Filtrar aqui
 * também evita gastar fila e dados com um fixo que seria rejeitado do outro
 * lado — e o servidor continua sendo a autoridade.
 */
const MAX_ACCURACY_M = 1500;

export function watchDriverPosition(handlers: WatchHandlers): () => void {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    handlers.onStatus(
      "unavailable",
      "Este navegador não fornece localização. Use o Chrome ou o Safari do celular.",
    );
    return () => undefined;
  }

  handlers.onStatus("acquiring", null);

  let lastEmitMs = 0;
  let lastLat: number | null = null;
  let lastLng: number | null = null;

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const c = position.coords;
      const accuracyM = Number.isFinite(c.accuracy) ? c.accuracy : null;

      handlers.onStatus("ok", null);

      if (accuracyM != null && accuracyM > MAX_ACCURACY_M) return;

      const nowMs = position.timestamp || Date.now();
      const movedM =
        lastLat == null || lastLng == null
          ? Infinity
          : roughMeters(lastLat, lastLng, c.latitude, c.longitude);

      if (nowMs - lastEmitMs < MIN_INTERVAL_MS && movedM < MIN_MOVE_M) return;

      lastEmitMs = nowMs;
      lastLat = c.latitude;
      lastLng = c.longitude;

      handlers.onFix({
        lat: c.latitude,
        lng: c.longitude,
        accuracyM,
        altitudeM: Number.isFinite(c.altitude ?? NaN) ? (c.altitude as number) : null,
        speedMps: Number.isFinite(c.speed ?? NaN) && (c.speed as number) >= 0 ? (c.speed as number) : null,
        headingDeg: Number.isFinite(c.heading ?? NaN) ? (c.heading as number) : null,
        // O relógio do aparelho pode estar errado; o servidor mede o desvio e
        // registra. Reescrever o instante aqui destruiria a única evidência.
        recordedAtMs: nowMs,
      });
    },
    (error) => {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          handlers.onStatus("denied", permissionInstructions());
          break;
        case error.POSITION_UNAVAILABLE:
          handlers.onStatus(
            "unavailable",
            "Sem sinal de GPS. Em túnel ou garagem isso é esperado; a captura volta sozinha.",
          );
          break;
        case error.TIMEOUT:
          handlers.onStatus("timeout", "GPS demorando para responder. Continuando a tentar.");
          break;
        default:
          handlers.onStatus("unavailable", error.message || "Falha ao obter posição.");
      }
    },
    {
      enableHighAccuracy: true,
      // Nunca aceitar um fixo em cache: a posição de 30 s atrás desenha o
      // veículo onde ele não está, e é exatamente isso que o sistema existe
      // para evitar.
      maximumAge: 0,
      timeout: 30_000,
    },
  );

  return () => navigator.geolocation.clearWatch(watchId);
}

/**
 * Instruções concretas. "Permissão negada" sozinho deixa o motorista preso: no
 * celular, o caminho para reabilitar não está no app, está no navegador.
 */
export function permissionInstructions(): string {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

  if (/iPhone|iPad|iPod/i.test(ua)) {
    return "Localização bloqueada. No iPhone: Ajustes → Safari → Localização → Perguntar, depois recarregue esta página. Se usa o app do Chrome, é Ajustes → Chrome → Localização.";
  }

  if (/Android/i.test(ua)) {
    return "Localização bloqueada. No Android: toque no cadeado ao lado do endereço → Permissões → Localização → Permitir, e recarregue a página.";
  }

  return "Localização bloqueada pelo navegador. Libere o acesso à localização nas permissões do site e recarregue a página.";
}

/** Aproximação plana suficiente para decidir "andou o bastante?". */
function roughMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * 111_132;
  const dLng = (lng2 - lng1) * 111_320 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}
