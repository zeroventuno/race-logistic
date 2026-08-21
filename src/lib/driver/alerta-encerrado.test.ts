import { describe, expect, it } from "vitest";

import {
  JANELA_APOS_ENCERRAR_MS,
  encerradoHaMaisDe,
  type AlertaEncerravel,
} from "@/lib/driver/alerta-encerrado";

/**
 * O aviso resolvido que não saía mais da tela.
 *
 * Encontrado olhando uma captura da tela do motorista: dois "Mecânico —
 * Resolvido" empilhados logo acima dos botões, comprimindo o mapa. A consulta
 * dos alertas do próprio motorista não filtra status nem tempo — devolve os
 * dez últimos do dia — e nada os removia. Com quatro linhas (o teto da lista),
 * são ~180 px permanentes empurrando para baixo o botão de acidente, que é o
 * controle que menos pode sumir neste produto.
 *
 * O que estes testes protegem não é o prazo, é a PROPRIEDADE: um alerta
 * encerrado sempre acaba saindo, com qualquer combinação de datas que o banco
 * consiga produzir.
 */

const AGORA = Date.parse("2026-08-21T12:00:00.000Z");
const antes = (ms: number) => new Date(AGORA - ms).toISOString();

function alerta(campos: Partial<AlertaEncerravel> = {}): AlertaEncerravel {
  return {
    status: "resolved",
    resolvedAt: null,
    acknowledgedAt: null,
    createdAt: antes(60 * 60_000),
    ...campos,
  };
}

describe("expiração do alerta encerrado", () => {
  it("não expira o que ainda está aberto, por mais velho que seja", () => {
    const velho = alerta({
      status: "open",
      createdAt: antes(6 * 60 * 60_000),
    });
    expect(encerradoHaMaisDe(velho, AGORA)).toBe(false);
  });

  it("não expira um acionamento em curso", () => {
    // Alguém está indo ao local: a linha é a única confirmação disso.
    const aCaminho = alerta({ status: "en_route", acknowledgedAt: antes(10 * 60_000) });
    expect(encerradoHaMaisDe(aCaminho, AGORA)).toBe(false);
  });

  it("mantém o recém-resolvido, para o laço fechar na tela de quem chamou", () => {
    const agoraMesmo = alerta({ resolvedAt: antes(5_000) });
    expect(encerradoHaMaisDe(agoraMesmo, AGORA)).toBe(false);
  });

  it("solta o resolvido depois da janela", () => {
    const passado = alerta({ resolvedAt: antes(JANELA_APOS_ENCERRAR_MS + 1_000) });
    expect(encerradoHaMaisDe(passado, AGORA)).toBe(true);
  });

  it("na borda exata da janela ainda mostra", () => {
    const naBorda = alerta({ resolvedAt: antes(JANELA_APOS_ENCERRAR_MS) });
    expect(encerradoHaMaisDe(naBorda, AGORA)).toBe(false);
  });

  /**
   * `cancelled` não passa pelo gatilho que preenche `resolved_at` — só
   * `resolved` passa. Sem a queda para `acknowledged_at`, um alerta cancelado
   * usaria `createdAt` e sumiria cedo demais, ou ficaria para sempre.
   */
  it("usa acknowledged_at quando o cancelado não tem resolved_at", () => {
    const recem = alerta({
      status: "cancelled",
      resolvedAt: null,
      acknowledgedAt: antes(30_000),
      createdAt: antes(3 * 60 * 60_000),
    });
    expect(encerradoHaMaisDe(recem, AGORA)).toBe(false);

    const antigo = alerta({
      status: "cancelled",
      resolvedAt: null,
      acknowledgedAt: antes(JANELA_APOS_ENCERRAR_MS + 1_000),
      createdAt: antes(3 * 60 * 60_000),
    });
    expect(encerradoHaMaisDe(antigo, AGORA)).toBe(true);
  });

  it("cai para createdAt quando não há nenhuma das duas datas", () => {
    const semDatas = alerta({
      status: "cancelled",
      createdAt: antes(JANELA_APOS_ENCERRAR_MS + 1_000),
    });
    expect(encerradoHaMaisDe(semDatas, AGORA)).toBe(true);
  });

  it("prefere resolved_at a acknowledged_at", () => {
    // Reconhecido há muito tempo, resolvido agora: quem manda é a resolução,
    // senão a linha sumiria no instante em que passou a ter algo a dizer.
    const a = alerta({
      acknowledgedAt: antes(2 * 60 * 60_000),
      resolvedAt: antes(1_000),
    });
    expect(encerradoHaMaisDe(a, AGORA)).toBe(false);
  });

  it("data ilegível não vira linha eterna", () => {
    const quebrada = alerta({ resolvedAt: "isto não é uma data" });
    expect(encerradoHaMaisDe(quebrada, AGORA)).toBe(true);
  });

  it("qualquer alerta encerrado some com o tempo suficiente", () => {
    const combinacoes: Partial<AlertaEncerravel>[] = [
      { resolvedAt: antes(24 * 60 * 60_000) },
      { acknowledgedAt: antes(24 * 60 * 60_000) },
      { createdAt: antes(24 * 60 * 60_000) },
      { status: "cancelled", acknowledgedAt: antes(24 * 60 * 60_000) },
    ];

    for (const campos of combinacoes) {
      expect(encerradoHaMaisDe(alerta(campos), AGORA)).toBe(true);
    }
  });
});
