import { describe, expect, it } from "vitest";

import { computeNearestSupport, type NearestCandidate } from "@/lib/alerts/nearest";
import { destinationPoint } from "@/lib/geo/distance";
import { SIGNAL_THRESHOLDS_S, type PositionRole } from "@/lib/types";

/**
 * Testes do acionamento automático.
 *
 * A geometria é construída à mão para que a resposta certa seja verificável sem
 * rodar o código: uma reta leste-oeste onde o offset na rota e a distância em
 * linha reta coincidem, e um caso de "grampo" onde eles discordam por duas
 * ordens de grandeza. É nessa discordância que mora o erro que mataria alguém —
 * mandar a ambulância que está a 80 m em linha reta mas a 8 km pela estrada.
 */

const NOW = Date.UTC(2025, 5, 1, 10, 0, 0);
const ORIGIN = { lat: 44.9, lng: 7.6 };

/** Ponto a `x` metros a leste da origem — a "estrada" dos casos simples. */
function eastOf(x: number) {
  return destinationPoint(ORIGIN, 90, x);
}

function candidate(
  overrides: Partial<NearestCandidate> & { positionId: string; role: PositionRole },
): NearestCandidate {
  const offset = overrides.routeOffsetM ?? 0;
  const point = eastOf(offset);

  return {
    label: overrides.label ?? overrides.positionId,
    isDispatchable: true,
    lat: point.lat,
    lng: point.lng,
    routeOffsetM: offset,
    rollingSpeedMps: 10,
    recordedAtMs: NOW - 5000,
    ...overrides,
  };
}

