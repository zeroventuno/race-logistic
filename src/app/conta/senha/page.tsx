import { cookies } from "next/headers";

import { AuthForm } from "@/components/director/AuthForm";
import { PortaDaDirecao } from "@/components/director/PortaDaDirecao";
import { TEMA_COOKIE, temaDoCookie } from "@/lib/tema";
import { getTranslator } from "@/lib/i18n/server";
import { supabaseServer } from "@/lib/supabase/server";

import { definirSenha } from "./actions";

export async function generateMetadata() {
  const { t } = await getTranslator();
  return { title: t("auth.metaNewPassword") };
}

/**
 * Definir a senha nova.
 *
 * Serve às duas portas: quem chegou pelo link de recuperação — já com sessão,
 * porque o `/auth/callback` trocou o código antes de redirecionar para cá — e
 * o diretor autenticado que quer trocar a senha por vontade própria.
 *
 * SEM SESSÃO, A TELA EXPLICA EM VEZ DE MANDAR PARA O LOGIN. Quem cai aqui sem
 * sessão veio de um link vencido ou já usado, e o login não conta essa
 * história: mostraria um formulário comum e a pessoa tentaria de novo a senha
 * que ela não lembra. O formulário aparece mesmo assim, com o aviso — se ela
 * entrar noutra aba, o envio funciona.
 */
export default async function NovaSenhaPage() {
  const tema = temaDoCookie((await cookies()).get(TEMA_COOKIE)?.value);
  const { locale, t } = await getTranslator();

  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();

  return (
    <PortaDaDirecao tema={tema} locale={locale} modo="nova-senha">
      <AuthForm
        modo="nova-senha"
        acao={definirSenha}
        estadoInicial={
          data.user ? undefined : { erro: t("auth.recoverExpired") }
        }
      />
    </PortaDaDirecao>
  );
}
