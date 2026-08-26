import { Aviso } from "@/components/director/ui";
import { getTranslator } from "@/lib/i18n/server";

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

  const pontos: PontoNaTela[] = (
    (data ?? []) as {
      id: string;
      offset_m: number | string;
      name: string | null;
      source: string;
      active: boolean;
    }[]
  ).map((p) => ({
    id: p.id,
    offsetM: Number(p.offset_m),
    nome: p.name,
    detectado: p.source === "detected",
    ativo: p.active,
  }));

  const distanciaM = (race.laps ?? 1) * (activeTrack?.total_distance_m ?? 0);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
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
        />
      ) : (
        <Aviso tone="warn" titulo={t("director.readOnly")}>
          {t("director.readOnlyRoute")}
        </Aviso>
      )}
    </main>
  );
}
