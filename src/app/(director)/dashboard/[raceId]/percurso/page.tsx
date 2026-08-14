import {
  PercursoEditor,
  type TrackAtual,
} from "@/components/director/PercursoEditor";
import { Aviso } from "@/components/director/ui";
import { getTranslator } from "@/lib/i18n/server";

import { getRaceContext } from "../../../_lib/session";

export default async function PercursoPage({
  params,
}: {
  params: Promise<{ raceId: string }>;
}) {
  const { raceId } = await params;
  const { supabase, race, activeTrack, canEdit } = await getRaceContext(raceId);
  const { t } = await getTranslator();

  // `render_points` só é buscado aqui: são até 3 000 vértices, e carregá-los no
  // contexto compartilhado faria a tela de posições pagar por um dado que ela
  // não desenha.
  let trackAtual: TrackAtual | null = null;

  if (activeTrack) {
    const { data } = await supabase
      .from("route_tracks")
      .select("render_points")
      .eq("id", activeTrack.id)
      .maybeSingle();

    trackAtual = {
      id: activeTrack.id,
      name: activeTrack.name,
      source: activeTrack.source,
      originalFilename: activeTrack.original_filename,
      totalDistanceM: activeTrack.total_distance_m,
      pointCount: activeTrack.point_count,
      elevationGainM: activeTrack.elevation_gain_m,
      createdAt: activeTrack.created_at,
      renderPoints: ((data?.render_points ?? []) as [number, number][]) ?? [],
    };
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="titulo text-2xl font-semibold text-ink">
          {t("race.route")}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-muted">
          {/* i18n: precisa de chave — explicação de para que serve o percurso */}
          É o traçado que transforma a coordenada de GPS de cada veículo em
          &ldquo;quilômetro 42 da prova&rdquo;. Sem ele não há cálculo de janela
          entre abertura e vassoura, nem sugestão de apoio mais próximo pela
          estrada.
        </p>
      </header>

      {canEdit ? (
        <PercursoEditor raceId={race.id} trackAtual={trackAtual} />
      ) : (
        /* i18n: precisa de chave — aviso de acesso somente leitura */
        <Aviso tone="warn" titulo="Somente leitura">
          Você participa desta prova como observador e não pode alterar o
          percurso.
        </Aviso>
      )}
    </main>
  );
}
