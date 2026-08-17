import { PosicoesPainel } from "@/components/director/PosicoesPainel";
import { getTranslator } from "@/lib/i18n/server";

import { getRaceContext } from "../../../_lib/session";

export default async function PosicoesPage({
  params,
}: {
  params: Promise<{ raceId: string }>;
}) {
  const { raceId } = await params;
  const { race, positions, canEdit } = await getRaceContext(raceId);
  const { t } = await getTranslator();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="titulo text-2xl font-semibold text-ink">
          {t("positions.title")}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-muted">
          {t("positions.intro")}
        </p>
      </header>

      <PosicoesPainel
        raceId={race.id}
        posicoes={positions}
        podeEditar={canEdit}
      />
    </main>
  );
}
