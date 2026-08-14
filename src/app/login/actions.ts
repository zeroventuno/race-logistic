"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { supabaseServer } from "@/lib/supabase/server";

/**
 * Autenticação do diretor.
 *
 * Só e-mail e senha: no dia da prova o sinal de dados é ruim e um fluxo de
 * "link mágico" que depende de abrir o e-mail no celular é um jeito conhecido
 * de ficar de fora do próprio painel.
 *
 * As mensagens de erro do Supabase vêm em inglês e são genéricas de propósito
 * (para não revelar se um e-mail existe). Aqui elas viram frases em português
 * que dizem o próximo passo — mantendo a mesma discrição.
 */

export interface AuthState {
  erro?: string;
  aviso?: string;
  campos?: Partial<Record<"email" | "senha" | "nome", string>>;
  /** Devolvido para o formulário não apagar o que a pessoa já digitou. */
  valores?: { email?: string; nome?: string };
}

const emailSchema = z
  .string()
  .trim()
  .min(1, "Informe o e-mail.")
  .email("Esse e-mail não parece válido. Confira se falta o @ ou o domínio.");

const loginSchema = z.object({
  email: emailSchema,
  senha: z.string().min(1, "Informe a senha."),
});

const cadastroSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "Informe seu nome — é ele que aparece para a equipe da prova.")
    .max(80, "Nome muito longo (máximo 80 caracteres)."),
  email: emailSchema,
  senha: z
    .string()
    .min(8, "A senha precisa ter pelo menos 8 caracteres.")
    .max(72, "A senha pode ter no máximo 72 caracteres."),
  confirmacao: z.string(),
});

export async function entrar(
  _anterior: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const bruto = {
    email: String(formData.get("email") ?? ""),
    senha: String(formData.get("senha") ?? ""),
  };

  const parsed = loginSchema.safeParse(bruto);
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
      erro: traduzirErroDeAuth(error.message, error.code),
      valores: { email: parsed.data.email },
    };
  }

  redirect("/dashboard");
}

export async function cadastrar(
  _anterior: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const bruto = {
    nome: String(formData.get("nome") ?? ""),
    email: String(formData.get("email") ?? ""),
    senha: String(formData.get("senha") ?? ""),
    confirmacao: String(formData.get("confirmacao") ?? ""),
  };

  const parsed = cadastroSchema.safeParse(bruto);
  if (!parsed.success) {
    return {
      campos: camposDeZod(parsed.error),
      valores: { email: bruto.email, nome: bruto.nome },
    };
  }

  if (parsed.data.senha !== parsed.data.confirmacao) {
    return {
      campos: { senha: "As duas senhas não são iguais. Digite de novo." },
      valores: { email: parsed.data.email, nome: parsed.data.nome },
    };
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.senha,
    options: { data: { full_name: parsed.data.nome } },
  });

  if (error) {
    return {
      erro: traduzirErroDeAuth(error.message, error.code),
      valores: { email: parsed.data.email, nome: parsed.data.nome },
    };
  }

  // Com confirmação de e-mail ligada no projeto, `signUp` não devolve sessão —
  // a conta existe mas ainda não pode entrar. Dizer isso explicitamente evita o
  // beco sem saída de "cadastrei e não aconteceu nada".
  if (!data.session) {
    return {
      aviso: `Conta criada. Enviamos um e-mail de confirmação para ${parsed.data.email}. Confirme e volte aqui para entrar (confira também a caixa de spam).`,
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
): string {
  const m = mensagem.toLowerCase();

  if (codigo === "invalid_credentials" || m.includes("invalid login")) {
    return "E-mail ou senha incorretos. Se você acabou de se cadastrar, confirme o e-mail antes de entrar.";
  }
  if (codigo === "email_not_confirmed" || m.includes("not confirmed")) {
    return "Este e-mail ainda não foi confirmado. Abra a mensagem que enviamos e clique no link (confira o spam).";
  }
  if (codigo === "user_already_exists" || m.includes("already registered")) {
    return "Já existe uma conta com este e-mail. Vá para a tela de entrar; se esqueceu a senha, peça a redefinição pelo Supabase.";
  }
  if (codigo === "email_address_invalid" || m.includes("is invalid")) {
    return "O servidor recusou este endereço de e-mail. Use um e-mail real que você consiga abrir agora — a confirmação chega nele.";
  }
  if (codigo === "weak_password" || m.includes("password should be")) {
    return "Senha fraca demais para o servidor. Use pelo menos 8 caracteres, misturando letras e números.";
  }
  if (
    codigo === "over_email_send_rate_limit" ||
    codigo === "over_request_rate_limit" ||
    m.includes("rate limit")
  ) {
    return "Muitas tentativas em pouco tempo. Espere alguns minutos antes de tentar de novo.";
  }
  if (codigo === "signup_disabled" || m.includes("signups not allowed")) {
    return "O cadastro está desativado neste servidor. Peça a alguém da equipe para criar sua conta.";
  }

  return "Não foi possível concluir agora. Confira sua conexão e tente de novo.";
}
