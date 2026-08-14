import { describe, expect, it } from "vitest";

import {
  createMemoryStore,
  MAX_QUEUED_PINGS,
  OutboxQueue,
  type QueueStore,
} from "@/lib/driver/queue";
import type { ClientAlert, ClientPing } from "@/lib/types";

/**
 * Testes da fila offline.
 *
 * O cenário que manda em tudo: DOIS MINUTOS SEM SINAL. O aparelho continua
 * capturando, a fila continua crescendo, e quando o sinal volta tudo precisa
 * subir completo, em ordem, sem duplicar e sem furar o histórico.
 *
 * A fila é testada contra um armazenamento em memória com a mesma interface do
 * IndexedDB. Não é um atalho: é o que permite testar o comportamento da fila —
 * que é onde estão as decisões — sem depender de um `fake-indexeddb` que testa
 * a implementação do navegador.
 */

function ping(seq: number, atMs: number): ClientPing {
  return {
    clientPingId: uuidFor(seq),
    clientSeq: seq,
    lat: 44.9 + seq * 0.0001,
    lng: 7.6,
    accuracyM: 8,
    altitudeM: 300,
    speedMps: 11,
    headingDeg: 90,
    recordedAt: new Date(atMs).toISOString(),
    batteryPct: 80,
    queuedOffline: true,
  };
}

function alert(id: string): ClientAlert {
  return {
    clientAlertId: id,
    category: "medical",
    note: null,
    lat: 44.9,
    lng: 7.6,
    accuracyM: 10,
    createdAt: new Date().toISOString(),
  };
}

