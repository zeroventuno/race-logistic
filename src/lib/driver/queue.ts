/**
 * Fila de saída do app do motorista (outbox).
 *
 * O invariante que justifica o módulo inteiro: NADA É ENVIADO ANTES DE SER
 * PERSISTIDO, E NADA SAI DA FILA ANTES DO ACK DO SERVIDOR. Um ping capturado e
 * enviado direto some se o `fetch` falhar; um ping removido da fila no momento
 * do envio some se a resposta se perder no caminho. Os dois casos acontecem
 * todo dia num celular andando de carro entre morros.
 *
 * Prioridade: ALERTA NA FRENTE DE TUDO. As chaves são prefixadas (`a:` alerta,
 * `b:` resposta a acionamento ou confirmação, `p:` ping) e lidas em ordem
 * alfabética, então a fila devolve naturalmente os alertas primeiro, as
 * respostas depois e os pings por último. Quando o sinal volta depois de dois
 * minutos, o alerta de ambulância não espera 40 pings de GPS serem enviados —
 * e o "estou indo" da ambulância não espera os pings dela também.
 *
 * Descarte: pings antigos SIM, alertas NUNCA. Se a fila estourar o limite, os
 * pings mais velhos são jogados fora — perder o rastro de onde o veículo estava
 * há três horas é aceitável. Um alerta descartado é um chamado de socorro que
 * ninguém recebeu, então ele fica na fila para sempre, mesmo que isso signifique
 * uma fila que nunca esvazia.
 */

import type {
  AlertConfirmationKind,
  DispatchResponseAction,
} from "@/lib/driver/protocol";
import type { ClientAlert, ClientPing } from "@/lib/types";

/**
 * Ações que o motorista toma sobre um alerta existente.
 *
 * Passam pela fila pelo mesmo motivo dos alertas: "estou indo" tocado dentro de
 * um túnel precisa chegar quando o sinal voltar. Quem pediu socorro está
 * olhando para uma tela esperando exatamente essa confirmação.
 */
export type QueuedAction =
  | {
      type: "dispatch_response";
      alertId: string;
      action: DispatchResponseAction;
      reason: string | null;
      createdAt: string;
    }
  | {
      type: "confirmation";
      alertId: string;
      clientConfirmationId: string;
      kind: AlertConfirmationKind;
      note: string | null;
      lat: number | null;
      lng: number | null;
      createdAt: string;
    };

export interface QueueStore {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delMany(keys: string[]): Promise<void>;
  keys(): Promise<string[]>;
  getMany<T>(keys: string[]): Promise<(T | undefined)[]>;
}

export type OutboxKind = "ping" | "alert" | "action";

export interface OutboxRecord<T = ClientPing | ClientAlert | QueuedAction> {
  key: string;
  kind: OutboxKind;
  payload: T;
  enqueuedAtMs: number;
  attempts: number;
  lastError: string | null;
}

export interface QueueCounts {
  pings: number;
  alerts: number;
  actions: number;
}

/**
 * Teto da fila de pings. ~6 h de captura a um ping a cada 4 s. Acima disso o
 * aparelho está guardando história antiga em vez de posição útil.
 */
export const MAX_QUEUED_PINGS = 6000;

const SEQ_KEY = "meta:seq";
const PING_PREFIX = "p:";
const ALERT_PREFIX = "a:";
const ACTION_PREFIX = "b:";

export class OutboxQueue {
  private readonly store: QueueStore;
  /**
   * Serializa todas as mutações. Sem isto, dois `enqueue` simultâneos (um ping
   * do `watchPosition` e um alerta do toque do motorista) leriam o mesmo
   * contador e gravariam na mesma chave — o segundo apagaria o primeiro.
   */
  private chain: Promise<unknown> = Promise.resolve();
  private seq = 0;
  private initialized = false;
  /**
   * Contagem de pings em memória.
   *
   * Existe para o corte de excedente não precisar varrer todas as chaves a cada
   * ponto capturado. Com a fila cheia isso seria uma varredura de 6 000 chaves
   * a cada 4 segundos, durante 6 horas, no celular do motorista — bateria
   * queimada para descobrir o que já sabíamos.
   */
  private pingCount = 0;

  constructor(store: QueueStore) {
    this.store = store;
  }

