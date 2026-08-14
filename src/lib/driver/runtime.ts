"use client";

/**
 * Motor do app do motorista.
 *
 * Junta as quatro peças que precisam funcionar juntas durante seis horas num
 * celular preso num suporte: captura de GPS, fila persistente, envio com
 * repetição, e leitura do estado da prova. Fica fora do React de propósito —
 * o ciclo de vida disto é o da PROVA, não o de um componente. Um `useEffect`
 * mal escrito não pode ser capaz de parar a transmissão de um veículo.
 *
 * O contrato com a interface é um único `snapshot` imutável, publicado a cada
 * mudança e consumido por `useSyncExternalStore`. Isso mantém a UI incapaz de
 * inventar estado: se a tela diz "recebido pela direção", é porque o servidor
 * confirmou — não porque um `setState` otimista foi disparado no clique.
 */

import type {
  AlertConfirmationKind,
  DispatchResponseAction,
  DriverStateResponse,
} from "@/lib/driver/protocol";
import { UNBIND_ERROR_CODES } from "@/lib/driver/protocol";
import type { GeolocationStatus } from "@/lib/driver/geolocation";
import { watchDriverPosition } from "@/lib/driver/geolocation";
import { OutboxQueue, type OutboxRecord, type QueuedAction } from "@/lib/driver/queue";
import {
  createQueueStore,
  loadAlertAcks,
  recordAlertAck,
  type StoredSession,
} from "@/lib/driver/storage";
import {
  confirmAlert,
  fetchState,
  respondToDispatch,
  sendAlert,
  sendPings,
} from "@/lib/driver/transport";
import { keepScreenAwake, type WakeLockController } from "@/lib/driver/wake-lock";
import type { AlertCategory, ClientAlert, ClientPing } from "@/lib/types";

/** Intervalo do relógio interno. Tudo é decidido por tempo, não por evento. */
const TICK_MS = 1000;

/** Envio em repouso: agrupa pings para gastar menos bateria e menos dados. */
const IDLE_FLUSH_MS = 8000;

/** Teto do backoff para pings. */
const PING_BACKOFF_CEILING_MS = 60_000;

/**
 * Teto do backoff quando há ALERTA na fila. Muito menor: um alerta esperando
 * 60 s por uma nova tentativa é meio minuto de socorro parado.
 */
const ALERT_BACKOFF_CEILING_MS = 15_000;

const POLL_VISIBLE_MS = 10_000;
const POLL_HIDDEN_MS = 30_000;

/** Pings por requisição. Cabe folgado num lote de 2 min de fila offline. */
const PING_BATCH_SIZE = 100;

export type ConnectionState = "online" | "sending" | "unstable" | "offline" | "revoked";

export interface PendingAlertView {
  clientAlertId: string;
  category: AlertCategory;
  createdAt: string;
  attempts: number;
  lastError: string | null;
}

/** Resposta a um acionamento que ainda está na fila, esperando confirmação. */
export interface QueuedActionView {
  alertId: string;
  kind: "dispatch_response" | "confirmation";
  action: DispatchResponseAction | AlertConfirmationKind;
}

/** Um alerta já confirmado pelo servidor, guardado localmente. */
export interface AckedAlertView {
  clientAlertId: string;
  alertId: string;
  category: AlertCategory;
  createdAt: string;
  dispatchLabel: string | null;
  dispatchFailed: boolean;
}

