import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente com service_role — ignora RLS.
 *
 * Só existe para os Route Handlers que atendem o app do motorista, que não tem
 * conta nem credencial de banco. Toda rota que usa este cliente é responsável
 * por validar o token de sessão do dispositivo ANTES de tocar em qualquer
 * coisa, e por restringir a escrita à posição daquele token.
 *
 * O `import "server-only"` faz o build quebrar se este módulo for importado
 * por engano num componente de cliente — que é exatamente como uma chave
 * service_role vaza para o browser na vida real.
 */

let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar definidas.",
    );
  }

  cached = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "x-application-name": "flamme-rouge-server" },
    },
  });

  return cached;
}
