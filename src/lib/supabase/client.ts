"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente do browser para o dashboard do diretor.
 *
 * Usa a chave anon e carrega a sessão do usuário autenticado, então tudo que
 * ele enxerga passa pelo RLS. É este cliente que abre as assinaturas de
 * Realtime — e como o Realtime respeita RLS, a mesma política que protege um
 * SELECT protege o fluxo ao vivo.
 *
 * Singleton de propósito: cada `createBrowserClient` abre seu próprio websocket
 * de Realtime, e um dashboard com quatro instâncias abriria quatro conexões
 * que competem entre si e estouram o limite do plano.
 */

let cached: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY precisam estar definidas.",
    );
  }

  cached = createBrowserClient(url, key, {
    realtime: {
      params: {
        // 10 eventos/s por conexão é folgado para ~15 veículos a 1 ping cada
        // 3 s, e evita que uma rajada de reconexão derrube o canal.
        eventsPerSecond: 10,
      },
    },
  });

  return cached;
}
