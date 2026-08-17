import { describe, expect, it } from "vitest";

/**
 * A tela cheia de acionamento voltava sozinha, e isto reproduz o porquê.
 *
 * Encontrado em teste de campo: o motorista toca "Estou indo", a tela some, e
 * segundos depois ela volta. Não era lag da rede — era a fila local esvaziando
 * antes de a confirmação do servidor chegar, deixando uma janela em que o
 * alerta parecia não respondido.
 */

interface Estado {
  /** O servidor já registrou a confirmação? */
  acknowledgedAt: string | null;
  /** A resposta ainda está na fila local esperando envio? */
  naFila: boolean;
}

function criarTela() {
  const respondidos = new Set<string>();

  return function mostraTelaCheia(id: string, e: Estado): boolean {
    if (e.naFila) respondidos.add(id);
    const respondido = Boolean(e.acknowledgedAt) || e.naFila || respondidos.has(id);
    return !respondido;
  };
}

describe("tela cheia de acionamento", () => {
  it("aparece quando o acionamento chega", () => {
    const mostra = criarTela();
    expect(mostra("a1", { acknowledgedAt: null, naFila: false })).toBe(true);
  });

  it("some assim que a resposta entra na fila", () => {
    const mostra = criarTela();
    mostra("a1", { acknowledgedAt: null, naFila: false });
    expect(mostra("a1", { acknowledgedAt: null, naFila: true })).toBe(false);
  });

  it("NÃO volta na janela entre a fila esvaziar e o servidor confirmar", () => {
    // Este é o bug. A fila foi enviada e limpa; o `acknowledgedAt` só chega na
    // próxima leitura de estado, até 30 s depois com a tela em segundo plano.
    const mostra = criarTela();
    mostra("a1", { acknowledgedAt: null, naFila: true });
    expect(mostra("a1", { acknowledgedAt: null, naFila: false })).toBe(false);
    expect(mostra("a1", { acknowledgedAt: null, naFila: false })).toBe(false);
  });

  it("continua escondida depois que o servidor confirma", () => {
    const mostra = criarTela();
    mostra("a1", { acknowledgedAt: null, naFila: true });
    mostra("a1", { acknowledgedAt: null, naFila: false });
    expect(mostra("a1", { acknowledgedAt: "2026-08-18T10:00:00Z", naFila: false })).toBe(
      false,
    );
  });

  it("um acionamento NOVO ainda aparece", () => {
    // A memória é por alerta. Responder um não pode calar o próximo.
    const mostra = criarTela();
    mostra("a1", { acknowledgedAt: null, naFila: true });
    mostra("a1", { acknowledgedAt: null, naFila: false });
    expect(mostra("a2", { acknowledgedAt: null, naFila: false })).toBe(true);
  });
});
