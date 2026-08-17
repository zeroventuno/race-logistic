/**
 * Tradução de erro do Postgres para frase acionável no idioma da pessoa.
 *
 * Todos os índices citados aqui existem de propósito no schema — eles são a
 * última linha de defesa contra estado inconsistente (dois carros de abertura,
 * dois percursos ativos, código de vínculo duplicado entre provas). Quando um
 * deles dispara, a interface não pode mostrar o texto do Postgres: o diretor
 * está com pressa e "duplicate key value violates unique constraint" não diz o
 * que ele deve fazer agora.
 *
 * As mensagens dizem a AÇÃO, não o diagnóstico.
 *
 * O QUE SAI DAQUI É CHAVE, não frase. A função é chamada de ação de servidor,
 * de rota de API e de componente — lugares que não compartilham nada além do
 * banco. Devolver a chave deixa a decisão do idioma com quem tem o tradutor na
 * mão, que é sempre quem vai mostrar a mensagem.
 *
 * A ÚNICA EXCEÇÃO é a frase de gatilho: o `raise exception` do schema traz um
 * texto escrito para o diretor ler, em português, dentro do SQL. Traduzi-lo
 * exigiria mover essas frases para cá e perder a garantia de que o banco nunca
 * deixa passar o estado inválido em silêncio. Fica em português e assumido.
 */

import type { TranslationKey, Translator } from "@/lib/i18n/translate";

export interface DbErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

const BY_CONSTRAINT: ReadonlyArray<[string, TranslationKey]> = [
  ["route_tracks_one_active_per_race", "errors.db.routeRaceConflict"],
  ["race_positions_bind_code_unique", "errors.db.bindCodeTaken"],
  ["race_positions_one_lead", "errors.db.oneLead"],
  ["race_positions_one_sweep", "errors.db.oneSweep"],
  ["race_positions_race_id_ordinal_key", "errors.db.ordinalConflict"],
  ["position_sessions_one_active", "errors.db.sessionTaken"],
];

const BY_CHECK: ReadonlyArray<[string, TranslationKey]> = [
  ["lead_and_sweep_are_different", "errors.db.leadSweepSame"],
  ["gap_window_coherent", "errors.db.gapWindowIncoherent"],
  ["target_gap_minutes", "errors.db.targetGapRange"],
  ["races_name_check", "errors.db.raceNameLength"],
  ["race_positions_label_check", "errors.db.positionLabelLength"],
  ["bind_code_format", "errors.db.bindCodeFormat"],
  ["total_distance_m", "errors.db.trackDistance"],
  ["point_count", "errors.db.trackPoints"],
];

/** A chave da frase, ou o texto cru quando ele vem de um gatilho do schema. */
export function chaveDeErroDoBanco(
  error: DbErrorLike | null | undefined,
  reserva: TranslationKey = "errors.db.saveFailed",
): { chave: TranslationKey } | { texto: string } {
  if (!error) return { chave: reserva };

  const agulha = `${error.message ?? ""} ${error.details ?? ""}`;

  for (const [constraint, chave] of BY_CONSTRAINT) {
    if (agulha.includes(constraint)) return { chave };
  }

  for (const [constraint, chave] of BY_CHECK) {
    if (agulha.includes(constraint)) return { chave };
  }

  // Os gatilhos de proteção do schema (posição que já transmitiu, alerta
  // congelado, prova sem responsável) levantam exceção com uma frase escrita
  // para humanos e o mesmo `errcode` de uma constraint. Trocar essa frase pelo
  // texto genérico jogaria fora a única explicação boa que existe.
  if (ehMensagemDeGatilho(error)) return { texto: error.message!.trim() };

  switch (error.code) {
    case "23505":
      return { chave: "errors.db.duplicate" };
    case "23514":
      return { chave: "errors.db.checkViolation" };
    case "23503":
      return { chave: "errors.db.missingRace" };
    case "42501":
      return { chave: "errors.forbidden" };
    case "PGRST116":
      return { chave: "errors.db.notFound" };
    case "PGRST301":
      return { chave: "errors.sessionExpired" };
    default:
      return { chave: reserva };
  }
}

/** A mesma coisa, já traduzida, para quem tem o tradutor à mão. */
export function mensagemDeErroDoBanco(
  error: DbErrorLike | null | undefined,
  t: Translator,
  reserva: TranslationKey = "errors.db.saveFailed",
): string {
  const r = chaveDeErroDoBanco(error, reserva);
  return "texto" in r ? r.texto : t(r.chave);
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
