import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { AuthForm } from "@/components/director/AuthForm";
import { PortaDaDirecao } from "@/components/director/PortaDaDirecao";
import { TEMA_COOKIE, temaDoCookie } from "@/lib/tema";
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

  const tema = temaDoCookie((await cookies()).get(TEMA_COOKIE)?.value);

  return (
    <PortaDaDirecao
      tema={tema}
      titulo="Painel da direção"
      descricao="Entre para preparar a prova: percurso, posições de apoio e códigos de vínculo."
    >
      <AuthForm modo="login" acao={entrar} />
    </PortaDaDirecao>
  );
}
