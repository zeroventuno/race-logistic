import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { AuthForm } from "@/components/director/AuthForm";
import { PortaDaDirecao } from "@/components/director/PortaDaDirecao";
import { TEMA_COOKIE, temaDoCookie } from "@/lib/tema";
import { getTranslator } from "@/lib/i18n/server";
import { supabaseServer } from "@/lib/supabase/server";

import { entrar } from "./actions";

export async function generateMetadata() {
  const { t } = await getTranslator();
  return { title: t("auth.metaLogin") };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmacao?: string }>;
}) {
  // Quem já está autenticado não tem por que ver esta tela — e no dia da prova
  // um clique errado no botão de voltar não pode custar uma ida ao login.
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/dashboard");

  const tema = temaDoCookie((await cookies()).get(TEMA_COOKIE)?.value);
  const { locale, t } = await getTranslator();

  // O callback manda para cá quando o link do e-mail já foi usado ou expirou.
  const falhou = (await searchParams).confirmacao === "falhou";

  return (
    <PortaDaDirecao
      tema={tema}
      locale={locale}
      modo="login"
    >
      <AuthForm
        modo="login"
        acao={entrar}
        estadoInicial={falhou ? { erro: t("auth.confirmFailed") } : undefined}
      />
    </PortaDaDirecao>
  );
}
