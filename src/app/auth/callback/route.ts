import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";

/**
 * O outro lado da confirmação de e-mail.
 *
 * O cadastro já avisava "confirmação enviada", e ali a coisa parava. O link do
 * e-mail levava para a raiz do site, que não sabia que uma confirmação tinha
 * acabado de acontecer — a pessoa clicava, caía numa página qualquer, e não
 * recebia sinal nenhum de que a conta passou a existir. Foi exatamente o que um
 * primeiro usuário relatou: "depois que confirmo, o site não dá nenhuma
 * mensagem informando sucesso".
 *
 * DOIS FORMATOS DE LINK, porque o Supabase usa um ou outro conforme a versão do
 * template de e-mail do projeto:
 *
 *   ?code=…                     fluxo PKCE, trocado por sessão
 *   ?token_hash=…&type=signup   verificação direta de OTP
 *
 * Aceitar os dois custa dez linhas e evita um bug que só aparece no dia em que
 * alguém mexer no template lá no painel.
 *
 * QUEM CONFIRMA JÁ ENTRA. A troca do código cria a sessão neste navegador, e
 * mandar a pessoa para o login depois disso seria pedir a senha que ela acabou
 * de cadastrar por um motivo que não existe. Vai direto para o painel, com
 * `?confirmado=1` para a tela poder dizer que deu certo.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  /*
   * `next` é o destino depois de confirmar, e vem da URL — por isso só pode
   * ser um caminho interno. Sem esta checagem, um link com
   * `next=https://outro-site` transformaria este endpoint num redirecionador
   * aberto, útil para phishing em cima de um domínio confiável.
   */
  const pedido = searchParams.get("next");
  const interno =
    Boolean(pedido) && pedido!.startsWith("/") && !pedido!.startsWith("//");
  const destino = interno ? pedido! : "/dashboard";

  /*
   * O aviso de "confirmado" só vale para o destino PADRÃO.
   *
   * Quem chega com `next` está no meio de outra tarefa — a recuperação de
   * senha manda para `/conta/senha` — e anunciar "conta confirmada" ali
   * responderia uma pergunta que ninguém fez, antes da que importa.
   */
  const paraOnde = interno ? destino : `${destino}?confirmado=1`;

  const supabase = await supabaseServer();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${paraOnde}`);
    }
    console.warn("[auth/callback] troca de código falhou:", error.message);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "signup" | "email" | "recovery" | "invite" | "email_change",
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${paraOnde}`);
    }
    console.warn("[auth/callback] verificação falhou:", error.message);
  }

  // Link expirado, já usado, ou chamada sem parâmetro nenhum. O login explica
  // o que aconteceu e o que fazer — não adianta despejar a pessoa numa página
  // em branco com um erro de biblioteca.
  return NextResponse.redirect(`${origin}/login?confirmacao=falhou`);
}
