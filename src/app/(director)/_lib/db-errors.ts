/**
 * Tradução de erro do Postgres para frase acionável em português.
 *
 * Todos os índices citados aqui existem de propósito no schema — eles são a
 * última linha de defesa contra estado inconsistente (dois carros de abertura,
 * dois percursos ativos, código de vínculo duplicado entre provas). Quando um
 * deles dispara, a interface não pode mostrar o texto do Postgres: o diretor
 * está com pressa e "duplicate key value violates unique constraint" não diz o
 * que ele deve fazer agora.
 *
 * As mensagens dizem a AÇÃO, não o diagnóstico.
 */

export interface DbErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

const BY_CONSTRAINT: ReadonlyArray<[string, string]> = [
  [
    "route_tracks_one_active_per_race",
    "Outro percurso foi ativado nesta prova enquanto você trabalhava. Recarregue a página e envie de novo — o percurso mais recente vence.",
  ],
  [
    "race_positions_bind_code_unique",
    "O código sorteado colidiu com um já em uso em outra prova. Clique em salvar de novo: um código novo será sorteado.",
  ],
  [
    "race_positions_one_lead",
    "Esta prova já tem uma referência de abertura. Desmarque a atual antes de marcar outra.",
  ],
  [
    "race_positions_one_sweep",
    "Esta prova já tem uma referência de fechamento. Desmarque a atual antes de marcar outra.",
  ],
  [
    "race_positions_race_id_ordinal_key",
    "Duas posições ficaram com a mesma ordem. Recarregue a página e refaça a reordenação.",
  ],
  [
    "position_sessions_one_active",
    "Já existe um celular vinculado a esta posição. Revogue o vínculo atual antes de criar outro.",
  ],
];

const BY_CHECK: ReadonlyArray<[string, string]> = [
  [
    "lead_and_sweep_are_different",
    "A mesma posição não pode ser a referência de abertura e a de fechamento — o cálculo da janela compararia o veículo com ele mesmo.",
  ],
  [
    "gap_window_coherent",
    "O limite mínimo da janela precisa ser menor que o máximo.",
  ],
  [
    "target_gap_minutes",
    "A janela alvo precisa estar entre 1 e 600 minutos.",
  ],
  [
    "races_name_check",
    "O nome da prova precisa ter entre 1 e 200 caracteres.",
  ],
  [
    "race_positions_label_check",
    "O nome da posição precisa ter entre 1 e 60 caracteres.",
  ],
  [
    "race_positions_bind_code_check",
    "O código gerado saiu fora do formato esperado. Tente novamente.",
  ],
  [
    "total_distance_m",
    "O percurso precisa ter comprimento maior que zero.",
  ],
  [
    "point_count",
    "O percurso precisa de pelo menos 2 pontos.",
  ],
];

export function mensagemDeErroDoBanco(
  error: DbErrorLike | null | undefined,
  fallback = "Não foi possível salvar. Tente de novo; se continuar, recarregue a página.",
): string {
  if (!error) return fallback;

  const haystack = `${error.message ?? ""} ${error.details ?? ""}`;

  for (const [constraint, message] of BY_CONSTRAINT) {
    if (haystack.includes(constraint)) return message;
  }

  for (const [constraint, message] of BY_CHECK) {
    if (haystack.includes(constraint)) return message;
  }

  // Os gatilhos de proteção do schema (posição que já transmitiu, alerta
  // congelado, prova sem responsável) levantam exceção com uma frase escrita
  // para humanos e o mesmo `errcode` de uma constraint. Trocar essa frase pelo
  // texto genérico jogaria fora a única explicação boa que existe.
  if (ehMensagemDeGatilho(error)) {
    return error.message!.trim();
  }

  switch (error.code) {
    case "23505":
      return "Esse registro já existe. Recarregue a página para ver o estado atual.";
    case "23514":
      return "Algum valor está fora do permitido. Revise os campos e tente de novo.";
    case "23503":
      return "A prova referenciada não existe mais. Volte para a lista de provas.";
    case "42501":
      return "Você não tem permissão para alterar esta prova.";
    case "PGRST116":
      return "Registro não encontrado — ele pode ter sido removido por outra pessoa. Recarregue a página.";
    case "PGRST301":
      return "Sua sessão expirou. Entre novamente.";
    default:
      return fallback;
  }
}

/**
 * A mensagem veio de um `raise exception` de gatilho, e não do Postgres?
 *
 * As duas coisas chegam com o mesmo `code`. O que as separa é a forma: o
 * Postgres sempre descreve a estrutura violada em inglês ("violates check
 * constraint"), enquanto os gatilhos deste schema escrevem uma frase completa
 * para o diretor ler.
 */
function ehMensagemDeGatilho(error: DbErrorLike): boolean {
  const msg = error.message?.trim();
  if (!msg) return false;
  if (error.code !== "23514" && error.code !== "P0001") return false;

  return (
    !msg.includes("violates check constraint") &&
    !msg.includes("new row for relation")
  );
}

/** O erro veio de uma colisão de código de vínculo? (vale um novo sorteio) */
export function isColisaoDeCodigo(error: DbErrorLike | null | undefined): boolean {
  if (!error) return false;
  return `${error.message ?? ""} ${error.details ?? ""}`.includes(
    "race_positions_bind_code_unique",
  );
}

/** O erro veio da corrida por um `ordinal` livre? (vale recalcular e repetir) */
export function isColisaoDeOrdinal(error: DbErrorLike | null | undefined): boolean {
  if (!error) return false;
  return `${error.message ?? ""} ${error.details ?? ""}`.includes(
    "race_positions_race_id_ordinal_key",
  );
}
