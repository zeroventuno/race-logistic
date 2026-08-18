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
      /*
       * A IMAGEM DO LINK COMPARTILHADO.
       *
       * É como este produto vai circular: um organizador cola o endereço num
       * grupo de mensagem ou num e-mail para a federação. Sem imagem, o link
       * chega como uma linha de texto cinza entre outras cinquenta.
       *
       * JPEG, e não AVIF ou WebP. O previsualizador do WhatsApp, do LinkedIn e
       * de metade dos clientes de e-mail ainda não lê formato novo — e uma
       * imagem de compartilhamento que não aparece é pior que uma pesada.
       * 52 KB é barato para a única impressão que esse link causa.
       *
       * A foto é a versão com a pista molhada: aqui ela é mostrada INTEIRA,
       * sem máscara nenhuma, e o alto contraste que a desqualificou no rodapé
       * é exatamente o que faz um cartão de link parar o olho.
       */
      images: [
        {
          url: "/marketing/og-1200.jpg",
          width: 1200,
          height: 630,
          alt: t("landing.meta.ogTitle"),
        },
      ],
    },

    // O Twitter/X ignora o Open Graph quando encontra as suas próprias tags, e
    // cai para um cartão pequeno sem imagem. Uma linha para não perder o
    // formato grande onde ele é lido.
    twitter: {
      card: "summary_large_image",
      title: t("landing.meta.ogTitle"),
      description: t("landing.meta.ogDescription"),
      images: ["/marketing/og-1200.jpg"],
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
