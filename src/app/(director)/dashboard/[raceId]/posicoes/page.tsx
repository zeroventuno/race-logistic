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
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          {t("positions.title")}
        </h1>
        {/* i18n: precisa de chave — explicação de como o motorista entra pelo código */}
        <p className="mt-1 max-w-3xl text-sm text-ink-muted">
          Cada veículo de apoio da prova vira uma posição com código próprio. O
          motorista digita o código no celular dele — sem instalar aplicativo,
          sem criar conta — e a partir daí o aparelho transmite a posição
          daquele veículo.
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
