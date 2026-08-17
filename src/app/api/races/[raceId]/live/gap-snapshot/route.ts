import { getTranslator } from "@/lib/i18n/server";
import { NextResponse } from "next/server";

import { isUuid } from "@/app/(director)/_lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

import { buildLiveSnapshot, LiveSnapshotError } from "../snapshot";

/**
 * Grava um ponto do histórico da janela abertura ↔ fechamento.
 *
 * DUAS DECISÕES QUE PARECEM DETALHE E NÃO SÃO:
 *
 *  1. O NÚMERO É RECALCULADO AQUI. O painel poderia mandar o valor que está
 *     exibindo — seria uma requisição mais barata e uma linha de banco mentirosa.
 *     `gap_snapshots` é registro histórico de uma prova; se alguém questionar
 *     depois por que a rua foi liberada às 14h32, a resposta não pode ter
 *     passado pelo browser de ninguém.
 *
 *  2. A ESCRITA USA `service_role`. `gap_snapshots` tem política de SELECT para
 *     membros e NENHUM grant de INSERT para `authenticated` — de propósito: é
 *     uma série temporal que o sistema produz, não algo que um cliente
 *     alimenta. A permissão é conferida ANTES, com o cliente do usuário, via
 *     `can_edit_race`.
 *
 * `insufficient_data` também é gravado. "Às 14h30 o sistema não sabia onde
 * estava o fechamento" é exatamente o tipo de coisa que uma revisão pós-prova
 * precisa encontrar — e que um filtro de "só grava se der número" apagaria.
 */

export const dynamic = "force-dynamic";

/**
 * Piso entre gravações da mesma prova.
 *
 * Dois diretores com o painel aberto são dois clientes pedindo snapshot no
 * mesmo minuto. Sem esta trava, o histórico dobraria de densidade a cada aba
 * aberta — e a densidade do registro passaria a depender de quantas pessoas
 * estavam olhando, o que não descreve nada sobre a prova.
 *
 * Memória por instância: uma segunda instância pode gravar em paralelo, e o
 * pior efeito disso é uma linha extra por minuto. A alternativa correta seria
 * um lock no banco, e ela custa mais do que o problema.
 */
const MIN_INTERVAL_MS = 45_000;

const lastWriteMs = new Map<string, number>();

export async function POST(
  _request: Request,
  context: { params: Promise<{ raceId: string }> },
): Promise<NextResponse> {
  const { raceId } = await context.params;
  const { t } = await getTranslator();

  if (!isUuid(raceId)) {
    return NextResponse.json({ error: t("errors.invalidRace") }, { status: 400 });
  }

  const supabase = await supabaseServer();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json(
      { error: t("errors.sessionExpired") },
      { status: 401 },
    );
  }

  const { data: podeEditar, error: permErro } = await supabase.rpc("can_edit_race", {
    p_race_id: raceId,
  });

  if (permErro || podeEditar !== true) {
    return NextResponse.json(
      { error: t("errors.forbidden") },
      { status: 403 },
    );
  }

  const previous = lastWriteMs.get(raceId) ?? 0;
  const now = Date.now();

  if (now - previous < MIN_INTERVAL_MS) {
    return NextResponse.json(
      { recorded: false, reason: "throttled" },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const snapshot = await buildLiveSnapshot(supabase, raceId);

    // Prova que não começou ou já acabou não produz série temporal: gravar
    // "insufficient_data" a cada minuto durante a madrugada só suja o registro.
    if (snapshot.race.status !== "live") {
      return NextResponse.json(
        { recorded: false, reason: "race_not_live" },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }

    lastWriteMs.set(raceId, now);

    const { error } = await supabaseAdmin().from("gap_snapshots").insert({
      race_id: raceId,
      lead_offset_m: snapshot.gap.leadOffsetM,
      sweep_offset_m: snapshot.gap.sweepOffsetM,
      gap_m: snapshot.gap.gapM,
      gap_seconds:
        snapshot.gap.gapSeconds === null ? null : Math.round(snapshot.gap.gapSeconds),
      sweep_speed_mps: snapshot.gap.sweepSpeedMps,
      method: snapshot.gap.stale ? `${snapshot.gap.method}_stale` : snapshot.gap.method,
    });

    if (error) {
      // Solta a trava: a próxima tentativa não deve esperar 45 s por causa de
      // uma falha que não gravou nada.
      lastWriteMs.set(raceId, previous);
      return NextResponse.json(
        { recorded: false, error: error.message },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { recorded: true, method: snapshot.gap.method, gapSeconds: snapshot.gap.gapSeconds },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof LiveSnapshotError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[races/live/gap-snapshot] falha:", error);
    return NextResponse.json(
      { error: t("errors.db.saveFailed") },
      { status: 500 },
    );
  }
}
