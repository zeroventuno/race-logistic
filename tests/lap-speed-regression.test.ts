import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { parseGpx } from "@/lib/gpx/parse";
import { snapToRoute, type SnapPrevious } from "@/lib/route/snap";
import { buildRouteTrack, positionAtOffset, RouteIndex } from "@/lib/route/track";

/**
 * Regressão: a velocidade entregue ao modelo de movimento tem que ser a
 * velocidade AO LONGO DO PERCURSO, não a que o GPS reporta.
 *
 * Este defeito passou por toda a suíte unitária e só apareceu no teste
 * ponta a ponta, porque os unitários alimentavam o snap com uma velocidade
 * coerente com o deslocamento simulado. Na rota real, a ingestão preferia
 * `ping.speed_mps` — a leitura do GPS, que mede avanço pelo ESPAÇO — sobre a
 * observada, que mede avanço DE PROVA. As duas divergem numa descida sinuosa
 * e divergem completamente num aparelho com leitura errada.
 *
 * O que a divergência causava, medido contra o banco: 442 pings gravados
 * como volta 0 num circuito de 3 voltas, com a posição local CORRETA e a
 * distância de prova errada por duas voltas inteiras — e, na linha de
 * largada, o offset local passava a andar para trás, fazendo o veículo
 * aparecer dirigindo em sentido contrário.
 */

const GPX = join(process.cwd(), "tests", "fixtures", "real-route.gpx");

function realTrack() {
  const xml = readFileSync(GPX, "utf8");
  return buildRouteTrack(parseGpx(xml).segments[0]!.points).track;
}

/**
 * Dirige `laps` voltas do percurso real e devolve a volta final reportada.
 *
 * `reportedSpeedMps` é o que se entrega ao modelo de movimento; a velocidade
 * REAL do veículo sai de `stepM / stepSeconds`. Quando os dois discordam, é o
 * caso que quebrou o sistema.
 */
function drive(opts: {
  laps: number;
  stepM: number;
  stepSeconds: number;
  reportedSpeedMps: number;
}) {
  const track = realTrack();
  const index = new RouteIndex(track);

  let previous: SnapPrevious | null = null;
  let t = Date.UTC(2026, 7, 14, 9, 0, 0);
  let piorErroDeVolta = 0;
  let recuos = 0;

  const total = track.totalDistanceM;
  const fim = total * opts.laps - opts.stepM;

  for (let absolute = 0; absolute <= fim; absolute += opts.stepM) {
    const snap = snapToRoute(index, positionAtOffset(track, absolute % total), {
      previous,
      recordedAtMs: t,
      accuracyM: 8,
      expectedSpeedMps: opts.reportedSpeedMps,
    });

    const voltaCerta = Math.floor(absolute / total);
    piorErroDeVolta = Math.max(piorErroDeVolta, Math.abs(snap.lap - voltaCerta));

    if (previous) {
      const antes = (previous.lap ?? 0) * total + previous.offsetM;
      if (snap.absoluteOffsetM < antes - 50) recuos++;
    }

    previous = {
      offsetM: snap.offsetM,
      lap: snap.lap,
      recordedAtMs: t,
      speedMps: opts.reportedSpeedMps,
    };
    t += opts.stepSeconds * 1000;
  }

  return {
    voltaFinal: previous?.lap ?? 0,
    absolutoFinal: (previous?.lap ?? 0) * total + (previous?.offsetM ?? 0),
    piorErroDeVolta,
    recuos,
    totalEsperado: total * opts.laps - opts.stepM,
  };
}

describe("velocidade do modelo de movimento em circuito", () => {
  it("conta as 3 voltas quando a velocidade informada bate com o deslocamento", () => {
    // 300 m a cada 7,5 s = 40 m/s, e é isso que se informa.
    const r = drive({
      laps: 3,
      stepM: 300,
      stepSeconds: 7.5,
      reportedSpeedMps: 40,
    });

    expect(r.voltaFinal).toBe(2);
    expect(r.piorErroDeVolta).toBe(0);
    expect(r.recuos).toBe(0);
    expect(Math.abs(r.absolutoFinal - r.totalEsperado)).toBeLessThan(400);
  });

  it("NÃO conta as voltas quando a velocidade informada está muito abaixo da real", () => {
    // O caso que quebrou: o veículo cobre 40 m/s de percurso e o aparelho
    // reporta 12 m/s. Este teste documenta a falha para que a ingestão nunca
    // volte a alimentar o modelo com a leitura do GPS.
    const r = drive({
      laps: 3,
      stepM: 300,
      stepSeconds: 7.5,
      reportedSpeedMps: 12,
    });

    expect(r.voltaFinal).toBeLessThan(2);
    expect(r.piorErroDeVolta).toBeGreaterThan(0);
  });

  it("velocidade coerente em ritmo de prova conta as voltas", () => {
    // 36 m a cada 3 s = 12 m/s: ritmo real de carro de apoio.
    const r = drive({
      laps: 2,
      stepM: 36,
      stepSeconds: 3,
      reportedSpeedMps: 12,
    });

    expect(r.voltaFinal).toBe(1);
    expect(r.piorErroDeVolta).toBe(0);
    expect(r.recuos).toBe(0);
  });

  it("o offset absoluto nunca recua ao cruzar a linha de largada", () => {
    // O sintoma mais visível do defeito não era a volta errada — era o
    // marcador andando para trás no mapa, com o veículo aparentando dirigir
    // em sentido contrário logo depois da largada.
    const r = drive({
      laps: 2,
      stepM: 120,
      stepSeconds: 10,
      reportedSpeedMps: 12,
    });

    expect(r.recuos).toBe(0);
  });
});
