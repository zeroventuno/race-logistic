"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { AuthState } from "@/app/login/actions";
import { getTranslator } from "@/lib/i18n/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Grava a senha nova.
 *
 * EXIGE SESSÃO, e é ela que autoriza a troca. Duas portas levam aqui: o link
 * de recuperação, que o `/auth/callback` já trocou por sessão, e o diretor
 * autenticado que quer só trocar a senha. As duas chegam do mesmo jeito, então
 * o código é um só.
 *
 * NÃO PEDE A SENHA ATUAL. Para quem veio da recuperação seria impossível — é
 * justamente o que ela não tem. Pedir só de quem está logado partiria o
 * formulário em dois por um ganho pequeno: quem tem a sessão do navegador já
 * pode fazer tudo o que a conta faz. O que protege de verdade aqui é o link
 * ser de uso único e expirar, e isso o Supabase garante.
 */
export async function definirSenha(
  _estado: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { t } = await getTranslator();

  const supabase = await supabaseServer();
  const { data: sessao } = await supabase.auth.getUser();

  if (!sessao.user) {
    return { erro: t("auth.recoverExpired") };
  }

  const senha = String(formData.get("senha") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");

  const parsed = z
    .string()
    .min(1, t("auth.passwordRequired"))
    .min(8, t("auth.passwordTooShort"))
    .max(72, t("auth.passwordTooLong"))
    .safeParse(senha);

  if (!parsed.success) {
    return { campos: { senha: parsed.error.issues[0]?.message } };
  }

  if (senha !== confirmacao) {
    return { campos: { senha: t("auth.passwordMismatch") } };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data });

  if (error) {
    return { erro: t("auth.recoverExpired") };
  }

  redirect("/dashboard?senha=1");
}
