import { NextResponse } from "next/server";
import { z } from "zod";

import { clientContext, sha256Hex } from "@/app/api/driver/_lib/http";
import { getTranslator } from "@/lib/i18n/server";
import { isLocale } from "@/lib/i18n/config";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Pedido de contato da landing.
 *
 * É a ÚNICA rota de escrita pública deste sistema — todo o resto exige sessão
 * de diretor ou código de vínculo. Isso muda o que precisa estar aqui:
 *
 *  1. LIMITE DE TAXA POR ORIGEM. Sem ele, um robô enche a tabela numa tarde e o
 *     pedido de verdade se perde no meio. O limite é generoso de propósito —
 *     uma pessoa que escreve duas vezes porque errou o e-mail na primeira não
 *     pode ser barrada.
 *
 *  2. CAMPO-ARMADILHA em vez de CAPTCHA. O `website` é invisível e nenhum
 *     humano o preenche; robô de formulário preenche tudo que encontra.
 *     Custa zero para quem é gente, não depende de serviço de terceiro, e não
 *     obriga um diretor de prova a identificar semáforos numa grade. Quando
 *     isto deixar de segurar, aí sim vale um serviço.
 *
 *  3. A ARMADILHA RESPONDE SUCESSO. Dizer "recusado" ensina o robô a tentar de
 *     novo sem o campo; dizer "recebido" e jogar fora encerra a conversa.
 *
 *  4. NADA DE E-MAIL AQUI. Gravar e notificar são duas coisas, e a gravação não
 *     pode falhar porque o serviço de e-mail está fora. O pedido fica na
 *     tabela; a notificação lê de lá, depois.
 */

/** Janela e teto do limite por origem. */
const JANELA_MS = 60 * 60 * 1000;
const MAX_POR_HORA = 5;

function esquema(t: Awaited<ReturnType<typeof getTranslator>>["t"]) {
  return z.object({
    name: z.string().trim().min(1, t("landing.contact.nameRequired")).max(120),
    email: z
      .string()
      .trim()
      .min(1, t("landing.contact.emailRequired"))
      .max(200)
      .email(t("landing.contact.emailInvalid")),
    organization: z.string().trim().max(200).optional().default(""),
    message: z
      .string()
      .trim()
      .min(1, t("landing.contact.messageRequired"))
      .max(4000, t("landing.contact.messageTooLong")),
    /** O campo-armadilha. Vazio em gente. */
    website: z.string().max(200).optional().default(""),
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const { locale, t } = await getTranslator();

  let bruto: unknown;
  try {
    bruto = await request.json();
  } catch {
    return NextResponse.json({ erro: t("driver.api.badJson") }, { status: 400 });
  }

  const parsed = esquema(t).safeParse(bruto);
  if (!parsed.success) {
    return NextResponse.json(
      { erro: parsed.error.issues[0]?.message ?? t("landing.contact.failed") },
      { status: 400 },
    );
  }

  const dados = parsed.data;

  // A armadilha. Responde como se tivesse dado certo — ver o cabeçalho.
  if (dados.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const ctx = await clientContext(request);
  const ipHash = await sha256Hex(ctx.ip);

  const admin = supabaseAdmin();

  const { count, error: erroContagem } = await admin
    .from("contact_requests")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", new Date(Date.now() - JANELA_MS).toISOString());

  // Banco fora do ar não pode virar porta trancada: perder um pedido de
  // contato por causa de uma consulta de limite que falhou é o pior dos dois
  // erros. Segue sem limite e grava.
  if (!erroContagem && (count ?? 0) >= MAX_POR_HORA) {
    return NextResponse.json(
      { erro: t("landing.contact.tooMany") },
      { status: 429, headers: { "Retry-After": String(JANELA_MS / 1000) } },
    );
  }

  const { error } = await admin.from("contact_requests").insert({
    name: dados.name,
    email: dados.email,
    organization: dados.organization || null,
    message: dados.message,
    locale: isLocale(locale) ? locale : "pt-BR",
    ip_hash: ipHash,
    user_agent: ctx.userAgent.slice(0, 400),
  });

  if (error) {
    console.error("[contact] falha ao gravar:", error.message);
    return NextResponse.json({ erro: t("landing.contact.failed") }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
