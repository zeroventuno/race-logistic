import { Aviso } from "@/components/director/ui";
import { getTranslator } from "@/lib/i18n/server";
import { loadRaceRoute } from "@/lib/route/store";
import { positionAtOffset } from "@/lib/route/track";

import { getRaceContext } from "../../../_lib/session";
import { EditorDeBloqueios, type PontoNaTela } from "./Editor";

export const dynamic = "force-dynamic";

/** Um ponto do traçado a cada ~80 m: fino o bastante para clicar em cima. */
const AMOSTRA_M = 80;

/** Teto de pontos que descem para o navegador. */
const MAX_PONTOS = 1600;

function trilhaComQuilometragem(
  carregada: Awaited<ReturnType<typeof loadRaceRoute>>,
): [number, number, number][] {
  if (!carregada) return [];

  const passo = Math.max(
    AMOSTRA_M,
    carregada.track.totalDistanceM / MAX_PONTOS,
  );

  const saida: [number, number, number][] = [];
  let proximo = 0;

  for (const [lng, lat, offset] of carregada.track.points) {
    if (offset >= proximo) {
      saida.push([lng, lat, offset]);
      proximo = offset + passo;
    }
  }

  const ultimo = carregada.track.points[carregada.track.points.length - 1];
  if (ultimo) saida.push([ultimo[0], ultimo[1], ultimo[2]]);

  return saida;
}

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
  const rotaCarregada = await loadRaceRoute(raceId);

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
    const em = rotaCarregada
      ? positionAtOffset(
          rotaCarregada.track,
          offsetM % rotaCarregada.track.totalDistanceM,
        )
      : null;

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

  /*
   * O TRAÇADO VAI COM QUILOMETRAGEM, e não só com coordenadas.
   *
   * Clicar no mapa para criar um ponto exige a conversão inversa: da
   * coordenada de volta para o quilômetro. Mandar `render_points` cru
   * obrigaria o navegador a refazer a soma de distâncias — e sobre uma
   * geometria já simplificada, o que daria um número parecido e errado.
   *
   * Cada terceiro elemento é a distância acumulada REAL, a mesma que o resto
   * do sistema usa. A amostragem é por distância porque um GPX grava denso na
   * cidade e esparso na estrada.
   */
  const rota = trilhaComQuilometragem(rotaCarregada);

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
          rota={rota}
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
