import { cookies } from "next/headers";

import { AuthForm } from "@/components/director/AuthForm";
import { PortaDaDirecao } from "@/components/director/PortaDaDirecao";
import { TEMA_COOKIE, temaDoCookie } from "@/lib/tema";
import { getTranslator } from "@/lib/i18n/server";

import { pedirRecuperacao } from "../login/actions";

export async function generateMetadata() {
  const { t } = await getTranslator();
  return { title: t("auth.metaRecover") };
}

/**
 * Pedir o link de recuperação.
 *
 * NÃO REDIRECIONA QUEM JÁ ESTÁ AUTENTICADO, ao contrário do login. Parece
 * inconsistência e não é: o caso comum aqui é o diretor com a sessão viva num
 * aparelho e nenhuma lembrança da senha no outro. Mandá-lo para o painel
 * porque este navegador tem cookie é responder outra pergunta.
 */
export default async function RecuperarPage() {
  const tema = temaDoCookie((await cookies()).get(TEMA_COOKIE)?.value);
  const { locale } = await getTranslator();

  return (
    <PortaDaDirecao tema={tema} locale={locale} modo="recuperar">
      <AuthForm modo="recuperar" acao={pedirRecuperacao} />
    </PortaDaDirecao>
  );
}
