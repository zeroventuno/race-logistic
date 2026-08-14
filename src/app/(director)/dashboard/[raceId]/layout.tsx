import Link from "next/link";

import { RaceNav } from "@/components/director/RaceNav";
import { Selo } from "@/components/director/ui";
import { I18nProvider } from "@/lib/i18n/client";
import { formatDateTime } from "@/lib/i18n/format";
import { getTranslator } from "@/lib/i18n/server";

import { RACE_STATUS_TONE } from "../../_lib/format";
import { getRaceContext } from "../../_lib/session";

export default async function RaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ raceId: string }>;
}) {
  const { raceId } = await params;
  const { race, readiness, positions } = await getRaceContext(raceId);
  const { locale, t } = await getTranslator();

  const itemFeito = (key: string) =>
    readiness.items.find((i) => i.key === key)?.done ?? false;

  return (
    // Fuso da PROVA, não o do servidor nem o do aparelho: duas pessoas em
    // países diferentes olhando esta tela precisam ler o mesmo horário.
    <I18nProvider locale={locale} timeZone={race.timezone}>
      <div>
        <div className="border-b border-border bg-surface-1 print:hidden">
          <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
            <Link
              href="/dashboard"
              className="text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
            >
              ← {t("director.myRaces")}
            </Link>

            <div className="mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                  {race.name}
                </h1>
                <p className="mt-1 text-sm text-ink-muted">
                  {race.location ? `${race.location} · ` : ""}
                  <span className="tnum">
                    {race.scheduled_start
                      ? formatDateTime(
                          race.scheduled_start,
                          locale,
                          race.timezone,
                        )
                      : /* i18n: precisa de chave — "Sem horário de largada" */
                        "Sem horário de largada"}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Selo tone={RACE_STATUS_TONE[race.status]}>
                  {t(`race.status.${race.status}`)}
                </Selo>
                {readiness.ready ? (
                  <Selo tone="ok">✓ {t("director.ready")}</Selo>
                ) : (
                  <Selo tone="warn">
                    {/* i18n: precisa de chave — "{count} pendência(s)" */}
                    <span className="tnum">{readiness.blocking.length}</span>{" "}
                    {readiness.blocking.length === 1
                      ? "pendência"
                      : "pendências"}
                  </Selo>
                )}
              </div>
            </div>

            <div className="mt-5 border-b border-border">
              <RaceNav
                raceId={race.id}
                itens={[
                  {
                    path: "",
                    /* i18n: precisa de chave — "Resumo" (aba de visão geral) */
                    label: "Resumo",
                    done: null,
                  },
                  {
                    path: "percurso",
                    label: t("race.route"),
                    done: itemFeito("route"),
                  },
                  {
                    path: "posicoes",
                    label: `${t("race.positions")}${
                      positions.length ? ` (${positions.length})` : ""
                    }`,
                    done:
                      itemFeito("positions") &&
                      itemFeito("lead") &&
                      itemFeito("sweep"),
                  },
                ]}
              />
            </div>
          </div>
        </div>

        {children}
      </div>
    </I18nProvider>
  );
}
