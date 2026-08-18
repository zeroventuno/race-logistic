import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { notificarContato } from "@/lib/email/notificar";

/**
 * O aviso do formulário de contato.
 *
 * O que estes testes protegem não é o e-mail: é o PEDIDO. A rota grava
 * primeiro e avisa depois, e a única promessa que o aviso precisa cumprir é
 * nunca lançar — porque quem chama já respondeu "recebido" para uma pessoa que
 * estava tentando comprar, e essa resposta é verdade mesmo se o e-mail não
 * sair.
 */

const PEDIDO = {
  name: "Marina Ferrero",
  email: "marina@granfondo.it",
  organization: "Granfondo delle Langhe",
  message: "Organizo uma prova de 3 etapas. Quero entender o acionamento.",
  locale: "it",
};

const AMBIENTE = { ...process.env };

beforeEach(() => {
  process.env.RESEND_API_KEY = "re_teste";
  process.env.CONTACT_NOTIFY_TO = "eu@exemplo.com";
  process.env.CONTACT_NOTIFY_FROM = "Flamme Rouge <envio@exemplo.com>";
});

afterEach(() => {
  process.env = { ...AMBIENTE };
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("notificarContato", () => {
  it("manda o pedido inteiro, para responder sem abrir o banco", async () => {
    const chamadas: Array<{ url: string; corpo: Record<string, unknown> }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      chamadas.push({ url, corpo: JSON.parse(String(init.body)) });
      return new Response(JSON.stringify({ id: "abc" }), { status: 200 });
    });

    expect(await notificarContato(PEDIDO)).toBe(true);
    expect(chamadas).toHaveLength(1);

    const { corpo } = chamadas[0]!;
    expect(corpo.to).toEqual(["eu@exemplo.com"]);
    // Responder tem que cair na caixa de quem escreveu, não na aplicação.
    expect(corpo.reply_to).toBe("marina@granfondo.it");
    expect(String(corpo.subject)).toContain("Marina Ferrero");
    expect(String(corpo.subject)).toContain("Granfondo delle Langhe");

    const texto = String(corpo.text);
    expect(texto).toContain(PEDIDO.message);
    expect(texto).toContain("marina@granfondo.it");
    // O idioma vai junto: é como responder na língua dela sem adivinhar.
    expect(texto).toContain("it");
  });

  it("não inventa organização quando não veio nenhuma", async () => {
    let assunto = "";
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      assunto = String(JSON.parse(String(init.body)).subject);
      return new Response("{}", { status: 200 });
    });

    await notificarContato({ ...PEDIDO, organization: null });
    expect(assunto).toBe("Contato — Marina Ferrero");
  });

  // As três garantias abaixo são a mesma: o pedido já está salvo, então nada
  // aqui pode virar exceção.
  it("fica quieto e devolve falso quando não está configurado", async () => {
    delete process.env.RESEND_API_KEY;
    const chamou = vi.fn();
    vi.stubGlobal("fetch", chamou);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(await notificarContato(PEDIDO)).toBe(false);
    expect(chamou).not.toHaveBeenCalled();
  });

  it("engole a recusa do serviço", async () => {
    vi.stubGlobal("fetch", async () => new Response("chave inválida", { status: 401 }));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(notificarContato(PEDIDO)).resolves.toBe(false);
  });

  it("engole a rede caída", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("ECONNREFUSED");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(notificarContato(PEDIDO)).resolves.toBe(false);
  });
});
