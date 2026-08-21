import type { DriverAlertStatus } from "@/lib/driver/protocol";

/**
 * Quando um alerta encerrado deixa de ocupar espaço na tela do motorista.
 *
 * O laço PRECISA fechar. "Ambulância 1 acionada" → "a caminho" → "chegou" →
 * "resolvido" é a razão de a lista de alertas existir na tela de quem chamou:
 * sem o último passo o motorista fica sem saber se acabou bem.
 *
 * Mas fechar não é o mesmo que ficar. A consulta que traz os alertas do
 * próprio motorista não tem filtro de status nem janela de tempo — devolve os
 * últimos dez do dia inteiro — e nada no cliente os removia. Numa prova com
 * alguns chamados, quatro linhas de "Resolvido" viravam ~180 px permanentes
 * logo acima dos botões, empurrando para fora da tela, entre todos os
 * controles possíveis, justamente o de acidente.
 *
 * Isto vive fora do componente por ser regra, e não desenho: o componente é
 * `"use client"` e arrasta React inteiro para dentro de um teste que só quer
 * saber de datas.
 */

/**
 * Dois minutos é uma volta de olho com folga.
 *
 * O estado é relido a cada 10 s com a tela à frente, então a linha ainda
 * aparece em cerca de doze leituras depois de o alerta ser resolvido — tempo
 * de sobra para quem estava dirigindo notar, e curto o bastante para a lista
 * não virar um histórico.
 */
export const JANELA_APOS_ENCERRAR_MS = 120_000;

/** Só os campos que decidem a expiração. */
export interface AlertaEncerravel {
  status: DriverAlertStatus;
  resolvedAt: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}

/**
 * O alerta acabou, e faz tempo suficiente para sair da tela?
 *
 * O INSTANTE DE ENCERRAMENTO TEM TRÊS CANDIDATOS porque o banco só garante
 * dois. O gatilho da migração 0005 preenche `resolved_at` quando o status vira
 * `resolved`, mas não quando vira `cancelled`; nesse caso quem está garantido é
 * `acknowledged_at`, que o mesmo gatilho preenche para qualquer status
 * diferente de `open`. `createdAt` fecha a conta e existe sempre.
 *
 * A ordem importa e é da mais precisa para a mais grosseira. O que ela protege
 * é a propriedade que motivou tudo isto: com qualquer combinação de datas, a
 * linha sempre acaba saindo — nunca fica presa na tela por falta de um campo.
 */
export function encerradoHaMaisDe(
  alerta: AlertaEncerravel,
  agoraMs: number,
  janelaMs: number = JANELA_APOS_ENCERRAR_MS,
): boolean {
  if (alerta.status !== "resolved" && alerta.status !== "cancelled") return false;

  const fechadoEm =
    alerta.resolvedAt ?? alerta.acknowledgedAt ?? alerta.createdAt;

  const instante = Date.parse(fechadoEm);
  // Data ilegível não pode virar "fica para sempre": sem instante confiável a
  // linha sai, porque o alerta já está encerrado de qualquer forma e o custo
  // de mantê-la é o botão de acidente descendo na tela.
  if (Number.isNaN(instante)) return true;

  return agoraMs - instante > janelaMs;
}