  private async ensureInit(): Promise<void> {
    if (this.initialized) return;

    const stored = await this.store.get<number>(SEQ_KEY);
    const keys = await this.store.keys();

    let maxKeySeq = 0;
    let pings = 0;
    for (const key of keys) {
      const parsed = parseSeq(key);
      if (parsed > maxKeySeq) maxKeySeq = parsed;
      if (key.startsWith(PING_PREFIX)) pings++;
    }
    this.pingCount = pings;

    // O contador em disco pode estar atrás das chaves se o app morreu entre
    // gravar o item e gravar o contador. Ficar com o maior dos dois evita
    // reaproveitar uma chave e sobrescrever um item ainda não enviado.
    this.seq = Math.max(stored ?? 0, maxKeySeq);
    this.initialized = true;
  }

  private run<T>(task: () => Promise<T>): Promise<T> {
    const next = this.chain.then(async () => {
      await this.ensureInit();
      return task();
    });
    // A cadeia não pode morrer por causa de uma falha: se ela virar uma
    // promessa rejeitada, toda operação futura da fila falha junto.
    this.chain = next.catch(() => undefined);
    return next;
  }

  enqueuePing(ping: ClientPing): Promise<void> {
    return this.run(async () => {
      const key = `${PING_PREFIX}${pad(++this.seq)}`;
      await this.store.set(key, record("ping", ping));
      this.pingCount++;
      await this.store.set(SEQ_KEY, this.seq);
      if (this.pingCount > MAX_QUEUED_PINGS) await this.trimPings();
    });
  }

  enqueueAlert(alert: ClientAlert): Promise<string> {
    return this.run(async () => {
      const key = `${ALERT_PREFIX}${pad(++this.seq)}`;
      await this.store.set(key, record("alert", alert));
      await this.store.set(SEQ_KEY, this.seq);
      return key;
    });
  }

  enqueueAction(action: QueuedAction): Promise<string> {
    return this.run(async () => {
      const key = `${ACTION_PREFIX}${pad(++this.seq)}`;
      await this.store.set(key, record("action", action));
      await this.store.set(SEQ_KEY, this.seq);
      return key;
    });
  }

  /** Próximos itens a enviar, na ordem de prioridade da fila. */
  peek(limit = 100): Promise<{
    alerts: OutboxRecord<ClientAlert>[];
    actions: OutboxRecord<QueuedAction>[];
    pings: OutboxRecord<ClientPing>[];
  }> {
    return this.run(async () => {
      const keys = (await this.store.keys()).filter(isItemKey).sort();

      const alertKeys = keys.filter((k) => k.startsWith(ALERT_PREFIX));
      const actionKeys = keys.filter((k) => k.startsWith(ACTION_PREFIX));
      const pingKeys = keys.filter((k) => k.startsWith(PING_PREFIX)).slice(0, limit);

      const [alertValues, actionValues, pingValues] = await Promise.all([
        this.store.getMany<OutboxRecord<ClientAlert>>(alertKeys),
        this.store.getMany<OutboxRecord<QueuedAction>>(actionKeys),
        this.store.getMany<OutboxRecord<ClientPing>>(pingKeys),
      ]);

      return {
        alerts: attach(alertKeys, alertValues),
        actions: attach(actionKeys, actionValues),
        pings: attach(pingKeys, pingValues),
      };
    });
  }

  /** Remove itens confirmados pelo servidor. Único caminho de saída da fila. */
  ack(keys: string[]): Promise<void> {
    return this.run(async () => {
      if (keys.length === 0) return;
      await this.store.delMany(keys);
      this.pingCount -= keys.filter((k) => k.startsWith(PING_PREFIX)).length;
    });
  }

  /**
   * Descarta pings que o SERVIDOR rejeitou explicitamente (coordenada
   * inválida, relógio absurdo). Sem isto o app reenviaria o mesmo lixo para
   * sempre, e a fila nunca esvaziaria.
   */
  dropPingsByClientId(clientPingIds: string[]): Promise<number> {
    return this.run(async () => {
      if (clientPingIds.length === 0) return 0;

      const wanted = new Set(clientPingIds);
      const keys = (await this.store.keys()).filter((k) => k.startsWith(PING_PREFIX));
      const values = await this.store.getMany<OutboxRecord<ClientPing>>(keys);

      const doomed: string[] = [];
      keys.forEach((key, i) => {
        const value = values[i];
        if (value && wanted.has(value.payload.clientPingId)) doomed.push(key);
      });

      if (doomed.length > 0) await this.store.delMany(doomed);
      this.pingCount -= doomed.length;
      return doomed.length;
    });
  }