export interface DriverSnapshot {
  connection: ConnectionState;
  /** A fila sobrevive ao fechamento do app? `false` = só memória. */
  durableQueue: boolean;
  queuedPings: number;
  queuedAlerts: number;
  /** Respostas a acionamento e confirmações ainda não entregues. */
  queuedActions: QueuedActionView[];
  lastSyncAtMs: number | null;
  lastSyncError: string | null;
  gps: GeolocationStatus;
  gpsMessage: string | null;
  lastFixAtMs: number | null;
  lastFixAccuracyM: number | null;
  wakeLockActive: boolean;
  /** Alertas ainda NÃO confirmados pelo servidor. */
  pendingAlerts: PendingAlertView[];
  /** Alertas com ack do servidor, com o que ele respondeu sobre o acionamento. */
  ackedAlerts: AckedAlertView[];
  /**
   * O alerta não pôde nem ser ENFILEIRADO. É a pior falha do app: nada foi
   * gravado, nada será reenviado. A tela precisa mandar o motorista usar o
   * rádio.
   */
  alertStorageError: string | null;
  /**
   * Pings que o servidor recusou nominalmente (relógio absurdo, coordenada
   * inválida). Invisível, isto vira seis horas de prova sem um único ponto no
   * mapa com o indicador de conexão verde.
   */
  rejectedPings: { count: number; reason: string } | null;
  state: DriverStateResponse | null;
  stateError: string | null;
  /** Preenchido quando o vínculo morreu e o app precisa pedir código de novo. */
  revokedMessage: string | null;
}

const INITIAL: DriverSnapshot = {
  connection: "offline",
  durableQueue: true,
  queuedPings: 0,
  queuedAlerts: 0,
  queuedActions: [],
  lastSyncAtMs: null,
  lastSyncError: null,
  gps: "idle",
  gpsMessage: null,
  lastFixAtMs: null,
  lastFixAccuracyM: null,
  wakeLockActive: false,
  pendingAlerts: [],
  ackedAlerts: [],
  alertStorageError: null,
  rejectedPings: null,
  state: null,
  stateError: null,
  revokedMessage: null,
};

export function initialSnapshot(): DriverSnapshot {
  return INITIAL;
}

const SEQ_KEY = "flamme-rouge.driver.seq.v1";

export class DriverRuntime {
  private readonly queue: OutboxQueue;
  private readonly listeners = new Set<() => void>();

  private snapshot: DriverSnapshot = INITIAL;
  private session: StoredSession;

  private timer: ReturnType<typeof setInterval> | null = null;
  private stopWatch: (() => void) | null = null;
  private wakeLock: WakeLockController | null = null;

  private flushing = false;
  private failures = 0;
  private nextFlushAtMs = 0;

  private polling = false;
  private nextPollAtMs = 0;
  private etag: string | null = null;

  private lastFix: ClientPing | null = null;
  /** Alertas cujo acionamento já fez o aparelho vibrar. */
  private readonly announced = new Set<string>();
  private seq: number;
  private batchSize = PING_BATCH_SIZE;
  private started = false;

  private readonly probeStore: () => Promise<boolean>;

  constructor(session: StoredSession) {
    this.session = session;

    const { store, durable, probe } = createQueueStore((reason) => {
      // Degradação para memória: a fila continua funcionando, mas não sobrevive
      // ao fechamento do app. O motorista precisa saber disso ANTES de precisar.
      this.patch({ durableQueue: false, lastSyncError: `Armazenamento local falhou: ${reason}` });
    });

    this.queue = new OutboxQueue(store);
    this.probeStore = probe;
    this.snapshot = { ...INITIAL, durableQueue: durable };

    this.seq = readSeq();
  }

  // -------------------------------------------------------------------------
  // Ciclo de vida
  // -------------------------------------------------------------------------

  start(): void {
    if (this.started) return;
    this.started = true;

    this.stopWatch = watchDriverPosition({
      onFix: (fix) => void this.onFix(fix),
      onStatus: (gps, gpsMessage) => this.patch({ gps, gpsMessage }),
    });

    this.wakeLock = keepScreenAwake((wakeLockActive) => this.patch({ wakeLockActive }));

    this.timer = setInterval(() => this.tick(), TICK_MS);

    window.addEventListener("online", this.onOnline);
    window.addEventListener("offline", this.onOffline);
    document.addEventListener("visibilitychange", this.onVisibility);

    // Confirma que o armazenamento aceita escrita ANTES de o motorista
    // precisar dele. `createStore` do idb-keyval não abre o banco até a
    // primeira operação, então sem esta verificação `durableQueue` seria um
    // palpite otimista.
    void this.probeStore().then((durable) => this.patch({ durableQueue: durable }));

    void this.refreshQueueCounts();
    void this.hydrateAcks();
    // Primeira leitura imediata: a tela não pode ficar vazia esperando 10 s.
    this.nextPollAtMs = 0;
    this.tick();
  }

