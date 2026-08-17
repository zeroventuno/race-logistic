import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * As rotas em português que viraram inglês.
   *
   * `/motorista` era a única palavra em português na cadeia do app do
   * motorista — o resto (`/api/driver`, os componentes, o namespace dos
   * dicionários) já dizia `driver`. Num produto que fala seis línguas, o
   * endereço que o motorista italiano digita do papel não pode ser a única
   * coisa em português da tela dele.
   *
   * O redirecionamento fica PARA SEMPRE, e não é zelo excessivo: este endereço
   * sai impresso na folha de códigos do briefing. Uma folha guardada de uma
   * prova anterior, um celular que instalou o app antigo, um link colado num
   * grupo de mensagem — nenhum deles pode cair em 404 no dia da prova. É uma
   * linha de configuração contra um modo de falha que só aparece na estrada.
   *
   * `permanent: true` porque a mudança é definitiva: 308, e o navegador guarda.
   */
  async redirects() {
    return [
      { source: "/motorista", destination: "/driver", permanent: true },
      { source: "/cadastro", destination: "/signup", permanent: true },
    ];
  },
  // O service worker do app do motorista precisa de escopo raiz e nunca deve
  // ser cacheado agressivamente — senão um motorista fica preso numa versão
  // antiga no dia da prova.
  //
  // AVISO PARA QUEM FOR ARRUMAR O `manifest.webmanifest`: o `"id"` dele ainda
  // é `/motorista`, e continua assim de propósito. O `id` é a IDENTIDADE do
  // aplicativo instalado, não uma rota — trocá-lo faz o navegador entender que
  // é outro app, e o que já está no celular do motorista para de receber
  // atualização e ganha um ícone duplicado ao lado. Como o manifesto é JSON e
  // não aceita comentário, o recado mora aqui.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
      },
    ];
  },
};

export default nextConfig;