function uuidFor(n: number): string {
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex}`;
}

const T0 = Date.UTC(2025, 5, 1, 9, 0, 0);

describe("OutboxQueue", () => {
  it("preserva 2 minutos de captura offline, completos e em ordem", async () => {
    const queue = new OutboxQueue(createMemoryStore());

    // 4 s entre pontos durante 120 s = 30 pontos.
    const total = 30;
    for (let i = 0; i < total; i++) {
      await queue.enqueuePing(ping(i + 1, T0 + i * 4000));
    }

    const counts = await queue.counts();
    expect(counts.pings).toBe(total);

    const { pings } = await queue.peek(100);
    expect(pings).toHaveLength(total);

    const seqs = pings.map((p) => p.payload.clientSeq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(seqs[0]).toBe(1);
    expect(seqs[seqs.length - 1]).toBe(total);

    // Nada sai antes do ack.
    expect((await queue.counts()).pings).toBe(total);

    await queue.ack(pings.map((p) => p.key));
    expect((await queue.counts()).pings).toBe(0);
  });

  it("entrega alertas antes de pings, e ações antes de pings", async () => {
    const queue = new OutboxQueue(createMemoryStore());

    for (let i = 0; i < 20; i++) await queue.enqueuePing(ping(i + 1, T0 + i * 4000));

    await queue.enqueueAlert(alert("11111111-1111-4111-8111-111111111111"));
    await queue.enqueueAction({
      type: "dispatch_response",
      alertId: "abc",
      action: "on_my_way",
      reason: null,
      createdAt: new Date(T0).toISOString(),
    });

    const { alerts, actions, pings } = await queue.peek(100);

    expect(alerts).toHaveLength(1);
    expect(actions).toHaveLength(1);
    expect(pings).toHaveLength(20);
  });

  it("nunca descarta alerta, mesmo com a fila de pings estourada", async () => {
    const queue = new OutboxQueue(createMemoryStore());

    await queue.enqueueAlert(alert("22222222-2222-4222-8222-222222222222"));

    // Estoura o limite com folga.
    for (let i = 0; i < MAX_QUEUED_PINGS + 50; i++) {
      await queue.enqueuePing(ping(i + 1, T0 + i * 1000));
    }

    const counts = await queue.counts();
    expect(counts.pings).toBe(MAX_QUEUED_PINGS);
    expect(counts.alerts).toBe(1);

    // O que sobrou é a PONTA RECENTE do trajeto, não o começo.
    const { pings } = await queue.peek(5);
    expect(pings[0]?.payload.clientSeq).toBe(51);
  });

  it("remove só os pings que o servidor rejeitou nominalmente", async () => {
    const queue = new OutboxQueue(createMemoryStore());

    for (let i = 0; i < 5; i++) await queue.enqueuePing(ping(i + 1, T0 + i * 4000));

    const removed = await queue.dropPingsByClientId([uuidFor(2), uuidFor(4)]);
    expect(removed).toBe(2);

    const { pings } = await queue.peek(10);
    expect(pings.map((p) => p.payload.clientSeq)).toEqual([1, 3, 5]);
  });

  it("descarta pings ao trocar de posição, mas mantém os alertas", async () => {
    const queue = new OutboxQueue(createMemoryStore());

    await queue.enqueuePing(ping(1, T0));
    await queue.enqueuePing(ping(2, T0 + 4000));
    await queue.enqueueAlert(alert("33333333-3333-4333-8333-333333333333"));

    const dropped = await queue.clearPings();
    expect(dropped).toBe(2);

    const counts = await queue.counts();
    expect(counts.pings).toBe(0);
    expect(counts.alerts).toBe(1);
  });

  it("não perde itens quando enfileiramentos acontecem em paralelo", async () => {
    const queue = new OutboxQueue(createMemoryStore());

    // O caso real: o `watchPosition` dispara enquanto o motorista toca no botão
    // de alerta. Sem serialização, os dois leem o mesmo contador e um sobrescreve
    // a chave do outro.
    await Promise.all([
      queue.enqueuePing(ping(1, T0)),
      queue.enqueueAlert(alert("44444444-4444-4444-8444-444444444444")),
      queue.enqueuePing(ping(2, T0 + 1000)),
      queue.enqueueAlert(alert("55555555-5555-4555-8555-555555555555")),
      queue.enqueuePing(ping(3, T0 + 2000)),
    ]);

    const counts = await queue.counts();
    expect(counts.pings).toBe(3);
    expect(counts.alerts).toBe(2);
  });

  it("retoma a numeração depois de um recarregamento do app", async () => {
    const store = createMemoryStore();

    const first = new OutboxQueue(store);
    await first.enqueuePing(ping(1, T0));
    await first.enqueuePing(ping(2, T0 + 4000));

    // O app foi morto e reabriu: instância nova, mesmo armazenamento.
    const second = new OutboxQueue(store);
    await second.enqueuePing(ping(3, T0 + 8000));

    const { pings } = await second.peek(10);
    expect(pings.map((p) => p.payload.clientSeq)).toEqual([1, 2, 3]);
  });

  it("sobrevive a um armazenamento que falha em uma escrita", async () => {
    const base = createMemoryStore();
    let failNext = false;

    const flaky: QueueStore = {
      ...base,
      async set(key, value) {
        if (failNext) {
          failNext = false;
          throw new Error("cota estourada");
        }
        return base.set(key, value);
      },
    };

    const queue = new OutboxQueue(flaky);
    await queue.enqueuePing(ping(1, T0));

    failNext = true;
    await expect(queue.enqueuePing(ping(2, T0 + 4000))).rejects.toThrow("cota");

    // A fila continua utilizável depois da falha — sem isso, uma única escrita
    // recusada mataria a captura pelo resto da prova.
    await queue.enqueuePing(ping(3, T0 + 8000));

    const counts = await queue.counts();
    expect(counts.pings).toBe(2);
  });

  it("mantém o alerta na fila e conta as tentativas falhas", async () => {
    const queue = new OutboxQueue(createMemoryStore());
    const key = await queue.enqueueAlert(alert("66666666-6666-4666-8666-666666666666"));

    await queue.markAttempt(key, "Sem conexão com o servidor.");
    await queue.markAttempt(key, "Sem conexão com o servidor.");

    const pending = await queue.pendingAlerts();
    expect(pending).toHaveLength(1);
    expect(pending[0]?.attempts).toBe(2);
    expect(pending[0]?.lastError).toContain("Sem conexão");
  });
});
