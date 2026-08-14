import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { cadastrar } from "@/app/login/actions";
import { AuthForm } from "@/components/director/AuthForm";
import { PortaDaDirecao } from "@/components/director/PortaDaDirecao";
import { TEMA_COOKIE, temaDoCookie } from "@/lib/tema";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata = {
  title: "Criar conta — Flamme Rouge",
};

export default async function CadastroPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/dashboard");

  const tema = temaDoCookie((await cookies()).get(TEMA_COOKIE)?.value);

  return (
    <PortaDaDirecao
      tema={tema}
      titulo="Criar conta de direção"
      descricao="A conta é sua, e as provas que você criar só aparecem para você. Os motoristas não precisam de conta — eles entram pelo código de 6 caracteres."
    >
      <AuthForm modo="cadastro" acao={cadastrar} />
    </PortaDaDirecao>
  );
}