  stop(): void {
    this.started = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.stopWatch?.();
    this.stopWatch = null;
    this.wakeLock?.release();
    this.wakeLock = null;

    window.removeEventListener("online", this.onOnline);
    window.removeEventListener("offline", this.onOffline);
    document.removeEventListener("visibilitychange", this.onVisibility);
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): DriverSnapshot => this.snapshot;

  // -------------------------------------------------------------------------
  // Entrada de dados
  // -------------------------------------------------------------------------

  private async onFix(fix: {
    lat: number;
    lng: number;
    accuracyM: number | null;
    altitudeM: number | null;
    speedMps: number | null;
    headingDeg: number | null;
    recordedAtMs: number;
  }): Promise<void> {
    const ping: ClientPing = {
      clientPingId: uuid(),
      clientSeq: this.nextSeq(),
      lat: fix.lat,
      lng: fix.lng,
      accuracyM: fix.accuracyM,
      altitudeM: fix.altitudeM,
      speedMps: fix.speedMps,
      headingDeg: fix.headingDeg,
      recordedAt: new Date(fix.recordedAtMs).toISOString(),
      batteryPct: await readBattery(),
      // Marcado como offline se, no instante da captura, não havia rede. É o
      // que permite ao servidor distinguir atraso de fila de relógio errado.
      queuedOffline: typeof navigator !== "undefined" && !navigator.onLine,
    };

    this.lastFix = ping;
    this.patch({ lastFixAtMs: fix.recordedAtMs, lastFixAccuracyM: fix.accuracyM });

    // Persistir ANTES de qualquer tentativa de envio. Este é o ponto exato em
    // que os 2 minutos sem sinal deixam de ser um problema.
    await this.queue.enqueuePing(ping);
    await this.refreshQueueCounts();
  }

  /**
   * Dispara um alerta.
   *
   * Resolve assim que o alerta está NA FILA — não quando chega ao servidor. A
   * interface tem que poder mostrar "na fila, sem sinal" imediatamente, e a
   * confirmação vem depois pelo snapshot. Prometer entrega aqui seria mentir
   * exatamente no momento em que a mentira custa mais caro.
   */
  async raiseAlert(
    category: AlertCategory,
    note: string | null,
  ): Promise<{ ok: true; clientAlertId: string } | { ok: false; error: string }> {
    const alert: ClientAlert = {
      clientAlertId: uuid(),
      category,
      note,
      lat: this.lastFix?.lat ?? null,
      lng: this.lastFix?.lng ?? null,
      accuracyM: this.lastFix?.accuracyM ?? null,
      createdAt: new Date().toISOString(),
    };

    try {
      await this.queue.enqueueAlert(alert);
    } catch (error) {
      // Último recurso: a fila resiliente já cai para memória sozinha, então
      // chegar aqui significa que NEM a memória aceitou. Não há como salvar o
      // alerta — só há como não mentir sobre isso.
      const message = (error as Error)?.message ?? "falha desconhecida";
      console.error("[driver] ALERTA NÃO ENFILEIRADO:", message);
      this.patch({
        alertStorageError: message,
        // A degradação é informação operacional: sem fila, nada será reenviado.
        durableQueue: false,
      });
      return { ok: false, error: message };
    }

    this.patch({ alertStorageError: null });
    await this.refreshQueueCounts();

    // Alerta fura o backoff: a próxima tentativa é agora.
    this.failures = 0;
    this.nextFlushAtMs = 0;
    void this.flush();

    return { ok: true, clientAlertId: alert.clientAlertId };
  }

