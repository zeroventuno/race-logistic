import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { cadastrar } from "@/app/login/actions";
import { AuthForm } from "@/components/director/AuthForm";
import { PortaDaDirecao } from "@/components/director/PortaDaDirecao";
import { TEMA_COOKIE, temaDoCookie } from "@/lib/tema";
import { getTranslator } from "@/lib/i18n/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function generateMetadata() {
  const { t } = await getTranslator();
  return { title: t("auth.metaSignup") };
}

export default async function CadastroPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/dashboard");

  const tema = temaDoCookie((await cookies()).get(TEMA_COOKIE)?.value);
  const { locale } = await getTranslator();

  return (
    <PortaDaDirecao
      tema={tema}
      locale={locale}
      modo="cadastro"
    >
      <AuthForm modo="cadastro" acao={cadastrar} />
    </PortaDaDirecao>
  );
}
