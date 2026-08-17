import { describe, expect, it } from "vitest";

/**
 * A regra do aviso "você ficou sem transmitir".
 *
 * O navegador congela a aba que sai da frente, e com ela o GPS. O motorista
 * volta, vê o ponto verde de "transmitindo", e não tem como saber que ficou
 * minutos fora do mapa da direção — a barra de estado mostra o agora, e agora
 * está tudo bem.
 *
 * Duas decisões governam quando avisar, e as duas são sobre NÃO gritar à toa.
 */

const LACUNA_MINIMA_S = 45;

/** O mesmo cálculo do `onVisibility` do runtime. */
function lacunaAoVoltar(
  agoraMs: number,
  escondidaDesdeMs: number | null,
  ultimoPontoMs: number | null,
): number | null {
  if (escondidaDesdeMs === null) return null;
  const ultimo = ultimoPontoMs ?? escondidaDesdeMs;
  const lacuna = Math.round((agoraMs - ultimo) / 1000);
  return lacuna >= LACUNA_MINIMA_S ? lacuna : null;
}

const AGORA = 1_000_000_000;

describe("aviso de lacuna de transmissão", () => {
  it("não avisa numa troca rápida de aba", () => {
    // Vinte segundos para ler uma mensagem não deixam buraco que importe: a
    // direção só considera o dado velho depois de 90 s. Avisar aqui ensinaria
    // o motorista a dispensar sem ler.
    expect(lacunaAoVoltar(AGORA, AGORA - 20_000, AGORA - 20_000)).toBeNull();
  });

  it("avisa quando a aba ficou minutos atrás", () => {
    const lacuna = lacunaAoVoltar(AGORA, AGORA - 360_000, AGORA - 360_000);
    expect(lacuna).toBe(360);
  });

  it("mede pelo ÚLTIMO PONTO, não pelo tempo escondido", () => {
    // Android que continuou rodando em segundo plano: a aba ficou escondida
    // seis minutos, mas o GPS gravou dez segundos atrás. Não houve lacuna, e
    // avisar seria mentira.
    expect(lacunaAoVoltar(AGORA, AGORA - 360_000, AGORA - 10_000)).toBeNull();
  });

  it("usa o instante em que escondeu quando nunca houve ponto", () => {
    // Aparelho recém-vinculado, sem primeira posição ainda. Sem este ramo a
    // conta viraria NaN e o aviso apareceria com "NaN segundos".
    const lacuna = lacunaAoVoltar(AGORA, AGORA - 120_000, null);
    expect(lacuna).toBe(120);
  });

  it("não avisa se a tela nunca saiu da frente", () => {
    expect(lacunaAoVoltar(AGORA, null, AGORA - 999_000)).toBeNull();
  });

  it("no limite exato, avisa", () => {
    expect(lacunaAoVoltar(AGORA, AGORA - 45_000, AGORA - 45_000)).toBe(45);
  });
});
