import { criarProva } from "@/app/(director)/_actions/race";
import { DEFAULT_TIMEZONE } from "@/app/(director)/_lib/timezone";
import { PassosDaProva } from "@/components/director/PassosDaProva";
import { ProvaForm } from "@/components/director/ProvaForm";
import { Cartao } from "@/components/director/ui";
import { getTranslator } from "@/lib/i18n/server";

export const metadata = { title: "Flamme Rouge" };

export default async function NovaProvaPage() {
  const { t } = await getTranslator();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <PassosDaProva atual={1} />

      <h1 className="titulo mt-7 text-3xl font-semibold text-ink">
        {t("director.newRace")}
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        {t("director.newRaceSubtitle")}
      </p>

      <Cartao className="mt-6 p-5 sm:p-6">
        <ProvaForm
          acao={criarProva}
          modo="criar"
          rotulo={t("director.createAndContinue")}
          valores={{
            nome: "",
            local: "",
            data: "",
            hora: "",
            fuso: DEFAULT_TIMEZONE,
            voltas: 1,
            janelaAlvo: 30,
            janelaMin: null,
            janelaMax: null,
          }}
        />
      </Cartao>
    </main>
  );
}
