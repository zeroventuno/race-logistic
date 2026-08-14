import { describe, expect, it } from "vitest";

import {
  alertHasNobodyGoing,
  alertNeedsAttention,
  dispatchStage,
  groupVehicles,
  panelHealth,
  POLL_DEAD_MS,
  POLL_STALE_MS,
  sortAlerts,
  vehicleClockSuspect,
  vehicleSignal,
  type ConnectionState,
  type LiveAlertView,
  type LiveVehicleView,
} from "@/components/live/protocol";

const AGORA = 1_700_000_000_000;

function veiculo(over: Partial<LiveVehicleView> = {}): LiveVehicleView {
  return {
    positionId: over.positionId ?? "p1",
    label: over.label ?? "Moto 1",
    role: over.role ?? "moto",
    ordinal: over.ordinal ?? 1,
    isReferenceLead: over.isReferenceLead ?? false,
    isReferenceSweep: over.isReferenceSweep ?? false,
    isDispatchable: over.isDispatchable ?? true,
    driverName: over.driverName ?? null,
    driverPhone: null,
    vehiclePlate: null,
    bound: over.bound ?? true,
    lat: over.lat ?? 44.9,
    lng: over.lng ?? 7.6,
    // `??` seria errado aqui: `receivedAt: null` é o caso do veículo que nunca
    // transmitiu, e ele precisa sobreviver ao valor padrão.
    recordedAt:
      over.recordedAt !== undefined ? over.recordedAt : new Date(AGORA).toISOString(),
    receivedAt:
      over.receivedAt !== undefined ? over.receivedAt : new Date(AGORA).toISOString(),
    routeOffsetM: over.routeOffsetM !== undefined ? over.routeOffsetM : 1_000,
    lap: over.lap ?? 0,
    absoluteOffsetM:
      over.absoluteOffsetM !== undefined
        ? over.absoluteOffsetM
        : (over.routeOffsetM ?? 1_000),
    lapKnown: over.lapKnown ?? true,
    offRoute: over.offRoute ?? false,
    snapDistanceM: null,
    speedMps: null,
    rollingSpeedMps: null,
    batteryPct: null,
    headingDeg: null,
    totalPings: 10,
    clockSkewSeconds: over.clockSkewSeconds ?? 0,
  };
}

function idadeSegundos(s: number): string {
  return new Date(AGORA - s * 1000).toISOString();
}

function alerta(over: Partial<LiveAlertView> = {}): LiveAlertView {
  return {
    alertId: over.alertId ?? "a1",
    clientAlertId: "c1",
    category: over.category ?? "other",
    priority: over.priority ?? "high",
    status: over.status ?? "open",
    note: over.note ?? null,
    createdAt: over.createdAt ?? new Date(AGORA).toISOString(),
    receivedAt: over.receivedAt ?? new Date(AGORA).toISOString(),
    acknowledgedAt: over.acknowledgedAt ?? null,
    acknowledgedBy: over.acknowledgedBy ?? null,
    resolvedAt: over.resolvedAt ?? null,
    resolutionNote: null,
    lat: null,
    lng: null,
    routeOffsetM: over.routeOffsetM ?? null,
    raisedBy: over.raisedBy ?? null,
    dispatch: over.dispatch ?? null,
    suggestions: over.suggestions ?? [],
    confirmations: { stillThere: 0, cleared: 0, notFound: 0 },
  };
}

// ---------------------------------------------------------------------------

describe("saúde do sinal de um veículo", () => {
  it("mede a idade pelo relógio do SERVIDOR, não pelo do aparelho", () => {
    // Celular 14 minutos adiantado que parou de transmitir há 4 minutos.
    // Pelo `recorded_at` ele pareceria fresquíssimo; pelo `received_at`, que é
    // o que a função usa, ele está perdido.
    const v = veiculo({
      recordedAt: new Date(AGORA + 10 * 60_000).toISOString(),
      receivedAt: idadeSegundos(240),
      clockSkewSeconds: 14 * 60,
    });

    expect(vehicleSignal(v, AGORA)).toBe("lost");
    expect(vehicleClockSuspect(v)).toBe(true);
  });

  it("classifica pelos limiares operacionais do sistema", () => {
    expect(vehicleSignal(veiculo({ receivedAt: idadeSegundos(5) }), AGORA)).toBe("live");
    expect(vehicleSignal(veiculo({ receivedAt: idadeSegundos(20) }), AGORA)).toBe(
      "delayed",
    );
    expect(vehicleSignal(veiculo({ receivedAt: idadeSegundos(60) }), AGORA)).toBe(
      "stale",
    );
    expect(vehicleSignal(veiculo({ receivedAt: idadeSegundos(200) }), AGORA)).toBe(
      "lost",
    );
  });

  it("veículo que nunca transmitiu não é 'ao vivo'", () => {
    expect(
      vehicleSignal(veiculo({ bound: false, receivedAt: null }), AGORA),
    ).toBe("never");
  });
});

