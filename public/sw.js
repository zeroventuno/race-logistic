/**
 * Service worker do app do motorista.
 *
 * O que ele existe para fazer: garantir que o app ABRE sem rede. O motorista
 * já vinculado, num vale sem sinal, precisa que a tela carregue — os pings
 * continuam sendo capturados e enfileirados pelo IndexedDB, e o alerta que ele
 * disparar entra na fila e sobe quando o sinal voltar. Um app que só mostra o
 * dinossauro do navegador perde tudo isso.
 *
 * O que ele DELIBERADAMENTE NÃO faz:
 *
 *  - NÃO cacheia nada de `/api/driver/*`. Uma resposta de estado servida do
 *    cache mostraria veículos onde eles não estão e alertas que já foram
 *    resolvidos. Pior que a tela vazia é a tela desatualizada com cara de
 *    atual.
 *
 *  - NÃO usa Background Sync para a fila. A fila é do app, vive no IndexedDB e
 *    é enviada pelo motor com o token da sessão. Duplicar essa lógica aqui
 *    criaria dois donos para o mesmo dado, e o modo de falha seria o pior
 *    possível: dois envios simultâneos do mesmo alerta com estados diferentes.
 *
 *  - NÃO cacheia o documento HTML de forma agressiva. O HTML referencia os
 *    chunks do Next por hash; servir um HTML velho com chunks novos (ou o
 *    contrário) produz uma tela branca no dia da prova. Rede primeiro, cache só
 *    como rede de segurança.
 */

/*
 * A versão precisa subir SEMPRE que o conteúdo do shell mudar de endereço ou
 * de forma. Ela é o que faz o `activate` apagar os caches antigos (ver o
 * filtro logo abaixo) — sem subir, o service worker continua servindo o shell
 * velho e o motorista fica preso numa versão anterior do app com a tela já
 * atualizada no servidor. Foi o que aconteceu quando `/motorista` virou
 * `/driver`: o shell cacheado apontava para uma rota que não existe mais.
 */
const VERSION = "v2";
const SHELL_CACHE = `flamme-rouge-shell-${VERSION}`;
const ASSET_CACHE = `flamme-rouge-assets-${VERSION}`;

const SHELL_URLS = ["/driver", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // `reload` para não pegar do cache HTTP uma versão que o navegador já
      // tinha guardada — na instalação queremos o que está no servidor agora.
      await Promise.allSettled(
        SHELL_URLS.map((url) => cache.add(new Request(url, { cache: "reload" }))),
      );
      // Sem `skipWaiting`, uma correção publicada no dia da prova só chegaria
      // ao motorista depois de ele fechar todas as abas — o que ele não vai
      // fazer no meio do percurso.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name !== SHELL_CACHE && name !== ASSET_CACHE)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Só o próprio domínio. Tiles de mapa vêm de CDN externa e são cacheados pelo
  // navegador; intermediar isso aqui só encheria a cota do dispositivo.
  if (url.origin !== self.location.origin) return;

  // A API nunca passa pelo cache. Ver o comentário do topo.
  if (url.pathname.startsWith("/api/")) return;

  // Assets do Next são imutáveis (nome com hash): cache-first é seguro e é o
  // que faz o app abrir instantaneamente sem rede.
  if (url.pathname.startsWith("/_next/static/") || isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    // Sem rede e sem cache: devolver um 504 explícito é melhor que deixar a
    // promessa rejeitar, porque o navegador mostra a própria tela de erro e o
    // motorista não distingue "asset faltando" de "app quebrado".
    return new Response("", { status: 504, statusText: "Sem conexão" });
  }
}

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = (await cache.match(request)) || (await cache.match("/driver"));
    if (cached) return cached;
    return new Response(
      "<!doctype html><meta charset=utf-8><title>Sem conexão</title>" +
        "<body style=\"background:#0a0c10;color:#e8ecf2;font-family:system-ui;padding:2rem\">" +
        "<h1>Sem conexão</h1><p>Reabra o app quando houver sinal.</p></body>",
      { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }
}

function isStaticAsset(pathname) {
  return /\.(?:js|css|png|jpg|jpeg|svg|webp|woff2?|ico|webmanifest)$/.test(pathname);
}
