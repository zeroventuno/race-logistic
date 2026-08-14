import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/director/AuthForm";
import { supabaseServer } from "@/lib/supabase/server";

import { entrar } from "./actions";

export const metadata = {
  title: "Entrar — Flamme Rouge",
};

export default async function LoginPage() {
  // Quem já está autenticado não tem por que ver esta tela — e no dia da prova
  // um clique errado no botão de voltar não pode custar uma ida ao login.
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-16">
      <header>
        <Link
          href="/"
          className="font-mono text-xs uppercase tracking-[0.2em] text-ink-faint hover:text-ink-muted"
        >
          Flamme Rouge
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
          Painel da direção
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Entre para preparar a prova: percurso, posições de apoio e códigos de
          vínculo.
        </p>
      </header>

      <AuthForm modo="login" acao={entrar} />
    </main>
  );
}
