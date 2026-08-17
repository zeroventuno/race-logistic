import Link from "next/link";
import { cookies } from "next/headers";

import { sair } from "@/app/login/actions";
import { Creditos } from "@/components/Creditos";
import { ForaDoAoVivo } from "@/components/director/ForaDoAoVivo";
import { Letreiro } from "@/components/Letreiro";
import { SeletorIdioma } from "@/components/SeletorIdioma";
import { TemaBotao } from "@/components/TemaBotao";
import { TEMA_COOKIE, temaDoCookie } from "@/lib/tema";
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
  const tema = temaDoCookie((await cookies()).get(TEMA_COOKIE)?.value);

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
              className="text-ink-faint transition hover:text-ink"
              aria-label={t("meta.appName")}
            >
              <Letreiro size={13} />
            </Link>

            <div className="flex items-center gap-3">
              <span
                className="hidden text-sm text-ink-muted sm:inline"
                title={user.email ?? undefined}
              >
                {nome}
              </span>
              <SeletorIdioma />
              <TemaBotao inicial={tema} />
              <form action={sair}>
                <button
                  type="submit"
                  className="min-h-9 border border-border px-3 text-sm text-ink-muted transition hover:border-border-strong hover:text-ink"
                >
                  {/* i18n: precisa de chave — "Sair" (logout) */}
                  Sair
                </button>
              </form>
            </div>
          </div>
        </header>

        {/* Coluna flex, e não um bloco solto: a tela Ao vivo precisa que a
            altura desça por toda a cadeia até o mapa. Para as outras páginas
            não muda nada — elas não pedem altura, então crescem pelo
            conteúdo, como antes. */}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>

        {/* Na tela Ao vivo o rodapé sai: o mapa ocupa a viewport inteira e
            qualquer faixa aqui embaixo roubaria altura dele. Lá o crédito
            entra na faixa de referência que já existe no pé do mapa. */}
        <ForaDoAoVivo>
          <footer className="border-t border-border px-4 py-4 sm:px-6 print:hidden">
            <div className="mx-auto max-w-[73.75rem]">
              <Creditos />
            </div>
          </footer>
        </ForaDoAoVivo>
      </div>
    </I18nProvider>
  );
}
