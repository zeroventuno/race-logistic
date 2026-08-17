import { getTranslator } from "@/lib/i18n/server";
import { NextResponse } from "next/server";

import { isUuid } from "@/app/(director)/_lib/session";
import { supabaseServer } from "@/lib/supabase/server";

import { buildLiveSnapshot, LiveSnapshotError } from "./snapshot";

/**
 * Reconciliação do painel ao vivo.
 *
 * O painel assina `position_state`, `alerts` e `alert_confirmations` pelo
 * Realtime, que é o que dá reação instantânea. Este endpoint existe porque
 * REALTIME CAI SEM AVISAR: o WebSocket continua aberto, o `subscribe` continua
 * dizendo `SUBSCRIBED`, e simplesmente nenhum evento chega. Do lado de dentro
 * do browser isso é indistinguível de uma prova sem novidades — e um painel
 * congelado parecendo normal é pior que um painel que admite estar desconectado.
 *
 * Então a cada ~10 s o painel busca o estado inteiro daqui e SUBSTITUI o que
 * tem. Se esta chamada falhar, o indicador de saúde acusa, e o diretor sabe que
 * está olhando uma fotografia com hora marcada em vez do presente.
 *
 * `force-dynamic` porque a resposta é diferente a cada segundo e qualquer cache
 * intermediário aqui seria exatamente a mentira que o endpoint existe para
 * evitar.
 */

export const dynamic = "force-dynamic";

export async function GET(
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

  try {
    const snapshot = await buildLiveSnapshot(supabase, raceId);
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof LiveSnapshotError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }

    console.error("[races/live] falha ao montar o estado:", error);
    return NextResponse.json(
      { error: t("live.snapshotErrorTitle") },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
