import Link from "next/link";
import { cookies } from "next/headers";

import { sair } from "@/app/login/actions";
import { TemaBotao, temaDoCookie } from "@/components/TemaBotao";
import { I18nProvider } from "@/lib/i18n/client";
import { getTranslator } from "@/lib/i18n/server";

import { requireUser } from "./_lib/session";
import { DEFAULT_TIMEZONE } from "./_lib/timezone";

/**
 * Casca de todas as telas da direção.
 *
 * A checagem de sessão fica aqui, e não no middleware: o middleware renova o
 * token mas não conhece as rotas do diretor, e espalhar `redirect("/login")`
 * por cada página é como esquecer um cadeado aberto — funciona até alguém
 * acrescentar uma página nova e não copiar a linha.
 *
 * O `I18nProvider` daqui usa o fuso padrão porque neste nível ainda não existe
 * prova nenhuma. Dentro de `[raceId]` ele é remontado com o fuso do evento, e o
 * provedor mais interno é o que vale — assim nenhum horário de prova aparece no
 * relógio do servidor por acidente.
 */
export default async function DirectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireUser();
  const { locale, t } = await getTranslator();
  const tema = temaDoCookie((await cookies()).get("race_theme")?.value);

  const nome =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    t("common.unknown");

  return (
    <I18nProvider locale={locale} timeZone={DEFAULT_TIMEZONE}>
      <div className="flex min-h-screen flex-col">
        {/* `print:hidden`: a casca do aplicativo não vai para o papel. A única
            tela que se imprime aqui é o painel de códigos. */}
        <header className="sticky top-0 z-30 border-b border-border bg-surface-0/95 backdrop-blur print:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link
              href="/dashboard"
              className="font-mono text-xs uppercase tracking-[0.2em] text-ink-faint transition hover:text-ink"
            >
              {t("meta.appName")}
            </Link>

            <div className="flex items-center gap-3">
              <span
                className="hidden text-sm text-ink-muted sm:inline"
                title={user.email ?? undefined}
              >
                {nome}
              </span>
              <TemaBotao inicial={tema} />
              <form action={sair}>
                <button
                  type="submit"
                  className="min-h-9 rounded-lg border border-border px-3 text-sm text-ink-muted transition hover:border-border-strong hover:text-ink"
                >
                  {/* i18n: precisa de chave — "Sair" (logout) */}
                  Sair
                </button>
              </form>
            </div>
          </div>
        </header>

        <div className="flex-1">{children}</div>
      </div>
    </I18nProvider>
  );
}
