/**
 * O que ainda falta para a prova poder ir ao ar.
 *
 * Existe porque a pergunta "está tudo pronto?" é feita na véspera, por telefone,
 * e a resposta não pode depender de o diretor lembrar de conferir cinco telas.
 * Cada item aqui corresponde a algo que, faltando, quebra uma função concreta no
 * dia da prova — não a uma etapa burocrática.
 */

import type { TranslationKey } from "@/lib/i18n/translate";

export type ReadinessKey =
  | "route"
  | "positions"
  | "lead"
  | "sweep"
  | "start";

export interface ReadinessInput {
  hasActiveRoute: boolean;
  positionCount: number;
  hasReferenceLead: boolean;
  hasReferenceSweep: boolean;
  hasScheduledStart: boolean;
}

export interface ReadinessItem {
  key: ReadinessKey;
  /**
   * Chave de tradução, não texto.
   *
   * Este módulo é chamado de Server Component, de layout e de página, cada um
   * com o seu tradutor já pronto. Devolver a frase feita obrigaria a passar o
   * idioma para cá — e obrigaria a lembrar disso em toda chamada nova. A chave
   * atravessa qualquer fronteira e é o `Dictionary` que garante que ela existe.
   */
  labelKey: TranslationKey;
  /** O que fazer, em imperativo, quando está pendente. */
  hintKey: TranslationKey;
  done: boolean;
  /** Bloqueia a prova de ir ao ar? Itens não obrigatórios só informam. */
  required: boolean;
  /** Sufixo de rota dentro de `/dashboard/[raceId]`. Vazio = a própria prova. */
  path: "" | "percurso" | "posicoes";
}

export interface Readiness {
  items: ReadinessItem[];
  pending: ReadinessItem[];
  /** Itens obrigatórios ainda pendentes. */
  blocking: ReadinessItem[];
  ready: boolean;
  doneCount: number;
  requiredCount: number;
}

export function computeReadiness(input: ReadinessInput): Readiness {
  const items: ReadinessItem[] = [
    {
      key: "route",
      labelKey: "director.checklist.routeLabel",
      hintKey: "director.checklist.routeHint",
      done: input.hasActiveRoute,
      required: true,
      path: "percurso",
    },
    {
      key: "positions",
      labelKey: "director.checklist.positionsLabel",
      hintKey: "director.checklist.positionsHint",
      done: input.positionCount > 0,
      required: true,
      path: "posicoes",
    },
    {
      key: "lead",
      labelKey: "director.checklist.leadLabel",
      hintKey: "director.checklist.leadHint",
      done: input.hasReferenceLead,
      required: true,
      path: "posicoes",
    },
    {
      key: "sweep",
      labelKey: "director.checklist.sweepLabel",
      hintKey: "director.checklist.sweepHint",
      done: input.hasReferenceSweep,
      required: true,
      path: "posicoes",
    },
    {
      key: "start",
      labelKey: "director.checklist.startLabel",
      hintKey: "director.checklist.startHint",
      done: input.hasScheduledStart,
      required: false,
      path: "",
    },
  ];

  const pending = items.filter((i) => !i.done);
  const blocking = pending.filter((i) => i.required);
  const required = items.filter((i) => i.required);

  return {
    items,
    pending,
    blocking,
    ready: blocking.length === 0,
    doneCount: required.filter((i) => i.done).length,
    requiredCount: required.length,
  };
}
