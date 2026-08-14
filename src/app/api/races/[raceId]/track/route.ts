import { NextResponse, type NextRequest } from "next/server";

import { mensagemDeErroDoBanco } from "@/app/(director)/_lib/db-errors";
import { isUuid } from "@/app/(director)/_lib/session";
import {
  MAX_DRAWN_POINTS,
  RENDER_POINT_BUDGET,
  compactRenderPoints,
  compactTrackPoints,
  fromWirePoints,
  validateWirePoints,
  type TrackUploadResult,
} from "@/app/(director)/_lib/track-payload";
import { simplifyToBudget } from "@/lib/geo/simplify";
import { invalidateRouteCache } from "@/lib/route/store";
import { RouteTrackError, buildRouteTrack } from "@/lib/route/track";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Gravação do percurso da prova.
 *
 * É um Route Handler e não uma Server Action por causa do tamanho: uma Server
 * Action tem teto de corpo de 1 MB por padrão, e um GPX de prova longa
 * atravessa isso com folga. Aqui o corpo é lido normalmente.
 *
 * A escrita respeita `route_tracks_one_active_per_race`, o índice único parcial
 * que garante um percurso ativo por prova. Como o Postgres o avalia na hora do
 * INSERT, o antigo precisa ser desmarcado ANTES — e se o INSERT falhar depois
 * disso, a prova ficaria sem percurso nenhum, que é pior do que estava. Por
 * isso a reativação de compensação no `catch`: sem transação real do lado do
 * PostgREST, é ela que impede o estado intermediário de sobreviver ao erro.
 */

/** Acima disso o corpo nem é lido: é erro de seleção de arquivo, não percurso. */
const MAX_BODY_BYTES = 30 * 1024 * 1024;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ raceId: string }> },
) {
  const { raceId } = await context.params;

  if (!isUuid(raceId)) {
    return erro(400, "Prova inválida.");
  }

  const declarado = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declarado) && declarado > MAX_BODY_BYTES) {
    return erro(
      413,
      "O percurso enviado é grande demais. Recorte o arquivo para o trecho da prova.",
    );
  }

  const supabase = await supabaseServer();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return erro(401, "Sua sessão expirou. Entre novamente.");
  }

  const { data: podeEditar, error: permErro } = await supabase.rpc(
    "can_edit_race",
    { p_race_id: raceId },
  );
  if (permErro || podeEditar !== true) {
    return erro(403, "Você não tem permissão para alterar esta prova.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return erro(400, "Corpo da requisição ilegível.");
  }

  const payload = body as Record<string, unknown> | null;
  const source = payload?.source;
  if (source !== "gpx" && source !== "drawn") {
    return erro(400, "Origem do percurso desconhecida.");
  }

  const validacao = validateWirePoints(payload?.points);
  if (!validacao.ok || !validacao.points) {
    return erro(400, validacao.error ?? "Pontos do percurso inválidos.");
  }

  if (source === "drawn" && validacao.points.length > MAX_DRAWN_POINTS) {
    return erro(
      400,
      `Um percurso desenhado à mão não deveria ter mais de ${MAX_DRAWN_POINTS.toLocaleString("pt-BR")} vértices.`,
    );
  }

  // Reconstrução no servidor: o número que vai para o banco sai deste código,
  // não do que o browser calculou. Ver `_lib/track-payload.ts`.
  let construido;
  try {
    construido = buildRouteTrack(fromWirePoints(validacao.points));
  } catch (e) {
    if (e instanceof RouteTrackError) return erro(400, e.message);
    return erro(400, "Não foi possível montar o percurso com esses pontos.");
  }

  const { track, warnings } = construido;

  const simplificado = simplifyToBudget(
    track.points.map(([lng, lat]) => ({ lat, lng })),
    RENDER_POINT_BUDGET,
  );

  const nome = textoCurto(payload?.name, 200);
  const arquivo = textoCurto(payload?.originalFilename, 255);

  // 1. Qual é o percurso ativo hoje — guardado para poder voltar atrás.
  const { data: anterior } = await supabase
    .from("route_tracks")
    .select("id")
    .eq("race_id", raceId)
    .eq("is_active", true)
    .maybeSingle();

  const anteriorId = (anterior?.id as string | undefined) ?? null;

  // 2. Desmarca ANTES do insert — a ordem inversa violaria o índice parcial.
  if (anteriorId) {
    const { error } = await supabase
      .from("route_tracks")
      .update({ is_active: false })
      .eq("id", anteriorId);

    if (error) {
      return erro(
        409,
        mensagemDeErroDoBanco(
          error,
          "Não foi possível liberar o percurso anterior. Recarregue a página e tente de novo.",
        ),
      );
    }
  }

  // 3. Insere o novo já ativo.
  const { data: novo, error: insertErro } = await supabase
    .from("route_tracks")
    .insert({
      race_id: raceId,
      name: nome,
      source,
      original_filename: source === "gpx" ? arquivo : null,
      total_distance_m: track.totalDistanceM,
      point_count: track.points.length,
      elevation_gain_m: track.elevationGainM,
      bbox: track.bbox,
      points: compactTrackPoints(track.points),
      render_points: compactRenderPoints(simplificado.points),
      is_active: true,
    })
    .select("id")
    .single();

  if (insertErro || !novo) {
    // Compensação: sem o percurso novo, o antigo tem que voltar a valer.
    if (anteriorId) {
      await supabase
        .from("route_tracks")
        .update({ is_active: true })
        .eq("id", anteriorId);
    }
    return erro(
      500,
      mensagemDeErroDoBanco(
        insertErro,
        "Não foi possível gravar o percurso. O percurso anterior continua valendo.",
      ),
    );
  }

  // O app do motorista e a ingestão de pings leem o percurso de um cache em
  // memória por instância. Sem isto, um veículo continuaria sendo ancorado no
  // traçado velho até o cache expirar sozinho.
  invalidateRouteCache(raceId);

  const resultado: TrackUploadResult = {
    trackId: novo.id as string,
    totalDistanceM: track.totalDistanceM,
    pointCount: track.points.length,
    renderPointCount: simplificado.points.length,
    elevationGainM: track.elevationGainM,
    replacedTrackId: anteriorId,
    warnings,
  };

  return NextResponse.json(resultado, { status: 201 });
}

function erro(status: number, mensagem: string) {
  return NextResponse.json({ error: mensagem }, { status });
}

function textoCurto(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t ? t.slice(0, max) : null;
}
