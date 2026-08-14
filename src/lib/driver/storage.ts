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
import type { AlertCategory, PositionRole } from "@/lib/types";

const SESSION_KEY = "flamme-rouge.driver.session.v1";

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
    outboxStore = createStore("flamme-rouge", "driver-outbox");
    return outboxStore;
  } catch {
    idbFailed = true;
    return null;
  }
}

export interface QueueStoreResult {
  store: QueueStore;
  /**
   * `false` quando a fila está só em memória e some se o app fechar.
   *
   * Só é confiável DEPOIS de `probe()` resolver: `createStore` do idb-keyval é
   * preguiçoso e não abre o banco até a primeira operação. Declarar durável
   * antes disso é a mentira que fazia o alerta sumir sem rastro.
   */
  durable: boolean;
  /** Confirma que o armazenamento aceita escrita de verdade. */
  probe: () => Promise<boolean>;
}

/**
 * Armazenamento resiliente da fila.
 *
 * O modo de falha que este envelope existe para eliminar: IndexedDB recusa a
 * escrita (modo privado, cota estourada, política do sistema), a promessa
 * rejeita, e o alerta que o motorista acabou de disparar NUNCA EXISTIU — sem
 * erro na tela, sem linha na lista, sem nada.
 *
 * Aqui, a primeira falha de qualquer operação degrada o armazenamento inteiro
 * para memória e avisa quem estiver ouvindo. Perder a fila num fechamento de
 * app é ruim; perder um chamado de socorro em silêncio é inaceitável. A
 * degradação é PERMANENTE de propósito: um IndexedDB que falhou uma vez vai
 * falhar de novo, e alternar entre os dois espalharia a fila em dois lugares.
 */
export function createQueueStore(
  onDegraded?: (reason: string) => void,
): QueueStoreResult {
  const native = idb();
  const memory = createMemoryStore();

  let degraded = native === null;

  const degrade = (reason: string) => {
    if (degraded) return;
    degraded = true;
    console.warn("[driver] armazenamento local degradado para memória:", reason);
    onDegraded?.(reason);
  };

  if (!native) {
    return {
      store: memory,
      durable: false,
      probe: async () => false,
    };
  }

  async function guard<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>,
  ): Promise<T> {
    if (degraded) return fallback();

    try {
      return await operation();
    } catch (error) {
      degrade((error as Error)?.message ?? "erro desconhecido");
      return fallback();
    }
  }

  const store: QueueStore = {
    get: <T,>(key: string) =>
      guard<T | undefined>(
        async () => (await idbGet(key, native!)) as T | undefined,
        () => memory.get<T>(key),
      ),
    set: (key, value) =>
      guard(
        async () => {
          await idbSet(key, value, native!);
        },
        () => memory.set(key, value),
      ),
    delMany: (keysToDelete) =>
      guard(
        async () => {
          await idbDelMany(keysToDelete, native!);
        },
        () => memory.delMany(keysToDelete),
      ),
    keys: () =>
      guard(
        async () => (await idbKeys(native!)).map(String),
        () => memory.keys(),
      ),
    getMany: <T,>(wanted: string[]) =>
      guard<(T | undefined)[]>(
        async () => (await idbGetMany(wanted, native!)) as (T | undefined)[],
        () => memory.getMany<T>(wanted),
      ),
  };

  return {
    store,
    durable: true,
    /**
     * Escreve, lê e apaga uma chave de teste. É a única forma de saber se o
     * IndexedDB funciona: até a primeira operação real, ele é só uma promessa.
     */
    probe: async () => {
      const key = "meta:probe";
      try {
        await idbSet(key, Date.now(), native!);
        const back = await idbGet(key, native!);
        await idbDelMany([key], native!);
        if (back == null) {
          degrade("leitura de verificação voltou vazia");
          return false;
        }
        return !degraded;
      } catch (error) {
        degrade((error as Error)?.message ?? "falha na verificação");
        return false;
      }
    },
  };
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
  category: AlertCategory;
  createdAt: string;
  /** Quem o servidor acionou. `null` = ninguém foi acionado. */
  dispatchLabel: string | null;
  /** O servidor gravou o alerta mas não conseguiu acionar ninguém. */
  dispatchFailed: boolean;
}

/**
 * Confirmações de alerta recebidas do servidor.
 *
 * Guardadas localmente para a UI conseguir dizer "recebido pela direção" mesmo
 * antes do próximo `/state` chegar — e, principalmente, depois do app ser
 * fechado e reaberto sem rede.
 */
/**
 * Espelho em memória das confirmações.
 *
 * O disco é conforto; ESTE é o que garante que a tela não mente dentro da
 * sessão. Sem ele, um IndexedDB indisponível fazia o alerta confirmado sumir da
 * lista assim que saía da fila — o motorista via o alerta desaparecer sem nunca
 * ter visto "recebido".
 */
let ackMirror: LocalAlertAck[] = [];
let ackMirrorLoaded = false;

export async function recordAlertAck(ack: LocalAlertAck): Promise<void> {
  await loadAlertAcks();

  ackMirror = [...ackMirror.filter((a) => a.clientAlertId !== ack.clientAlertId), ack].slice(-50);

  const store = idb();
  if (!store) return;

  try {
    await idbSet(ACK_KEY, ackMirror, store);
  } catch {
    /* o espelho em memória continua valendo para esta sessão */
  }
}

export async function loadAlertAcks(): Promise<LocalAlertAck[]> {
  if (ackMirrorLoaded) return ackMirror;

  const store = idb();
  ackMirrorLoaded = true;

  if (!store) return ackMirror;

  try {
    const stored = ((await idbGet(ACK_KEY, store)) as LocalAlertAck[] | undefined) ?? [];
    // O que já está em memória tem precedência: pode ter sido gravado nesta
    // sessão enquanto a leitura do disco estava em voo.
    const byId = new Map(stored.map((a) => [a.clientAlertId, a]));
    for (const a of ackMirror) byId.set(a.clientAlertId, a);
    ackMirror = [...byId.values()].slice(-50);
  } catch {
    /* segue só com o espelho */
  }

  return ackMirror;
}
