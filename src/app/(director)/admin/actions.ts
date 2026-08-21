"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ehAdministrador } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { requireUser } from "../_lib/session";

/**
 * Ações do painel do dono.
 *
 * EM PORTUGUÊS, FORA DO SISTEMA DE IDIOMAS, e de propósito. O produto fala seis
 * línguas porque os motoristas de uma prova vêm de países diferentes; este
 * painel tem exatamente um leitor. Passar cada frase daqui pelos seis
 * dicionários custaria o mesmo que traduzir a tela do motorista e não serviria
 * a ninguém — e o tipo `Dictionary` existe para garantir que as telas do
 * produto nunca fiquem sem tradução, não para taxar ferramenta interna.
 *
 * A CHECAGEM DE ADMIN É REFEITA AQUI. A página já barra quem não é dono, mas
 * página não é fronteira de segurança: uma ação de servidor é um endpoint, e
 * qualquer pessoa autenticada pode chamá-la direto. Confiar na tela seria o
 * mesmo erro de esconder o botão "nova prova" e achar que a cota está imposta.
 */

const esquema = z.object({
  userId: z.string().uuid("Identificador inválido."),
  cota: z
    .number()
    .int("A cota precisa ser um número inteiro.")
    .min(0, "A cota não pode ser negativa.")
    .max(999, "Cota máxima: 999."),
});

export interface ResultadoCota {
  erro?: string;
  ok?: boolean;
}

export async function definirCota(
  userId: string,
  cota: number,
): Promise<ResultadoCota> {
  const { user } = await requireUser();

  if (!ehAdministrador(user.email)) {
    return { erro: "Sem permissão." };
  }

  const parsed = esquema.safeParse({ userId, cota });
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Valor inválido." };
  }

  const { error } = await supabaseAdmin()
    .from("profiles")
    .update({ race_quota: parsed.data.cota })
    .eq("id", parsed.data.userId);

  if (error) return { erro: error.message };

  revalidatePath("/admin");
  return { ok: true };
}
