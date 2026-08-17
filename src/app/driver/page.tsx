import type { Metadata } from "next";

import { DriverApp } from "@/components/driver/DriverApp";
import { getTranslator } from "@/lib/i18n/server";

/**
 * Rota do app do motorista.
 *
 * Server Component fino de propósito: a única coisa que ele faz é negociar o
 * idioma a partir do `Accept-Language` do aparelho (ou do cookie, se a pessoa
 * já escolheu) e entregar isso ao app cliente. Tudo o mais é cliente, porque
 * tudo o mais depende de GPS, IndexedDB e `localStorage`.
 *
 * `dynamic = "force-dynamic"` porque a negociação de idioma lê cabeçalhos: um
 * HTML estático serviria a língua errada para metade dos motoristas de uma
 * prova internacional, que é exatamente o problema que o desenho sem prefixo de
 * idioma na URL existe para resolver.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();

  return {
    title: `${t("meta.appName")} — ${t("driver.transmitting")}`,
    description: t("driver.bindSubtitle"),
    manifest: "/manifest.webmanifest",
  };
}

export default async function MotoristaPage() {
  const { locale } = await getTranslator();

  return <DriverApp locale={locale} />;
}