  /**
   * Responde a um acionamento ("estou indo" / "cheguei" / "não posso").
   *
   * Passa pela fila igual ao alerta. O motivo é o mesmo e é forte: o veículo
   * acionado costuma estar EM MOVIMENTO, muitas vezes entrando justamente no
   * trecho de estrada onde o sinal é ruim. Perder o "estou indo" significa
   * deixar quem pediu socorro achando que ninguém assumiu.
   */
  async respondToDispatch(
    alertId: string,
    action: DispatchResponseAction,
    reason: string | null,
  ): Promise<void> {
    await this.queue.enqueueAction({
      type: "dispatch_response",
      alertId,
      action,
      reason,
      createdAt: new Date().toISOString(),
    });

    await this.refreshQueueCounts();
    this.failures = 0;
    this.nextFlushAtMs = 0;
    void this.flush();
  }

  /** Confirmação colaborativa ao passar pelo local de um alerta. */
  async confirmAlert(
    alertId: string,
    kind: AlertConfirmationKind,
    note: string | null,
  ): Promise<void> {
    await this.queue.enqueueAction({
      type: "confirmation",
      alertId,
      clientConfirmationId: uuid(),
      kind,
      note,
      lat: this.lastFix?.lat ?? null,
      lng: this.lastFix?.lng ?? null,
      createdAt: new Date().toISOString(),
    });

    await this.refreshQueueCounts();
    this.nextFlushAtMs = 0;
    void this.flush();
  }

  /** Chamado quando o motorista vincula de novo, com o mesmo ou outro código. */
  async rebind(session: StoredSession, previousPositionId: string): Promise<void> {
    this.session = session;
    this.etag = null;

    if (session.position.id !== previousPositionId) {
      const dropped = await this.queue.clearPings();
      if (dropped > 0) {
        console.info(`[driver] ${dropped} pings da posição anterior descartados.`);
      }
    }

    this.failures = 0;
    this.nextFlushAtMs = 0;
    this.nextPollAtMs = 0;
    this.patch({ revokedMessage: null, connection: "online" });
    await this.refreshQueueCounts();
  }

  // -------------------------------------------------------------------------
  // Relógio
  // -------------------------------------------------------------------------

