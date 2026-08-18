import { describe, expect, it } from "vitest";

import { buildRouteTrack, voltasNoTracado } from "@/lib/route/track";

/**
 * O fio enrolado.
 *
 * O sistema espera que o GPX seja uma volta e multiplica pelo número de voltas
 * do cadastro. Quem sobe o percurso reconhecido inteiro — três voltas
 * desenhadas como uma linha só — e escreve 3 no campo acaba com uma prova de
 * nove voltas, e com a contagem de voltas quebrada por baixo.
 *
 * Estes testes protegem os dois lados: que a detecção dispare no fio enrolado,
 * e que ela NÃO dispare no que é percurso legítimo.
 */

/** Um círculo de raio `raioM`, com `porVolta` pontos, repetido `voltas` vezes. */
function circuito(voltas: number, raioM = 800, porVolta = 180) {
  const centro = { lat: 44.7, lng: 7.9 };
  const grausLat = raioM / 111_320;
  const grausLng = grausLat / Math.cos((centro.lat * Math.PI) / 180);

  const pontos = [];
  const passos = porVolta * voltas;
  for (let i = 0; i <= passos; i++) {
    const a = (2 * Math.PI * i) / porVolta;
    pontos.push({
      lat: centro.lat + grausLat * Math.sin(a),
      lng: centro.lng + grausLng * Math.cos(a),
    });
  }
  return pontos;
}

/** Ida até um ponto e volta pelo mesmo caminho. */
function idaEVolta(kmIda = 6, passos = 200) {
  const ida = [];
  for (let i = 0; i <= passos; i++) {
    ida.push({ lat: 44.7 + (kmIda / 111.32) * (i / passos), lng: 7.9 });
  }
  return [...ida, ...ida.slice(0, -1).reverse()];
}

describe("voltasNoTracado", () => {
  it("reconhece três voltas desenhadas como um traçado só", () => {
    const { track } = buildRouteTrack(circuito(3));
    expect(voltasNoTracado(track)).toBe(3);
  });

  it("reconhece duas voltas", () => {
    const { track } = buildRouteTrack(circuito(2));
    expect(voltasNoTracado(track)).toBe(2);
  });

  it("devolve a volta de verdade, e não um divisor dela", () => {
    // Num fio de seis voltas o deslocamento de três também casa. Reportar 2
    // seria meia verdade e mandaria o diretor recortar errado.
    const { track } = buildRouteTrack(circuito(6, 800, 120));
    expect(voltasNoTracado(track)).toBe(6);
  });

  it("não confunde uma volta única com fio enrolado", () => {
    const { track } = buildRouteTrack(circuito(1));
    expect(voltasNoTracado(track)).toBe(1);
  });

  // O caso que quebraria a detecção ingênua: numa ida-e-volta cada ponto TEM
  // um gêmeo no traçado. Mas o gêmeo está espelhado (`total - d`), não a uma
  // distância fixa à frente — e é isso que separa repetição de retorno.
  it("não confunde ida-e-volta com duas voltas", () => {
    const { track } = buildRouteTrack(idaEVolta());
    expect(voltasNoTracado(track)).toBe(1);
  });

  it("não opina sobre percurso curto demais para ter volta", () => {
    const { track } = buildRouteTrack(circuito(3, 60, 40));
    expect(voltasNoTracado(track)).toBe(1);
  });
});

describe("aviso na importação", () => {
  it("diz quantas voltas achou e o que dá errado se o diretor repetir o número", () => {
    const { warnings } = buildRouteTrack(circuito(3));
    const aviso = warnings.find((w) => w.includes("voltas desenhadas"));

    expect(aviso).toBeDefined();
    expect(aviso).toContain("3 voltas");
    // A consequência precisa estar escrita: 3 × 3.
    expect(aviso).toContain("9 voltas");
  });

  it("cala a boca quando o traçado é uma volta só", () => {
    const { warnings } = buildRouteTrack(circuito(1));
    expect(warnings.some((w) => w.includes("voltas desenhadas"))).toBe(false);
  });
});
