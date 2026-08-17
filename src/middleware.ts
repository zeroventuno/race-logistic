import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Renova a sessão do diretor a cada navegação.
 *
 * Sem isso, o token do Supabase expira em uma hora e o diretor é deslogado no
 * meio da prova — o pior momento concebível. O middleware é o único lugar que
 * consegue escrever cookies de forma confiável no App Router, então é aqui que
 * a renovação acontece.
 *
 * As rotas do motorista (`/driver`, `/api/driver/*`) são deliberadamente
 * ignoradas: elas não usam sessão do Supabase, e sim o token opaco do
 * dispositivo. Passar por aqui só gastaria uma ida ao servidor de auth a cada
 * ping de GPS.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // `getUser` (e não `getSession`) porque só ele valida o token contra o
  // servidor de auth. `getSession` confia no cookie, que o cliente controla.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Tudo, menos:
     *  - assets estáticos e imagens otimizadas
     *  - o app do motorista e sua API (autenticação própria, por token)
     *  - o service worker e o manifest
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|motorista|api/driver|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