  private tick(): void {
    if (this.snapshot.revokedMessage) return;

    const now = Date.now();

    if (!this.flushing && now >= this.nextFlushAtMs) void this.flush();
    if (!this.polling && now >= this.nextPollAtMs) void this.poll();

    // Conexão exibida: `navigator.onLine` é uma pista fraca (diz que existe
    // uma interface de rede, não que o servidor responde), então ela só
    // define o caso negativo. O positivo vem de ter conseguido falar.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (this.snapshot.connection !== "offline") this.patch({ connection: "offline" });
    }
  }

  private onOnline = (): void => {
    // Rede voltou: descarregar a fila imediatamente, sem esperar o backoff.
    this.failures = 0;
    this.nextFlushAtMs = 0;
    this.nextPollAtMs = 0;
    this.patch({ connection: "sending" });
    void this.flush();
  };

  private onOffline = (): void => {
    this.patch({ connection: "offline" });
  };

  private onVisibility = (): void => {
    if (document.visibilityState === "visible") {
      this.nextPollAtMs = 0;
      this.nextFlushAtMs = Math.min(this.nextFlushAtMs, Date.now());
    }
  };

  // -------------------------------------------------------------------------
  // Envio
  // -------------------------------------------------------------------------

  private async flush(): Promise<void> {
    if (this.flushing || this.snapshot.revokedMessage) return;
    this.flushing = true;

    try {
      const { alerts, actions, pings } = await this.queue.peek(this.batchSize);

      if (alerts.length === 0 && actions.length === 0 && pings.length === 0) {
        this.failures = 0;
        this.nextFlushAtMs = Date.now() + IDLE_FLUSH_MS;
        return;
      }

      this.patch({ connection: "sending" });

      const alertOutcome = await this.flushAlerts(alerts);
      if (alertOutcome === "revoked") return;

      let failed = alertOutcome === "failed";

      if (!failed && actions.length > 0) {
        const actionOutcome = await this.flushActions(actions);
        if (actionOutcome === "revoked") return;
        failed = actionOutcome === "failed";
      }

      if (!failed && pings.length > 0) {
        const pingOutcome = await this.flushPings(pings);
        if (pingOutcome === "revoked") return;
        failed = pingOutcome === "failed";
      }

      await this.refreshQueueCounts();

      if (failed) {
        this.failures++;
        this.nextFlushAtMs =
          Date.now() + backoffMs(this.failures, alerts.length > 0 || actions.length > 0);
        this.patch({ connection: navigatorOffline() ? "offline" : "unstable" });
        return;
      }

      this.failures = 0;
      this.patch({ connection: "online", lastSyncAtMs: Date.now(), lastSyncError: null });

      // Ainda sobrou fila (descarga de 2 min offline não cabe num lote só):
      // continuar no próximo tique em vez de esperar o intervalo de repouso.
      const counts = await this.queue.counts();
      const drained = counts.pings === 0 && counts.alerts === 0 && counts.actions === 0;
      this.nextFlushAtMs = Date.now() + (drained ? IDLE_FLUSH_MS : 0);
    } finally {
      this.flushing = false;
    }
  }

  private async flushAlerts(
    alerts: OutboxRecord<ClientAlert>[],
  ): Promise<"ok" | "failed" | "revoked"> {
    for (const record of alerts) {
      const result = await sendAlert(this.session.token, record.payload);

      if (result.ok) {
        // O ack guarda o que o servidor RESPONDEU, não só que respondeu: se o
        // `/state` seguinte não chegar (sinal caiu logo depois — o caso comum),
        // é daqui que a tela tira "recebido" e "quem foi acionado".
        await recordAlertAck({
          clientAlertId: record.payload.clientAlertId,
          alertId: result.value.alertId,
          receivedAtMs: Date.parse(result.value.receivedAt) || Date.now(),
          category: record.payload.category,
          createdAt: record.payload.createdAt,
          dispatchLabel: result.value.dispatch?.label ?? null,
          dispatchFailed: result.value.dispatchFailed,
        });
        // Só agora o alerta sai da fila. `deduplicated: true` conta como
        // sucesso: significa que o servidor já tinha este alerta.
        await this.queue.ack([record.key]);
        await this.hydrateAcks();
        continue;
      }

      if (result.kind === "http" && UNBIND_ERROR_CODES.includes(result.code)) {
        this.onRevoked(result.message);
        return "revoked";
      }

      await this.queue.markAttempt(record.key, result.message);
      this.patch({ lastSyncError: result.message });
      // Não tentamos os alertas seguintes nesta rodada: se a rede caiu, cada
      // tentativa extra é só mais timeout. O backoff cuida do resto.
      return "failed";
    }

    return "ok";
  }

  private async flushActions(
    actions: OutboxRecord<QueuedAction>[],
  ): Promise<"ok" | "failed" | "revoked"> {
    for (const record of actions) {
      const payload = record.payload;

      const result =
        payload.type === "dispatch_response"
          ? await respondToDispatch(
              this.session.token,
              payload.alertId,
              payload.action,
              payload.reason,
            )
          : await confirmAlert(this.session.token, payload.alertId, {
              clientConfirmationId: payload.clientConfirmationId,
              kind: payload.kind,
              note: payload.note,
              lat: payload.lat,
              lng: payload.lng,
            });

      if (result.ok) {
        await this.queue.ack([record.key]);
        continue;
      }

      if (result.kind === "http" && UNBIND_ERROR_CODES.includes(result.code)) {
        this.onRevoked(result.message);
        return "revoked";
      }

      // 404/400 numa ação são definitivos: o alerta sumiu ou a ação é inválida.
      // Insistir seria travar a fila atrás de um item que nunca vai passar — e
      // atrás dele estão os pings e, pior, os alertas seguintes.
      if (result.kind === "http" && (result.code === "not_found" || result.code === "bad_request")) {
        console.warn("[driver] ação descartada:", payload, result.message);
        await this.queue.ack([record.key]);
        continue;
      }

      await this.queue.markAttempt(record.key, result.message);
      this.patch({ lastSyncError: result.message });
      return "failed";
    }

    return "ok";
  }

  private async flushPings(
    pings: OutboxRecord<ClientPing>[],
  ): Promise<"ok" | "failed" | "revoked"> {
    const result = await sendPings(
      this.session.token,
      pings.map((p) => p.payload),
    );

    if (result.ok) {
      const accepted = new Set(result.value.accepted);
      const ackKeys = pings.filter((p) => accepted.has(p.payload.clientPingId)).map((p) => p.key);
      await this.queue.ack(ackKeys);

      if (result.value.rejected.length > 0) {
        // O servidor explicou por que recusou. Insistir seria reenviar lixo
        // para sempre e nunca esvaziar a fila — mas descartar em SILÊNCIO é
        // pior: com o relógio do aparelho adiantado, todos os pings de uma
        // prova inteira são recusados, `position_state` fica vazio, o veículo
        // nunca aparece no mapa — e a tela dizia "transmitindo", em verde.
        const reason = result.value.rejected[0]!.reason;
        console.warn("[driver] pings recusados:", result.value.rejected);

        await this.queue.dropPingsByClientId(
          result.value.rejected.map((r) => r.clientPingId),
        );

        this.patch({
          rejectedPings: {
            count: (this.snapshot.rejectedPings?.count ?? 0) + result.value.rejected.length,
            reason,
          },
        });
      } else if (result.value.accepted.length > 0 && this.snapshot.rejectedPings) {
        // Voltou a ser aceito (o motorista corrigiu a hora do aparelho): o
        // aviso some sozinho, senão vira ruído permanente.
        this.patch({ rejectedPings: null });
      }

      this.batchSize = PING_BATCH_SIZE;
      return "ok";
    }

    if (result.kind === "http" && UNBIND_ERROR_CODES.includes(result.code)) {
      this.onRevoked(result.message);
      return "revoked";
    }

    if (result.kind === "http" && result.code === "bad_request") {
      // O lote inteiro foi recusado sem detalhamento por ping. Encolher é a
      // única reação segura: descartar seria perder trajeto por um defeito que
      // pode estar do nosso lado.
      this.batchSize = Math.max(10, Math.floor(this.batchSize / 2));
    }

    this.patch({ lastSyncError: result.message });
    return "failed";
  }

  private onRevoked(message: string): void {
    // A fila NÃO é apagada: se o motorista vincular de novo na mesma posição,
    // tudo que estava preso sobe. Alertas então nunca morrem por revogação.
    this.patch({ connection: "revoked", revokedMessage: message });
  }

  // -------------------------------------------------------------------------
  // Leitura do estado da prova
  // -------------------------------------------------------------------------

  private async poll(): Promise<void> {
    if (this.polling || this.snapshot.revokedMessage) return;
    this.polling = true;

    try {
      const result = await fetchState(this.session.token, this.etag);

      if (result.ok) {
        if (!result.notModified) {
          this.etag = result.etag;
          this.patch({ state: result.value, stateError: null });
          this.announceProximity(result.value);
        }
        this.patch({ lastSyncAtMs: Date.now() });
        if (this.snapshot.connection === "offline") this.patch({ connection: "online" });
      } else if (result.kind === "http" && UNBIND_ERROR_CODES.includes(result.code)) {
        this.onRevoked(result.message);
      } else {
        this.patch({ stateError: result.message });
      }
    } finally {
      this.polling = false;
      const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
      this.nextPollAtMs = Date.now() + (hidden ? POLL_HIDDEN_MS : POLL_VISIBLE_MS);
    }
  }

  // -------------------------------------------------------------------------
  // Estado publicado
  // -------------------------------------------------------------------------

  /**
   * Aviso físico de proximidade e de acionamento.
   *
   * Vibração e bipe uma única vez por alerta, guiados pelo `firstNotice` que o
   * servidor calcula. Alarme repetido a cada leitura de estado é alarme que o
   * motorista desliga — e aí o próximo, o que importava, também não toca.
   */
  private announceProximity(state: DriverStateResponse): void {
    const shouldBuzz =
      state.proximity.some((p) => p.firstNotice) ||
      state.alerts.some(
        (a) => a.dispatchedToSelf && !a.dispatch?.acknowledgedAt && !this.announced.has(a.alertId),
      );

    for (const alert of state.alerts) {
      if (alert.dispatchedToSelf) this.announced.add(alert.alertId);
    }

    if (!shouldBuzz) return;

    try {
      navigator.vibrate?.([250, 120, 250, 120, 400]);
    } catch {
      /* vibração é conforto, não requisito */
    }
  }

  private async refreshQueueCounts(): Promise<void> {
    const counts = await this.queue.counts();
    const pending = await this.queue.pendingAlerts();
    const { actions } = await this.queue.peek(0);

    this.patch({
      queuedPings: counts.pings,
      queuedAlerts: counts.alerts,
      queuedActions: actions.map((a) => ({
        alertId: a.payload.alertId,
        kind: a.payload.type,
        action: a.payload.type === "dispatch_response" ? a.payload.action : a.payload.kind,
      })),
      pendingAlerts: pending.map((p) => ({
        clientAlertId: p.payload.clientAlertId,
        category: p.payload.category,
        createdAt: p.payload.createdAt,
        attempts: p.attempts,
        lastError: p.lastError,
      })),
    });
  }

  private async hydrateAcks(): Promise<void> {
    const acks = await loadAlertAcks();
    this.patch({
      ackedAlerts: acks.map((a) => ({
        clientAlertId: a.clientAlertId,
        alertId: a.alertId,
        category: a.category,
        createdAt: a.createdAt,
        dispatchLabel: a.dispatchLabel,
        dispatchFailed: a.dispatchFailed,
      })),
    });
  }

  private patch(partial: Partial<DriverSnapshot>): void {
    let changed = false;

    for (const key of Object.keys(partial) as (keyof DriverSnapshot)[]) {
      if (!shallowEqual(this.snapshot[key], partial[key])) {
        changed = true;
        break;
      }
    }

    if (!changed) return;

    this.snapshot = { ...this.snapshot, ...partial };
    for (const listener of this.listeners) listener();
  }

  private nextSeq(): number {
    this.seq += 1;
    try {
      window.localStorage.setItem(SEQ_KEY, String(this.seq));
    } catch {
      /* contador é diagnóstico, não pode impedir a captura */
    }
    return this.seq;
  }
}

