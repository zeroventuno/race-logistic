/**
 * O que ainda falta para a prova poder ir ao ar.
 *
 * Existe porque a pergunta "está tudo pronto?" é feita na véspera, por telefone,
 * e a resposta não pode depender de o diretor lembrar de conferir cinco telas.
 * Cada item aqui corresponde a algo que, faltando, quebra uma função concreta no
 * dia da prova — não a uma etapa burocrática.
 */

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
  label: string;
  /** O que fazer, em imperativo, quando está pendente. */
  hint: string;
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
      label: "Percurso carregado",
      hint: "Suba o GPX da prova ou desenhe o traçado no mapa. Sem percurso não há cálculo de quilometragem nem de janela.",
      done: input.hasActiveRoute,
      required: true,
      path: "percurso",
    },
    {
      key: "positions",
      label: "Posições de apoio cadastradas",
      hint: "Cadastre os veículos de apoio. Cada um recebe um código para o motorista digitar no celular.",
      done: input.positionCount > 0,
      required: true,
      path: "posicoes",
    },
    {
      key: "lead",
      label: "Referência de abertura definida",
      hint: "Marque qual posição é o carro de abertura. É o começo da janela que a direção acompanha.",
      done: input.hasReferenceLead,
      required: true,
      path: "posicoes",
    },
    {
      key: "sweep",
      label: "Referência de fechamento definida",
      hint: "Marque qual posição é a vassoura. Sem ela o sistema não sabe onde termina o pelotão.",
      done: input.hasReferenceSweep,
      required: true,
      path: "posicoes",
    },
    {
      key: "start",
      label: "Horário de largada",
      hint: "Opcional, mas é o que faz o painel mostrar contagem regressiva em vez de só o relógio.",
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
