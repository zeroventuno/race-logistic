import { Aviso } from "@/components/director/ui";
import { getTranslator } from "@/lib/i18n/server";
import { loadRaceRoute } from "@/lib/route/store";
import { positionAtOffset } from "@/lib/route/track";

import { getRaceContext } from "../../../_lib/session";
import { EditorDeBloqueios, type PontoNaTela } from "./Editor";

export const dynamic = "force-dynamic";

/**
 * A tela mais curta do sistema, e a que produz a linha mais valiosa do
 * relatório final.
 *
 * A lista que vale é a que o organizador já entregou à prefeitura para pedir a
 * autorização: quais cruzamentos serão bloqueados e com quantos fiscais. Aqui
 * ele reencontra essa lista — semeada do OpenStreetMap, podada por ele — e o
 * relatório a devolve preenchida com horários reais.
 */
export default async function BloqueiosPage({
  params,
}: {
  params: Promise<{ raceId: string }>;
}) {
  const { raceId } = await params;
  const { supabase, race, activeTrack, canEdit } = await getRaceContext(raceId);
  const { t } = await getTranslator();

  const { data } = await supabase
    .from("route_blockpoints")
    .select("id, offset_m, name, source, active")
    .eq("race_id", raceId)
    .order("offset_m");

  /*
   * A GEOMETRIA VEM PARA CÁ, e as coordenadas de cada ponto saem daqui.
   *
   * O ponto é guardado como quilômetro ao longo da rota, que é a forma certa
   * de guardar — sobrevive a uma troca de percurso e é o que liga o ponto ao
   * rastro dos veículos. Mas quilômetro não se desenha num mapa: para isso
   * cada um precisa virar coordenada, e a conversão é do servidor, que já tem
   * o traçado carregado e em cache.
   */
  const rota = await loadRaceRoute(raceId);

  const pontos: PontoNaTela[] = (
    (data ?? []) as {
      id: string;
      offset_m: number | string;
      name: string | null;
      source: string;
      active: boolean;
    }[]
  ).map((p) => {
    const offsetM = Number(p.offset_m);
    const em = rota ? positionAtOffset(rota.track, offsetM % rota.track.totalDistanceM) : null;

    return {
      id: p.id,
      offsetM,
      nome: p.name,
      detectado: p.source === "detected",
      ativo: p.active,
      lat: em?.lat ?? null,
      lng: em?.lng ?? null,
    };
  });

  const distanciaM = (race.laps ?? 1) * (activeTrack?.total_distance_m ?? 0);

  // `render_points` é buscado só aqui, como na tela de percurso: são centenas
  // de pares, e carregá-los no contexto compartilhado faria outras telas
  // pagarem por um dado que não desenham.
  const { data: geometria } = activeTrack
    ? await supabase
        .from("route_tracks")
        .select("render_points")
        .eq("id", activeTrack.id)
        .maybeSingle()
    : { data: null };

  const activeTrackRenderPoints = (geometria as { render_points?: unknown } | null)
    ?.render_points;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="titulo text-2xl font-semibold text-ink">
          {t("blockpoints.title")}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          {t("blockpoints.lead")}
        </p>
      </header>

      {!activeTrack ? (
        <Aviso tone="warn" titulo={t("blockpoints.title")}>
          {t("blockpoints.noRoute")}
        </Aviso>
      ) : canEdit ? (
        <EditorDeBloqueios
          raceId={race.id}
          pontos={pontos}
          distanciaM={distanciaM}
          rota={(activeTrackRenderPoints ?? []) as [number, number][]}
          basemap={race.map_basemap}
        />
      ) : (
        <Aviso tone="warn" titulo={t("director.readOnly")}>
          {t("director.readOnlyRoute")}
        </Aviso>
      )}
    </main>
  );
}
