import { describe, expect, it } from "vitest";

import { elevationGainM, type RoutePointTuple } from "./track";

/** [lng, lat, distância cumulativa, elevação] */
function perfil(amostras: [number, number][]): RoutePointTuple[] {
  return amostras.map(([d, e]) => [7.5, 44.4, d, e]);
}

describe("elevationGainM", () => {
  it("conta uma subida longa por inteiro", () => {
    // 300 m de subida em 6 km, um ponto a cada 100 m.
    const pts = perfil(
      Array.from({ length: 61 }, (_, i) => [i * 100, 500 + i * 5] as [number, number]),
    );
    const g = elevationGainM(pts)!;
    expect(g).toBeGreaterThan(270);
    expect(g).toBeLessThanOrEqual(300);
  });

  /**
   * A REGRESSÃO QUE MOTIVOU O ARQUIVO. Somar todo delta positivo transformava
   * o tremor de um metro do aparelho em centenas de metros de subida. Num
   * granfondo real dava 3 183 m contra 2 201 publicados.
   */
  it("não conta tremor do aparelho como subida", () => {
    // Estrada plana com ruído de ±1,5 m, alternado, ao longo de 10 km.
    const pts = perfil(
      Array.from({ length: 501 }, (_, i) => [
        i * 20,
        400 + (i % 2 === 0 ? 1.5 : -1.5),
      ] as [number, number]),
    );
    // A soma crua daria mais de 700 m aqui.
    expect(elevationGainM(pts)).toBeLessThan(10);
  });

  it("conta subida real mesmo com ruído em cima", () => {
    const pts = perfil(
      Array.from({ length: 201 }, (_, i) => [
        i * 50,
        500 + i * 1 + (i % 2 === 0 ? 1.5 : -1.5),
      ] as [number, number]),
    );
    const g = elevationGainM(pts)!;
    expect(g).toBeGreaterThan(170);
    expect(g).toBeLessThan(210);
  });

  it("devolve nulo quando o GPX não traz elevação", () => {
    const pts: RoutePointTuple[] = [
      [7.5, 44.4, 0, null],
      [7.5, 44.4, 100, null],
    ];
    expect(elevationGainM(pts)).toBeNull();
  });
});