describe("agrupamento da lista de veículos", () => {
  const ativo = veiculo({ positionId: "vivo", ordinal: 9, absoluteOffsetM: 5_000 });
  const perdido = veiculo({
    positionId: "perdido",
    ordinal: 1,
    receivedAt: idadeSegundos(400),
    absoluteOffsetM: 40_000,
  });
  const nuncaVinculado = veiculo({
    positionId: "novo",
    ordinal: 2,
    bound: false,
    receivedAt: null,
    absoluteOffsetM: null,
  });

  it("sem sinal sai do meio da lista e vira grupo próprio", () => {
    const g = groupVehicles([ativo, perdido, nuncaVinculado], "prova", AGORA);

    expect(g.semSinal.map((v) => v.positionId)).toEqual(["perdido", "novo"]);
    expect(g.emOperacao.map((v) => v.positionId)).toEqual(["vivo"]);
  });

  it("o grupo sem sinal continua separado mesmo na ordem por cadastro", () => {
    const g = groupVehicles([ativo, perdido], "ordinal", AGORA);
    expect(g.semSinal).toHaveLength(1);
    expect(g.emOperacao.map((v) => v.positionId)).toEqual(["vivo"]);
  });

  it("na ordem de prova, quem está mais adiante vem primeiro", () => {
    const a = veiculo({ positionId: "a", absoluteOffsetM: 1_000, ordinal: 1 });
    const b = veiculo({ positionId: "b", absoluteOffsetM: 30_000, ordinal: 2 });
    const c = veiculo({ positionId: "c", absoluteOffsetM: 15_000, ordinal: 3 });

    const g = groupVehicles([a, b, c], "prova", AGORA);
    expect(g.emOperacao.map((v) => v.positionId)).toEqual(["b", "c", "a"]);
  });

  it("quem não tem posição na rota cai para o fim, não para a liderança", () => {
    const semRota = veiculo({
      positionId: "sem-rota",
      absoluteOffsetM: null,
      ordinal: 1,
    });
    const comRota = veiculo({ positionId: "com-rota", absoluteOffsetM: 100, ordinal: 2 });

    const g = groupVehicles([semRota, comRota], "prova", AGORA);
    expect(g.emOperacao.map((v) => v.positionId)).toEqual(["com-rota", "sem-rota"]);
  });

  it("no grupo sem sinal, o mais antigo primeiro e o nunca vinculado por último", () => {
    const recente = veiculo({ positionId: "r", receivedAt: idadeSegundos(200) });
    const antigo = veiculo({ positionId: "a", receivedAt: idadeSegundos(900) });

    const g = groupVehicles([recente, nuncaVinculado, antigo], "prova", AGORA);
    expect(g.semSinal.map((v) => v.positionId)).toEqual(["a", "r", "novo"]);
  });
});

describe("alerta que ainda precisa de atenção humana", () => {
  it("acionamento automático NÃO conta como reconhecimento", () => {
    // O gatilho do banco preenche `acknowledged_at` sozinho quando o status sai
    // de `open`. Se o painel olhasse a data, o pulso vermelho de um acidente
    // que ninguém viu se apagaria sozinho.
    const auto = alerta({
      status: "dispatched",
      acknowledgedAt: new Date(AGORA).toISOString(),
      acknowledgedBy: null,
      dispatch: {
        positionId: "amb",
        label: "Ambulância 1",
        role: "ambulance",
        mode: "auto",
        reason: "1,2 km atrás",
        dispatchedAt: new Date(AGORA).toISOString(),
        acknowledgedAt: null,
        declinedAt: null,
        declineReason: null,
        onSceneAt: null,
      },
    });

    expect(alertNeedsAttention(auto)).toBe(true);
  });

  it("reconhecimento de um humano apaga o alarme", () => {
    expect(
      alertNeedsAttention(
        alerta({ status: "acknowledged", acknowledgedBy: "uuid-do-diretor" }),
      ),
    ).toBe(false);
  });

  it("alerta encerrado não pede mais nada", () => {
    expect(alertNeedsAttention(alerta({ status: "resolved" }))).toBe(false);
    expect(alertNeedsAttention(alerta({ status: "cancelled" }))).toBe(false);
  });
});