describe("computeNearestSupport", () => {
  it("manda a ambulância no alerta médico, mesmo com uma moto mais perto", () => {
    const result = computeNearestSupport({
      category: "medical",
      origin: { ...eastOf(5000), routeOffsetM: 5000 },
      candidates: [
        candidate({ positionId: "moto", role: "moto", routeOffsetM: 4800 }),
        candidate({ positionId: "amb", role: "ambulance", routeOffsetM: 3000 }),
      ],
      nowMs: NOW,
    });

    expect(result.suggestions[0]?.positionId).toBe("amb");
    // A moto ainda aparece, como escalonamento explícito.
    expect(result.suggestions[1]?.positionId).toBe("moto");
    expect(result.suggestions[1]?.offSpecialty).toBe(true);
  });

  it("escala para fora da especialidade quando a ambulância está sem sinal", () => {
    const result = computeNearestSupport({
      category: "medical",
      origin: { ...eastOf(5000), routeOffsetM: 5000 },
      candidates: [
        candidate({
          positionId: "amb",
          role: "ambulance",
          routeOffsetM: 4000,
          recordedAtMs: NOW - (SIGNAL_THRESHOLDS_S.lost + 60) * 1000,
        }),
        candidate({ positionId: "moto", role: "moto", routeOffsetM: 1000 }),
      ],
      nowMs: NOW,
    });

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]?.positionId).toBe("moto");
    expect(result.suggestions[0]?.offSpecialty).toBe(true);
    expect(result.note).toContain("ESCALONADO");
  });

  it("prefere quem está atrás: quem já passou precisa retornar", () => {
    const result = computeNearestSupport({
      category: "mechanical",
      origin: { ...eastOf(5000), routeOffsetM: 5000 },
      candidates: [
        // 900 m à frente (já passou pelo ponto do alerta)
        candidate({ positionId: "frente", role: "mechanic", routeOffsetM: 5900 }),
        // 1100 m atrás — mais longe, mas segue o fluxo da prova
        candidate({ positionId: "atras", role: "mechanic", routeOffsetM: 3900 }),
      ],
      nowMs: NOW,
    });

    expect(result.suggestions[0]?.positionId).toBe("atras");
    expect(result.suggestions[0]?.isAhead).toBe(false);
    expect(result.suggestions.find((s) => s.positionId === "frente")?.isAhead).toBe(true);
  });

  it("usa a distância PELA ROTA, não a linha reta, num grampo de montanha", () => {
    // Duas pernas de estrada separadas por 80 m em linha reta, 8 km pela rota.
    const alertPoint = eastOf(2000);
    const naLinhaReta = destinationPoint(alertPoint, 0, 80); // 80 m ao norte

    const result = computeNearestSupport({
      category: "mechanical",
      origin: { ...alertPoint, routeOffsetM: 2000 },
      candidates: [
        {
          positionId: "outra-perna",
          label: "Mecânico 2",
          role: "mechanic",
          isDispatchable: true,
          lat: naLinhaReta.lat,
          lng: naLinhaReta.lng,
          // Mesma coordenada, mas do outro lado do grampo: 8 km de estrada.
          routeOffsetM: 10_000,
          rollingSpeedMps: 10,
          recordedAtMs: NOW - 3000,
        },
        candidate({ positionId: "mesma-perna", role: "mechanic", routeOffsetM: 500 }),
      ],
      nowMs: NOW,
    });

    // 1,5 km pela rota ganha de 8 km pela rota, apesar de 80 m em linha reta.
    expect(result.suggestions[0]?.positionId).toBe("mesma-perna");

    const outra = result.suggestions.find((s) => s.positionId === "outra-perna");
    expect(Math.round(outra?.straightDistanceM ?? 0)).toBe(80);
    expect(Math.round(outra?.routeDistanceM ?? 0)).toBe(8000);
  });

  it("ignora veículo com sinal perdido e conta isso na nota", () => {
    const result = computeNearestSupport({
      category: "mechanical",
      origin: { ...eastOf(1000), routeOffsetM: 1000 },
      candidates: [
        candidate({
          positionId: "sumido",
          role: "mechanic",
          routeOffsetM: 900,
          recordedAtMs: NOW - (SIGNAL_THRESHOLDS_S.lost + 1) * 1000,
        }),
      ],
      nowMs: NOW,
    });

    expect(result.suggestions).toHaveLength(0);
    expect(result.note).toContain("sem sinal");
  });

  it("aceita veículo apenas atrasado, marcando a idade do dado na justificativa", () => {
    const result = computeNearestSupport({
      category: "mechanical",
      origin: { ...eastOf(1000), routeOffsetM: 1000 },
      candidates: [
        candidate({
          positionId: "atrasado",
          role: "mechanic",
          routeOffsetM: 500,
          recordedAtMs: NOW - (SIGNAL_THRESHOLDS_S.stale + 5) * 1000,
        }),
      ],
      nowMs: NOW,
    });

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]?.reason).toContain("última posição há");
  });

  it("cai para linha reta quando não há offset, e marca isso", () => {
    const point = eastOf(1200);

    const result = computeNearestSupport({
      category: "other",
      origin: { ...eastOf(0), routeOffsetM: null },
      candidates: [
        {
          positionId: "sem-offset",
          label: "Moto 1",
          role: "moto",
          isDispatchable: true,
          lat: point.lat,
          lng: point.lng,
          routeOffsetM: null,
          rollingSpeedMps: 10,
          recordedAtMs: NOW - 2000,
        },
      ],
      nowMs: NOW,
    });

    expect(result.suggestions[0]?.method).toBe("straight_fallback");
    expect(result.suggestions[0]?.routeDistanceM).toBeNull();
    expect(result.suggestions[0]?.isAhead).toBeNull();
    expect(result.suggestions[0]?.reason).toContain("linha reta");
    expect(result.note).toContain("linha reta");
  });

  it("nunca sugere quem não é despachável nem quem disparou o alerta", () => {
    const result = computeNearestSupport({
      category: "other",
      origin: { ...eastOf(1000), routeOffsetM: 1000 },
      candidates: [
        candidate({ positionId: "eu", role: "moto", routeOffsetM: 1000 }),
        candidate({
          positionId: "abertura",
          role: "lead_car",
          routeOffsetM: 1100,
          isDispatchable: false,
        }),
        candidate({ positionId: "moto2", role: "moto", routeOffsetM: 200 }),
      ],
      nowMs: NOW,
      excludePositionId: "eu",
    });

    expect(result.suggestions.map((s) => s.positionId)).toEqual(["moto2"]);
  });

  it("prefere o mecânico ao carro de apoio em empate de distância", () => {
    const result = computeNearestSupport({
      category: "mechanical",
      origin: { ...eastOf(3000), routeOffsetM: 3000 },
      candidates: [
        candidate({ positionId: "apoio", role: "support_car", routeOffsetM: 2500 }),
        candidate({ positionId: "mecanico", role: "mechanic", routeOffsetM: 2400 }),
      ],
      nowMs: NOW,
    });

    expect(result.suggestions[0]?.positionId).toBe("mecanico");
  });

  it("deixa a proximidade vencer a preferência quando a diferença é grande", () => {
    const result = computeNearestSupport({
      category: "mechanical",
      origin: { ...eastOf(8000), routeOffsetM: 8000 },
      candidates: [
        // Carro de apoio a 200 m; mecânico a 6 km. A conta de tempo tem que
        // ganhar da hierarquia de especialidade nesta escala.
        candidate({ positionId: "apoio", role: "support_car", routeOffsetM: 7800 }),
        candidate({ positionId: "mecanico", role: "mechanic", routeOffsetM: 2000 }),
      ],
      nowMs: NOW,
    });

    expect(result.suggestions[0]?.positionId).toBe("apoio");
  });

  it("devolve lista vazia e explica quando não há origem alguma", () => {
    const result = computeNearestSupport({
      category: "medical",
      origin: { lat: null, lng: null, routeOffsetM: null },
      candidates: [candidate({ positionId: "amb", role: "ambulance", routeOffsetM: 100 })],
      nowMs: NOW,
    });

    expect(result.suggestions).toHaveLength(0);
    expect(result.note).toContain("Sem posição de origem");
  });

  it("estima ETA por velocidade nominal quando o veículo está parado", () => {
    const result = computeNearestSupport({
      category: "mechanical",
      origin: { ...eastOf(2000), routeOffsetM: 2000 },
      candidates: [
        candidate({ positionId: "parado", role: "mechanic", routeOffsetM: 1000, rollingSpeedMps: 0 }),
      ],
      nowMs: NOW,
    });

    expect(result.suggestions[0]?.etaEstimated).toBe(true);
    expect(result.suggestions[0]?.reason).toContain("velocidade nominal");
    // 1000 m / 10 m/s nominais do mecânico = 100 s.
    expect(result.suggestions[0]?.etaSeconds).toBe(100);
  });
});