  /** Registra uma tentativa falha. Só alertas guardam isso — a UI os mostra. */
  markAttempt(key: string, error: string): Promise<void> {
    return this.run(async () => {
      const current = await this.store.get<OutboxRecord>(key);
      if (!current) return;
      await this.store.set(key, {
        ...current,
        attempts: (current.attempts ?? 0) + 1,
        lastError: error.slice(0, 300),
      });
    });
  }

  /**
   * Descarta TODOS os pings, preservando alertas.
   *
   * Chamado quando o aparelho é vinculado a uma POSIÇÃO DIFERENTE: os pings da
   * fila descrevem o trajeto do veículo anterior, e enviá-los sob o novo
   * vínculo colocaria o veículo novo no rastro do antigo. Alertas sobrevivem —
   * um chamado de socorro continua válido independente de qual carro o
   * aparelho representa agora.
   */
  clearPings(): Promise<number> {
    return this.run(async () => {
      const keys = (await this.store.keys()).filter((k) => k.startsWith(PING_PREFIX));
      if (keys.length > 0) await this.store.delMany(keys);
      this.pingCount = 0;
      return keys.length;
    });
  }

  counts(): Promise<QueueCounts> {
    return this.run(async () => {
      const keys = await this.store.keys();
      return {
        pings: keys.filter((k) => k.startsWith(PING_PREFIX)).length,
        alerts: keys.filter((k) => k.startsWith(ALERT_PREFIX)).length,
        actions: keys.filter((k) => k.startsWith(ACTION_PREFIX)).length,
      };
    });
  }

  /** Alertas ainda não confirmados pelo servidor — para a UI ser honesta. */
  pendingAlerts(): Promise<OutboxRecord<ClientAlert>[]> {
    return this.run(async () => {
      const keys = (await this.store.keys()).filter((k) => k.startsWith(ALERT_PREFIX)).sort();
      const values = await this.store.getMany<OutboxRecord<ClientAlert>>(keys);
      return attach(keys, values);
    });
  }

  private async trimPings(): Promise<void> {
    const keys = (await this.store.keys()).filter((k) => k.startsWith(PING_PREFIX));
    if (keys.length <= MAX_QUEUED_PINGS) return;

    // Ordem alfabética = ordem de captura, então os primeiros são os mais
    // antigos. Descartar do começo preserva o trecho recente do trajeto, que é
    // o que ainda tem valor operacional.
    const doomed = keys.sort().slice(0, keys.length - MAX_QUEUED_PINGS);
    await this.store.delMany(doomed);
    this.pingCount = keys.length - doomed.length;
  }
}

function record(
  kind: OutboxKind,
  payload: ClientPing | ClientAlert | QueuedAction,
): OutboxRecord {
  return {
    key: "",
    kind,
    payload,
    enqueuedAtMs: Date.now(),
    attempts: 0,
    lastError: null,
  };
}

function attach<T>(keys: string[], values: (OutboxRecord<T> | undefined)[]): OutboxRecord<T>[] {
  const out: OutboxRecord<T>[] = [];
  keys.forEach((key, i) => {
    const value = values[i];
    if (value) out.push({ ...value, key });
  });
  return out;
}

function isItemKey(key: string): boolean {
  return (
    key.startsWith(PING_PREFIX) ||
    key.startsWith(ALERT_PREFIX) ||
    key.startsWith(ACTION_PREFIX)
  );
}

/** 16 dígitos: a ordenação alfabética das chaves tem que ser a numérica. */
function pad(n: number): string {
  return String(n).padStart(16, "0");
}

function parseSeq(key: string): number {
  if (!isItemKey(key)) return 0;
  const n = Number(key.slice(2));
  return Number.isFinite(n) ? n : 0;
}

/** Implementação em memória — usada nos testes e como último recurso. */
export function createMemoryStore(): QueueStore {
  const map = new Map<string, unknown>();

  return {
    async get<T>(key: string) {
      return map.get(key) as T | undefined;
    },
    async set(key, value) {
      map.set(key, value);
    },
    async delMany(keys) {
      for (const k of keys) map.delete(k);
    },
    async keys() {
      return [...map.keys()];
    },
    async getMany<T>(keys: string[]) {
      return keys.map((k) => map.get(k) as T | undefined);
    },
  };
}
