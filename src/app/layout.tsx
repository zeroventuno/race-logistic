import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Flamme Rouge — direção de prova",
  description:
    "Gestão logística ao vivo para provas de ciclismo: posições de apoio, janela abertura↔fechamento e alertas.",
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
