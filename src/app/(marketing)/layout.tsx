import type { Metadata } from "next";

import { Movimento } from "@/components/marketing/Movimento";
import { DEFAULT_TIMEZONE } from "@/app/(director)/_lib/timezone";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale, getTranslator } from "@/lib/i18n/server";

import "./marketing.css";

/**
 * Casca da landing.
 *
 * O grupo de rotas existe para isolar o tema: `globals.css` pinta o app
 * inteiro de escuro, e as duas regras de `:has(.fr-landing)` em
 * `marketing.css` trocam isso apenas onde esta casca estiver montada. Nenhum
 * arquivo compartilhado precisou ser editado — o painel e o app do motorista
 * continuam exatamente como estavam.
 *
 * O `I18nProvider` daqui não serve às seções — elas são componentes de
 * servidor e recebem o tradutor por propriedade. Ele existe para o seletor de
 * idioma do cabeçalho, que é a única peça de cliente da página. O fuso é o
 * padrão porque nada aqui mostra hora.
 */

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getTranslator();

  return {
    title: t("landing.meta.title"),
    description: t("landing.meta.description"),
    openGraph: {
      title: t("landing.meta.ogTitle"),
      description: t("landing.meta.ogDescription"),
      type: "website",
      // O Open Graph quer `pt_BR`, não `pt-BR`.
      locale: locale.replace("-", "_"),
    },
  };
}

export default async function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    <I18nProvider locale={locale} timeZone={DEFAULT_TIMEZONE}>
      <div className="fr-landing">
        {children}
        <Movimento />
      </div>
    </I18nProvider>
  );
}
