"use client";

/**
 * Persistência local do app do motorista.
 *
 * Duas camadas com propósitos diferentes:
 *
 *  - `localStorage` guarda a SESSÃO. Precisa ser lida de forma SÍNCRONA no
 *    primeiro render: o celular recarrega sozinho (memória baixa, o motorista
 *    trocou de app, a tela girou) e um instante mostrando "digite o código"
 *    para quem já está vinculado é o tipo de coisa que faz o motorista
 *    reinserir código no meio de uma descida.
 *
 *  - IndexedDB guarda VOLUME: a fila de saída e a geometria do percurso.
 *    Assíncrono, mas com espaço de verdade — o traçado de uma prova de 90 km
 *    simplificado ainda tem milhares de pontos.
 *
 * Nada aqui pode lançar. Navegador em modo privado, cota estourada, IndexedDB
 * bloqueado por política do sistema: em todos esses casos o app tem que
 * continuar funcionando com o que der, e DIZER que a persistência caiu — um
 * motorista que acha que a fila está segura e não está é pior que um motorista
 * avisado.
 */

import {
  createStore,
  delMany as idbDelMany,
  get as idbGet,
  getMany as idbGetMany,
  keys as idbKeys,
  set as idbSet,
  type UseStore,
} from "idb-keyval";

import { createMemoryStore, type QueueStore } from "@/lib/driver/queue";
import type { CachedRoute, DriverRace } from "@/lib/driver/protocol";
import type { PositionRole } from "@/lib/types";

const SESSION_KEY = "race-logistic.driver.session.v1";

export interface StoredSession {
  token: string;
  position: {
    id: string;
    label: string;
    role: PositionRole;
    ordinal: number;
    isReferenceLead: boolean;
    isReferenceSweep: boolean;
  };
  race: DriverRace;
  boundAtMs: number;
}

export function loadSession(): StoredSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.token || !parsed?.position?.id) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession): void {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Sem localStorage o app continua funcionando nesta sessão; só não
    // sobrevive a um recarregamento. A UI já mostra o estado do vínculo.
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* nada a fazer */
  }
}

// ---------------------------------------------------------------------------
// IndexedDB
// ---------------------------------------------------------------------------

let outboxStore: UseStore | null = null;
let idbFailed = false;

function idb(): UseStore | null {
  if (idbFailed) return null;
  if (outboxStore) return outboxStore;

  try {
    if (typeof indexedDB === "undefined") {
      idbFailed = true;
      return null;
    }
    outboxStore = createStore("race-logistic", "driver-outbox");
    return outboxStore;
  } catch {
    idbFailed = true;
    return null;
  }
}

export interface QueueStoreResult {
  store: QueueStore;
  /** `false` quando a fila está só em memória e some se o app fechar. */
  durable: boolean;
}

export function createQueueStore(): QueueStoreResult {
  const store = idb();
  if (!store) return { store: createMemoryStore(), durable: false };

  const wrapped: QueueStore = {
    async get<T>(key: string) {
      return (await idbGet(key, store)) as T | undefined;
    },
    async set(key, value) {
      await idbSet(key, value, store);
    },
    async delMany(keysToDelete) {
      await idbDelMany(keysToDelete, store);
    },
    async keys() {
      return (await idbKeys(store)).map(String);
    },
    async getMany<T>(wanted: string[]) {
      return (await idbGetMany(wanted, store)) as (T | undefined)[];
    },
  };

  return { store: wrapped, durable: true };
}

const ROUTE_KEY = "meta:route";

/** O percurso é gravado no vínculo para o mapa funcionar sem rede depois. */
export async function saveRoute(route: CachedRoute | null): Promise<void> {
  const store = idb();
  if (!store) return;

  try {
    await idbSet(ROUTE_KEY, route, store);
  } catch {
    /* percurso é conforto visual; a operação não depende dele */
  }
}

export async function loadRoute(): Promise<CachedRoute | null> {
  const store = idb();
  if (!store) return null;

  try {
    return ((await idbGet(ROUTE_KEY, store)) as CachedRoute | undefined) ?? null;
  } catch {
    return null;
  }
}

const ACK_KEY = "meta:alert-acks";

export interface LocalAlertAck {
  clientAlertId: string;
  alertId: string;
  receivedAtMs: number;
}

/**
 * Confirmações de alerta recebidas do servidor.
 *
 * Guardadas localmente para a UI conseguir dizer "recebido pela direção" mesmo
 * antes do próximo `/state` chegar — e, principalmente, depois do app ser
 * fechado e reaberto sem rede.
 */
export async function recordAlertAck(ack: LocalAlertAck): Promise<void> {
  const store = idb();
  if (!store) return;

  try {
    const current = ((await idbGet(ACK_KEY, store)) as LocalAlertAck[] | undefined) ?? [];
    const next = [...current.filter((a) => a.clientAlertId !== ack.clientAlertId), ack];
    await idbSet(ACK_KEY, next.slice(-50), store);
  } catch {
    /* a confirmação autoritativa continua vindo de /state */
  }
}

export async function loadAlertAcks(): Promise<LocalAlertAck[]> {
  const store = idb();
  if (!store) return [];

  try {
    return ((await idbGet(ACK_KEY, store)) as LocalAlertAck[] | undefined) ?? [];
  } catch {
    return [];
  }
}
