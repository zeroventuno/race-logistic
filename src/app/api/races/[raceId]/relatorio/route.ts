import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse, type NextRequest } from "next/server";

import { isUuid } from "@/app/(director)/_lib/session";
import { documentoDoRelatorio } from "@/lib/relatorio/Documento";
import { montarRelatorio } from "@/lib/relatorio/dados";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * O relatório final da prova, em PDF.
 *
 * ------------------------------------------------------------------------
 * MESMO PORTÃO DE QUEM ENCERRA A PROVA
 *
 * `can_edit_race` — a mesma checagem que a ação de encerrar usa. Não existe
 * permissão nova para o relatório, de propósito: conceito de permissão a mais
 * é superfície de erro a mais.
 *
 * `is_race_member` seria largo demais. Mesmo sem telefone, o documento traz
 * nome de motorista, placa e o rastro completo de cada incidente. Quem
 * acompanha o painel como fiscal não tem por que receber isso.
 *
 * ------------------------------------------------------------------------
 * SÓ COM A PROVA ENCERRADA
 *
 * Relatório parcial de prova em andamento é pior que não ter relatório: ele
 * sai com cara de documento, circula, e passa a afirmar sobre uma prova que
 * ainda estava acontecendo quando ele foi feito.
 *
 * ------------------------------------------------------------------------
 * NÃO GRAVA NADA, E POR ENQUANTO NÃO CONGELA
 *
 * A versão congelada — PDF guardado com hash, que é o que libera o expurgo dos
 * pings — ainda não existe. Enquanto ela não existir, **não apagar
 * `location_pings`**: é deles que esta rota reconstrói a série, e uma limpeza
 * feita antes do congelamento leva junto a única prova de que a prova
 * aconteceu.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Geração acima disto é sintoma, não lentidão normal. */
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ raceId: string }> },
) {
  const { raceId } = await context.params;

  if (!isUuid(raceId)) {
    return erro(400, "Prova inválida.");
  }

  const supabase = await supabaseServer();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return erro(401, "Sessão expirada.");
  }

  const { data: podeEditar, error: permErro } = await supabase.rpc(
    "can_edit_race",
    { p_race_id: raceId },
  );
  if (permErro || podeEditar !== true) {
    // 404, não 403: confirmar que a prova existe já é informação para quem
    // está sondando identificadores.
    return erro(404, "Prova não encontrada.");
  }

  const dados = await montarRelatorio(raceId);
  if (!dados) {
    return erro(404, "Prova não encontrada.");
  }

  if (!dados.prova.fim) {
    return erro(409, "O relatório fica disponível depois que a prova é encerrada.");
  }

  const pdf = await renderToBuffer(documentoDoRelatorio(dados));

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeDoArquivo(dados.prova.nome, dados.prova.inicio)}"`,
      // Documento com nome de motorista e rastro de incidente não fica em
      // cache de proxy nenhum.
      "Cache-Control": "private, no-store",
    },
  });
}

function erro(status: number, mensagem: string) {
  return NextResponse.json({ error: mensagem }, { status });
}

/**
 * `relatorio-etape-piemonte-2026-08-21.pdf`.
 *
 * Vira anexo de e-mail para a prefeitura e arquivo numa pasta que guarda os
 * documentos de várias provas. Um `download.pdf` ali dentro é indistinguível
 * de qualquer outro em seis meses.
 */
function nomeDoArquivo(nome: string, inicioIso: string | null): string {
  const base = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  const dia = inicioIso ? inicioIso.slice(0, 10) : "sem-data";

  return `relatorio-${base || "prova"}-${dia}.pdf`;
}
