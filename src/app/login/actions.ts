"use server";

import { headers } from "next/headers";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getTranslator } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translate";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Autenticação do diretor.
 *
 * Só e-mail e senha: no dia da prova o sinal de dados é ruim e um fluxo de
 * "link mágico" que depende de abrir o e-mail no celular é um jeito conhecido
 * de ficar de fora do próprio painel.
 *
 * As mensagens de erro do Supabase vêm em inglês e são genéricas de propósito
 * (para não revelar se um e-mail existe). Aqui elas viram frases no idioma da
 * pessoa que dizem o próximo passo — mantendo a mesma discrição.
 *
 * OS ESQUEMAS SÃO CONSTRUÍDOS POR CHAMADA, e não uma vez no módulo, porque a
 * mensagem de cada regra depende do idioma da requisição. Um esquema de módulo
 * congelaria o idioma de quem carregou o processo primeiro — em produção, o de
 * um estranho.
 */

export interface AuthState {
  erro?: string;
  aviso?: string;
  campos?: Partial<Record<"email" | "senha" | "nome", string>>;
  /** Devolvido para o formulário não apagar o que a pessoa já digitou. */
  valores?: { email?: string; nome?: string };
}

function esquemaEmail(t: Translator) {
  return z
    .string()
    .trim()
    .min(1, t("auth.emailRequired"))
    .email(t("auth.emailInvalid"));
}

function esquemaLogin(t: Translator) {
  return z.object({
    email: esquemaEmail(t),
    senha: z.string().min(1, t("auth.passwordRequired")),
  });
}

function esquemaCadastro(t: Translator) {
  return z.object({
    nome: z
      .string()
      .trim()
      .min(2, t("auth.nameRequired"))
      .max(80, t("auth.nameTooLong")),
    email: esquemaEmail(t),
    senha: z
      .string()
      .min(8, t("auth.passwordTooShort"))
      .max(72, t("auth.passwordTooLong")),
    confirmacao: z.string(),
  });
}

export async function entrar(
  _anterior: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { t } = await getTranslator();

  const bruto = {
    email: String(formData.get("email") ?? ""),
    senha: String(formData.get("senha") ?? ""),
  };

  const parsed = esquemaLogin(t).safeParse(bruto);
  if (!parsed.success) {
    return {
      campos: camposDeZod(parsed.error),
      valores: { email: bruto.email },
    };
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.senha,
  });

  if (error) {
    return {
      erro: traduzirErroDeAuth(error.message, error.code, t),
      valores: { email: parsed.data.email },
    };
  }

  redirect("/dashboard");
}

export async function cadastrar(
  _anterior: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { t } = await getTranslator();

  const bruto = {
    nome: String(formData.get("nome") ?? ""),
    email: String(formData.get("email") ?? ""),
    senha: String(formData.get("senha") ?? ""),
    confirmacao: String(formData.get("confirmacao") ?? ""),
  };

  const parsed = esquemaCadastro(t).safeParse(bruto);
  if (!parsed.success) {
    return {
      campos: camposDeZod(parsed.error),
      valores: { email: bruto.email, nome: bruto.nome },
    };
  }

  if (parsed.data.senha !== parsed.data.confirmacao) {
    return {
      campos: { senha: t("auth.passwordMismatch") },
      valores: { email: parsed.data.email, nome: parsed.data.nome },
    };
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.senha,
    options: {
      data: { full_name: parsed.data.nome },
      /*
       * PARA ONDE O LINK DO E-MAIL VOLTA.
       *
       * Sem isto o Supabase usa a "Site URL" configurada no painel dele, que
       * aponta para a raiz — e a raiz é a landing, que não sabe que uma
       * confirmação acabou de acontecer. A pessoa clicava no link e não recebia
       * sinal nenhum de sucesso.
       *
       * O endereço sai do CABEÇALHO DA REQUISIÇÃO, e não de variável de
       * ambiente: assim a pré-visualização da Vercel confirma contra si mesma e
       * o desenvolvimento local contra o localhost, sem ninguém configurar
       * nada. A variável fica como reserva para quando não houver cabeçalho.
       */
      emailRedirectTo: `${await enderecoDoSite()}/auth/callback`,
    },
  });

  if (error) {
    return {
      erro: traduzirErroDeAuth(error.message, error.code, t),
      valores: { email: parsed.data.email, nome: parsed.data.nome },
    };
  }

  // Com confirmação de e-mail ligada no projeto, `signUp` não devolve sessão —
  // a conta existe mas ainda não pode entrar. Dizer isso explicitamente evita o
  // beco sem saída de "cadastrei e não aconteceu nada".
  if (!data.session) {
    return {
      aviso: t("auth.confirmSent", { email: parsed.data.email }),
      valores: { email: parsed.data.email },
    };
  }

  redirect("/dashboard");
}

export async function sair(): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

function camposDeZod(
  error: z.ZodError,
): Partial<Record<"email" | "senha" | "nome", string>> {
  const saida: Partial<Record<"email" | "senha" | "nome", string>> = {};
  for (const issue of error.issues) {
    const campo = issue.path[0];
    if (campo === "email" || campo === "senha" || campo === "nome") {
      saida[campo] ??= issue.message;
    }
    if (campo === "confirmacao") {
      saida.senha ??= issue.message;
    }
  }
  return saida;
}

function traduzirErroDeAuth(
  mensagem: string,
  codigo: string | undefined,
  t: Translator,
): string {
  const m = mensagem.toLowerCase();

  if (codigo === "invalid_credentials" || m.includes("invalid login")) {
    return t("auth.invalidCredentials");
  }
  if (codigo === "email_not_confirmed" || m.includes("not confirmed")) {
    return t("auth.emailNotConfirmed");
  }
  if (codigo === "user_already_exists" || m.includes("already registered")) {
    return t("auth.userExists");
  }
  if (codigo === "email_address_invalid" || m.includes("is invalid")) {
    return t("auth.emailRejected");
  }
  if (codigo === "weak_password" || m.includes("password should be")) {
    return t("auth.weakPassword");
  }
  if (
    codigo === "over_email_send_rate_limit" ||
    codigo === "over_request_rate_limit" ||
    m.includes("rate limit")
  ) {
    return t("auth.rateLimited");
  }
  if (codigo === "signup_disabled" || m.includes("signups not allowed")) {
    return t("auth.signupDisabled");
  }

  return t("auth.genericFailure");
}

/**
 * De onde este servidor está sendo acessado agora.
 *
 * `origin` é o cabeçalho que o navegador manda em requisições de ação; quando
 * ele falta, `host` mais o protocolo reconstroem a mesma coisa. A variável de
 * ambiente é o último recurso, para o caso de a ação rodar fora de um pedido.
 */
async function enderecoDoSite(): Promise<string> {
  const h = await headers();

  const origem = h.get("origin");
  if (origem) return origem;

  const host = h.get("host");
  if (host) {
    const protocolo = host.startsWith("localhost") ? "http" : "https";
    return `${protocolo}://${host}`;
  }

  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
  );
}