describe("alerta sem ninguém a caminho", () => {
  it("sem acionamento nenhum", () => {
    expect(alertHasNobodyGoing(alerta())).toBe(true);
  });

  it("acionado e a caminho", () => {
    const a = alerta({
      status: "dispatched",
      dispatch: {
        positionId: "m1",
        label: "Mecânico 1",
        role: "mechanic",
        mode: "auto",
        reason: null,
        dispatchedAt: new Date(AGORA).toISOString(),
        acknowledgedAt: new Date(AGORA).toISOString(),
        declinedAt: null,
        declineReason: null,
        onSceneAt: null,
      },
    });

    expect(alertHasNobodyGoing(a)).toBe(false);
    expect(dispatchStage(a)).toBe("en_route");
  });

  it("acionado que recusou volta a ser 'ninguém indo'", () => {
    const a = alerta({
      status: "dispatched",
      dispatch: {
        positionId: "m1",
        label: "Mecânico 1",
        role: "mechanic",
        mode: "auto",
        reason: null,
        dispatchedAt: new Date(AGORA).toISOString(),
        acknowledgedAt: null,
        declinedAt: new Date(AGORA).toISOString(),
        declineReason: "estou preso no trânsito",
        onSceneAt: null,
      },
    });

    expect(alertHasNobodyGoing(a)).toBe(true);
    expect(dispatchStage(a)).toBe("declined");
  });
});

describe("ordem do painel de alertas", () => {
  it("o não reconhecido vem antes do tratado, mesmo sendo mais antigo", () => {
    const antigoSemVer = alerta({
      alertId: "antigo",
      receivedAt: idadeSegundos(600),
      category: "mechanical",
    });
    const novoTratado = alerta({
      alertId: "novo",
      receivedAt: idadeSegundos(5),
      category: "medical",
      status: "acknowledged",
      acknowledgedBy: "diretor",
    });

    expect(sortAlerts([novoTratado, antigoSemVer]).map((a) => a.alertId)).toEqual([
      "antigo",
      "novo",
    ]);
  });

  it("entre dois não reconhecidos, o médico vem primeiro", () => {
    const mecanico = alerta({
      alertId: "mec",
      category: "mechanical",
      receivedAt: idadeSegundos(1),
    });
    const medico = alerta({
      alertId: "med",
      category: "medical",
      receivedAt: idadeSegundos(300),
    });

    expect(sortAlerts([mecanico, medico]).map((a) => a.alertId)).toEqual([
      "med",
      "mec",
    ]);
  });

  it("alerta encerrado desce para o fim", () => {
    const encerrado = alerta({
      alertId: "fim",
      status: "resolved",
      acknowledgedBy: "d",
      receivedAt: idadeSegundos(1),
    });
    const ativo = alerta({
      alertId: "ativo",
      status: "acknowledged",
      acknowledgedBy: "d",
      receivedAt: idadeSegundos(900),
    });

    expect(sortAlerts([encerrado, ativo]).map((a) => a.alertId)).toEqual([
      "ativo",
      "fim",
    ]);
  });

  it("entre reconhecidos, quem está sem ninguém a caminho sobe", () => {
    const comApoio = alerta({
      alertId: "com",
      status: "dispatched",
      acknowledgedBy: "d",
      receivedAt: idadeSegundos(10),
      dispatch: {
        positionId: "m",
        label: "Mecânico",
        role: "mechanic",
        mode: "auto",
        reason: null,
        dispatchedAt: new Date(AGORA).toISOString(),
        acknowledgedAt: null,
        declinedAt: null,
        declineReason: null,
        onSceneAt: null,
      },
    });
    const orfao = alerta({
      alertId: "orfao",
      status: "acknowledged",
      acknowledgedBy: "d",
      receivedAt: idadeSegundos(400),
    });

    expect(sortAlerts([comApoio, orfao]).map((a) => a.alertId)).toEqual([
      "orfao",
      "com",
    ]);
  });
});

describe("saúde do painel", () => {
  const base: ConnectionState = {
    realtime: "connected",
    lastPollOkMs: AGORA,
    consecutivePollFailures: 0,
    lastError: null,
  };

  it("tudo em dia", () => {
    expect(panelHealth(base, AGORA + 2_000)).toBe("ok");
  });

  it("Realtime caído com reconciliação em dia é degradado, não saudável", () => {
    expect(panelHealth({ ...base, realtime: "down" }, AGORA + 2_000)).toBe(
      "degraded",
    );
  });

  it("Realtime dizendo que está bem NÃO salva um polling atrasado", () => {
    // O modo de falha que o painel existe para expor: o WebSocket continua
    // aberto e para de entregar. Se o estado do canal bastasse, a tela ficaria
    // verde e congelada.
    expect(panelHealth(base, AGORA + POLL_STALE_MS + 1_000)).toBe("degraded");
    expect(panelHealth(base, AGORA + POLL_DEAD_MS + 1_000)).toBe("down");
  });

  it("sem nenhuma reconciliação bem-sucedida, o painel está caído", () => {
    expect(panelHealth({ ...base, lastPollOkMs: null }, AGORA)).toBe("down");
  });
});