/** Backoff exponencial com jitter. */
function backoffMs(failures: number, hasAlerts: boolean): number {
  const ceiling = hasAlerts ? ALERT_BACKOFF_CEILING_MS : PING_BACKOFF_CEILING_MS;
  const base = Math.min(ceiling, 1000 * Math.pow(2, Math.min(failures, 10)));
  // Jitter evita que doze celulares que perderam sinal no mesmo túnel voltem
  // todos no mesmo milissegundo e derrubem o servidor justamente quando ele
  // precisa aceitar o acúmulo de todos eles.
  return Math.round(base * (0.7 + Math.random() * 0.6));
}

function navigatorOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => shallowEqual(v, b[i]));
  }
  if (typeof a === "object" && typeof b === "object" && a && b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

function readSeq(): number {
  try {
    const raw = window.localStorage.getItem(SEQ_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * UUID v4. `crypto.randomUUID` só existe em contexto seguro; o app inteiro
 * exige HTTPS por causa da geolocalização, mas em http://IP-da-rede-local
 * (teste de campo) a função some e não pode levar o app junto.
 */
export function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }

  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

interface BatteryManagerLike {
  level: number;
}

async function readBattery(): Promise<number | null> {
  try {
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<BatteryManagerLike>;
    };
    if (!nav.getBattery) return null;
    const battery = await nav.getBattery();
    return Math.round(battery.level * 100);
  } catch {
    return null;
  }
}
