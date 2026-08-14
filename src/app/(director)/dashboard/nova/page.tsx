import Link from "next/link";

import { criarProva } from "@/app/(director)/_actions/race";
import { DEFAULT_TIMEZONE } from "@/app/(director)/_lib/timezone";
import { ProvaForm } from "@/components/director/ProvaForm";
import { Cartao } from "@/components/director/ui";
import { getTranslator } from "@/lib/i18n/server";

export const metadata = { title: "Flamme Rouge" };

export default async function NovaProvaPage() {
  const { t } = await getTranslator();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href="/dashboard"
        className="text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
      >
        ← {t("director.myRaces")}
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
        {t("director.newRace")}
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        {/* i18n: precisa de chave — "Só o essencial agora…" */}
        Só o essencial agora. Percurso e posições vêm nos próximos passos e
        podem ser mexidos até a hora da largada.
      </p>

      <Cartao className="mt-6 p-5 sm:p-6">
        <ProvaForm
          acao={criarProva}
          modo="criar"
          /* i18n: precisa de chave — "Criar prova e ir para o percurso" */
          rotulo="Criar prova e ir para o percurso"
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
