import Link from "next/link";
import { redirect } from "next/navigation";

import { cadastrar } from "@/app/login/actions";
import { AuthForm } from "@/components/director/AuthForm";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata = {
  title: "Criar conta — Flamme Rouge",
};

export default async function CadastroPage() {
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
          Criar conta de direção
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          A conta é sua e as provas que você criar só aparecem para você. Os
          motoristas não precisam de conta — eles entram pelo código de 6
          caracteres.
        </p>
      </header>

      <AuthForm modo="cadastro" acao={cadastrar} />
    </main>
  );
}
