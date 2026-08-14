"use client";

import { mensagemDeErroDoBanco } from "@/app/(director)/_lib/db-errors";
import { supabaseBrowser } from "@/lib/supabase/client";

import type { LiveAlertView } from "./protocol";

/**
 * Ações do diretor sobre um alerta.
 *
 * Escrevem direto no Postgres pelo cliente do browser, com RLS. Não há Server
 * Action no caminho de propósito: reconhecer um acidente tem que sair no
 * primeiro clique, e uma Server Action custa um round-trip de renderização do
 * servidor antes de qualquer coisa acontecer na tela.
 *
 * TRÊS ARMADILHAS DO SCHEMA QUE ESTE ARQUIVO EVITA, e que valem estar escritas
 * porque o banco reage a elas levantando exceção no meio de uma prova:
 *
 *  1. NENHUM CARIMBO DE TEMPO SAI DAQUI. O gatilho `freeze_alert_facts`
 *     preenche `acknowledged_at` e `resolved_at` com `now()` do servidor, e
 *     recusa `resolved_at < acknowledged_at`. Mandar a hora do browser — que
 *     pode estar segundos atrasada — faria a resolução ser recusada com um erro
 *     que não diz nada ao diretor. O relógio da auditoria é o do banco.
 *
 *  2. RECONHECER NÃO REBAIXA O STATUS. Um alerta já acionado automaticamente
 *     está em `dispatched`; mandar `status='acknowledged'` nele apagaria o
 *     acionamento da máquina de estados. Quando já houve acionamento, o
 *     reconhecimento grava só o AUTOR.
 *
 *  3. `acknowledged_by` É A PROVA DE LEITURA HUMANA. O gatilho preenche
 *     `acknowledged_at` sozinho sempre que o status sai de `open` — inclusive no
 *     acionamento automático, que roda sem ninguém olhando. Só o autor
 *     distingue "a máquina agiu" de "alguém viu".
 */

export interface ResultadoAcao {
  erro?: string;
}

const OK: ResultadoAcao = {};

/** Reconhecer: 1 clique, sem confirmação, sem modal. */
export async function reconhecerAlerta(
  alerta: LiveAlertView,
  usuarioId: string,
): Promise<ResultadoAcao> {
  const patch: Record<string, unknown> = { acknowledged_by: usuarioId };

  // Só o alerta ainda `open` avança de status. Ver armadilha 2.
  if (alerta.status === "open") patch.status = "acknowledged";

  const resultado = await atualizar(alerta.alertId, patch);
  if (resultado.erro) return resultado;

  await registrarEvento(alerta.alertId, "acknowledged_by_director", {
    previousStatus: alerta.status,
  });

  return OK;
}

/**
 * Acionar (ou trocar) o apoio. 1 clique a partir da lista de sugestões.
 *
 * A troca reseta a resposta do motorista anterior: `dispatch_acknowledged_at` e
 * `dispatch_declined_at` voltam a nulo porque se referem a OUTRO veículo. O que
 * aconteceu antes não some — vive em `alert_events`, que ninguém sobrescreve.
 */
export async function acionarApoio(
  alerta: LiveAlertView,
  destino: { positionId: string; label: string; motivo: string | null },
  usuarioId: string,
): Promise<ResultadoAcao> {
  const anterior = alerta.dispatch?.positionId ?? null;

  const resultado = await atualizar(alerta.alertId, {
    dispatched_position_id: destino.positionId,
    dispatched_at: new Date().toISOString(),
    dispatch_mode: "manual",
    dispatch_reason:
      destino.motivo ?? `${destino.label} — acionado manualmente pela direção.`,
    dispatch_acknowledged_at: null,
    dispatch_declined_at: null,
    dispatch_decline_reason: null,
    status: "dispatched",
    // Quem aciona está, por definição, olhando o alerta.
    acknowledged_by: usuarioId,
  });

  if (resultado.erro) return resultado;

  await registrarEvento(
    alerta.alertId,
    anterior ? "dispatch_reassigned_by_director" : "dispatched_by_director",
    {
      positionId: destino.positionId,
      previousPositionId: anterior,
      label: destino.label,
      reason: destino.motivo,
    },
  );

  return OK;
}

