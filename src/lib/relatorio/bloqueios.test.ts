import { describe, expect, it } from "vitest";

import { apurarBloqueios, instanteDaPassagem } from "./bloqueios";
import type { AmostraDePing } from "./serie";

/** Veículo a 10 m/s, um ping a cada 30 s. */
function rastro(deS: number, ateS: number, offsetEmS: (s: number) => number) {
  const out: AmostraDePing[] = [];
  for (let s = deS; s <= ateS; s += 30) {
    out.push({ atMs: s * 1000, receivedAtMs: s * 1000, offsetAbsolutoM: offsetEmS(s) });
  }
  return out;
}

const abertura = rastro(0, 3600, (s) => 10 * s);
const ultimo = rastro(1800, 5400, (s) => 10 * (s - 1800));

describe("instanteDaPassagem", () => {
  it("interpola entre os dois pings que cercam o ponto", () => {
    // 4 500 m a 10 m/s = 450 s, no meio do intervalo 420–450.
    expect(instanteDaPassagem(abertura, 4500, "primeira")).toBe(450_000);
  });

  it("devolve nulo fora do trecho coberto, em vez de projetar", () => {
    // O rastro vai até 36 000 m; 50 km está além.
    expect(instanteDaPassagem(abertura, 50_000, "primeira")).toBeNull();
    // E antes do começo, idem — aqui o rastro começa em 0, então usamos
    // um veículo que só começou a transmitir no meio do percurso.
    const tardio = rastro(1800, 3600, (s) => 10 * s);
    expect(instanteDaPassagem(tardio, 5000, "primeira")).toBeNull();
  });

  it("ignora recuo: moto voltando não fecha rua", () => {
    const comRecuo: AmostraDePing[] = [
      { atMs: 0, receivedAtMs: 0, offsetAbsolutoM: 1000 },
      { atMs: 30_000, receivedAtMs: 30_000, offsetAbsolutoM: 2000 },
      // volta atrás
      { atMs: 60_000, receivedAtMs: 60_000, offsetAbsolutoM: 1200 },
      { atMs: 90_000, receivedAtMs: 90_000, offsetAbsolutoM: 2400 },
    ];
    // 1 500 m é cruzado no primeiro avanço, não no recuo.
    expect(instanteDaPassagem(comRecuo, 1500, "primeira")).toBe(15_000);
  });

  it("distingue primeira de última passagem em circuito", () => {
    const duasVoltas: AmostraDePing[] = [
      { atMs: 0, receivedAtMs: 0, offsetAbsolutoM: 0 },
      { atMs: 60_000, receivedAtMs: 60_000, offsetAbsolutoM: 1000 },
      { atMs: 120_000, receivedAtMs: 120_000, offsetAbsolutoM: 2000 },
      { atMs: 180_000, receivedAtMs: 180_000, offsetAbsolutoM: 3000 },
    ];
    expect(instanteDaPassagem(duasVoltas, 500, "primeira")).toBe(30_000);
    expect(instanteDaPassagem(duasVoltas, 2500, "ultima")).toBe(150_000);
  });
});

describe("apurarBloqueios", () => {
  const pontos = [
    { id: "b", offsetM: 9000, nome: "Cruzamento" },
    { id: "a", offsetM: 3000, nome: null },
  ];

  it("ordena por quilômetro e apura fechou, reabriu e duração", () => {
    const r = apurarBloqueios({ pontos, abertura, ultimo });

    expect(r.map((x) => x.id)).toEqual(["a", "b"]);

    // 3 000 m: abertura passa em 300 s, último passa em 2 100 s.
    expect(r[0]!.fechouMs).toBe(300_000);
    expect(r[0]!.reabriuMs).toBe(2_100_000);
    expect(r[0]!.duracaoS).toBe(1800);
  });

  /**
   * A REGRA DE DOMÍNIO. Reabertura é a passagem do ÚLTIMO veículo, não do
   * carro de fechamento — atrás dele ainda vem prova. Sem último veículo, a
   * coluna sai vazia; nunca preenchida com o fechamento.
   */
  it("sem último veículo, não inventa reabertura", () => {
    const r = apurarBloqueios({ pontos, abertura, ultimo: [] });

    expect(r[0]!.fechouMs).toBe(300_000);
    expect(r[0]!.reabriuMs).toBeNull();
    expect(r[0]!.duracaoS).toBeNull();
  });

  it("não apura ponto fora do trecho percorrido", () => {
    const r = apurarBloqueios({
      pontos: [{ id: "x", offsetM: 99_000, nome: "Longe" }],
      abertura,
      ultimo,
    });

    expect(r[0]!.fechouMs).toBeNull();
    expect(r[0]!.duracaoS).toBeNull();
  });
});
