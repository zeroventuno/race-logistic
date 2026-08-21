import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Analytics } from "@vercel/analytics/next";

import { getLocale, getTranslator } from "@/lib/i18n/server";
import { TEMA_COOKIE, temaDoCookie } from "@/lib/tema";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { ...METADATA_BASE, title: t("landing.meta.title"), description: t("landing.meta.description") };
}

/**
 * O endereço absoluto do site, para o Open Graph e o canônico.
 *
 * Sem `metadataBase`, o Next resolve as URLs de compartilhamento contra
 * `localhost` e avisa no build — o resultado é um link colado num grupo de
 * mensagem que não mostra nem imagem nem título. Vem da variável de ambiente
 * e não escrito à mão, para que a pré-visualização da Vercel aponte para si
 * mesma em vez de para produção.
 */
const ENDERECO_BASE =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

const METADATA_BASE: Metadata = {
  ...(ENDERECO_BASE ? { metadataBase: new URL(ENDERECO_BASE) } : {}),
  manifest: "/manifest.webmanifest",
  // SVG primeiro: a bandeirola é geometria sólida e fica nítida em qualquer
  // densidade de tela. O PNG de 32 px é a rede para navegadores que ainda não
  // aceitam favicon vetorial.
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    // Nome curto: o iOS trunca sem dó abaixo do ícone.
    title: "Flamme",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0c10",
  width: "device-width",
  initialScale: 1,
  // Zoom continua permitido: acessibilidade vale mais que o layout ficar
  // perfeito, inclusive num app operacional.
  maximumScale: 5,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // O tema é estampado no servidor, antes do primeiro byte. Resolver isso no
  // cliente faria a tela piscar clara antes de escurecer — agressivo numa sala
  // de direção às escuras, e um sintoma clássico de app mal terminado.
  const tema = temaDoCookie((await cookies()).get(TEMA_COOKIE)?.value);

  // O `lang` acompanha o idioma negociado, e não é detalhe de conformidade: é
  // ele que faz o leitor de tela pronunciar o texto italiano com voz italiana
  // em vez de soletrar italiano com fonemas portugueses. Também é o que separa
  // as seis versões da landing para um buscador.
  const locale = await getLocale();

  return (
    <html lang={locale} data-theme={tema === "system" ? undefined : tema}>
      <body className="min-h-full antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