/** Resolver: 1 clique. A nota é opcional e não bloqueia. */
export async function resolverAlerta(
  alerta: LiveAlertView,
  usuarioId: string,
  nota?: string | null,
): Promise<ResultadoAcao> {
  const resultado = await atualizar(alerta.alertId, {
    status: "resolved",
    resolved_by: usuarioId,
    acknowledged_by: alerta.acknowledgedBy ?? usuarioId,
    resolution_note: nota?.trim() ? nota.trim() : null,
  });

  if (resultado.erro) return resultado;

  await registrarEvento(alerta.alertId, "resolved_by_director", {
    note: nota?.trim() || null,
  });

  return OK;
}

/**
 * Cancelar: alarme falso.
 *
 * Estado final e irreversível pelo gatilho do banco, então esta é a única ação
 * do painel com confirmação — e a confirmação acontece na interface, em dois
 * cliques no mesmo botão, sem modal empilhado.
 */
export async function cancelarAlerta(
  alerta: LiveAlertView,
  usuarioId: string,
  nota?: string | null,
): Promise<ResultadoAcao> {
  const resultado = await atualizar(alerta.alertId, {
    status: "cancelled",
    acknowledged_by: alerta.acknowledgedBy ?? usuarioId,
    resolution_note: nota?.trim() ? nota.trim() : null,
  });

  if (resultado.erro) return resultado;

  await registrarEvento(alerta.alertId, "cancelled_by_director", {
    note: nota?.trim() || null,
  });

  return OK;
}

async function atualizar(
  alertId: string,
  patch: Record<string, unknown>,
): Promise<ResultadoAcao> {
  try {
    const { data, error } = await supabaseBrowser()
      .from("alerts")
      .update(patch)
      .eq("id", alertId)
      .select("id");

    if (error) return { erro: mensagemDeErroDoBanco(error) };

    // Zero linhas com RLS ligado significa uma de duas coisas, e as duas pedem
    // a mesma ação: o alerta já está num estado final, ou esta pessoa perdeu a
    // permissão de editar a prova.
    if (!data || data.length === 0) {
      return {
        erro:
          "Nada mudou: o alerta pode já ter sido encerrado por outra pessoa, ou você não tem mais permissão nesta prova. Recarregue a página.",
      };
    }

    return OK;
  } catch (e) {
    return { erro: (e as Error).message };
  }
}

/**
 * Trilha de auditoria.
 *
 * Nunca devolve erro: um evento perdido não pode impedir o socorro. O gatilho
 * `stamp_alert_event_actor` sobrescreve autor e tipo de autor com quem está
 * autenticado, então o que mandamos aqui é só a intenção.
 */
async function registrarEvento(
  alertId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await supabaseBrowser().from("alert_events").insert({
      alert_id: alertId,
      type,
      actor_type: "director",
      payload,
    });
  } catch (error) {
    console.warn("[live] evento de auditoria perdido:", (error as Error).message);
  }
}

export interface EventoDeAlerta {
  id: number;
  type: string;
  actorType: string;
  actorId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

/** Histórico completo de um alerta. Fora do caminho quente: só sob demanda. */
export async function carregarHistorico(
  alertId: string,
): Promise<{ eventos: EventoDeAlerta[]; erro?: string }> {
  try {
    const { data, error } = await supabaseBrowser()
      .from("alert_events")
      .select("id, type, actor_type, actor_id, payload, created_at")
      .eq("alert_id", alertId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) return { eventos: [], erro: mensagemDeErroDoBanco(error) };

    return {
      eventos: (data ?? []).map((row) => ({
        id: Number(row.id),
        type: String(row.type),
        actorType: String(row.actor_type),
        actorId: (row.actor_id as string | null) ?? null,
        payload: (row.payload as Record<string, unknown>) ?? {},
        createdAt: String(row.created_at),
      })),
    };
  } catch (e) {
    return { eventos: [], erro: (e as Error).message };
  }
}
