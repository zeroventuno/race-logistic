import "server-only";

import { createHash } from "node:crypto";

import type { Locale } from "@/lib/i18n/config";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Congelar o relatório.
 *
 * ------------------------------------------------------------------------
 * UM DOCUMENTO DE PROVA NÃO SE REGERA
 *
 * O relatório é reconstruído dos pings a cada geração. Isso é o que o torna
 * derivado da evidência — mas também significa que gerar duas vezes pode dar
 * dois arquivos diferentes: um ping que chegou atrasado, um ponto de bloqueio
 * acrescentado, o próprio relógio da geração.
 *
 * A prefeitura recebeu UM arquivo. Seis meses depois, numa discussão de seguro,
 * alguém precisa poder afirmar que o arquivo na mesa é o mesmo que saiu daqui.
 * Sem cópia guardada, o sistema não sustenta essa frase — e um documento que
 * não se sustenta não serve como prova.
 *
 * Então a primeira geração CONGELA: bytes, hash e hora, guardados. Da segunda
 * vez em diante a rota devolve a cópia, byte por byte.
 *
 * ------------------------------------------------------------------------
 * VERSÃO, E NÃO CORREÇÃO
 *
 * Acrescentar ponto de bloqueio depois de congelar é motivo legítimo para um
 * documento novo. Ele não apaga o anterior: a versão 1 continua guardada,
 * porque foi ela que alguém recebeu. Documento de prova ganha versão; não é
 * reescrito por cima.
 *
 * ------------------------------------------------------------------------
 * O HASH É DOS BYTES FINAIS
 *
 * Por isso ele não pode estar impresso dentro do PDF — imprimi-lo mudaria os
 * bytes que ele descreve. O que vai impresso é a IDENTIDADE do documento
 * (prova, idioma, versão, hora); o hash fica guardado e aparece na tela de quem
 * envia, para ser citado no e-mail. Quem recebe confere passando o arquivo por
 * um SHA-256 e comparando.
 */

export interface RelatorioCongelado {
  versao: number;
  sha256: string;
  pdf: Buffer;
  tamanhoBytes: number;
  geradoEm: string;
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** A versão congelada mais recente, ou `null` se ainda não houver nenhuma. */
export async function ultimoCongelado(
  raceId: string,
  locale: Locale,
): Promise<RelatorioCongelado | null> {
  const { data, error } = await supabaseAdmin()
    .from("race_reports")
    .select("version, sha256, pdf, size_bytes, generated_at")
    .eq("race_id", raceId)
    .eq("locale", locale)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const linha = data as {
    version: number;
    sha256: string;
    pdf: string;
    size_bytes: number;
    generated_at: string;
  };

  return {
    versao: linha.version,
    sha256: linha.sha256,
    // `bytea` chega como hexadecimal com prefixo `\x` pelo PostgREST.
    pdf: Buffer.from(linha.pdf.replace(/^\\x/, ""), "hex"),
    tamanhoBytes: linha.size_bytes,
    geradoEm: linha.generated_at,
  };
}

/**
 * Guarda uma versão nova.
 *
 * A versão é calculada a partir da última existente. Duas gerações
 * simultâneas para o mesmo idioma colidiriam no índice único — e é o que se
 * quer: a segunda falha em vez de sobrescrever, e quem pediu recebe o
 * documento que já existia.
 */
export async function congelar(
  raceId: string,
  locale: Locale,
  pdf: Uint8Array,
  userId: string | null,
): Promise<RelatorioCongelado | null> {
  const admin = supabaseAdmin();

  const { data: anterior } = await admin
    .from("race_reports")
    .select("version")
    .eq("race_id", raceId)
    .eq("locale", locale)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const versao = ((anterior as { version: number } | null)?.version ?? 0) + 1;
  const sha256 = sha256Hex(pdf);

  const { data, error } = await admin
    .from("race_reports")
    .insert({
      race_id: raceId,
      locale,
      version: versao,
      sha256,
      pdf: `\\x${Buffer.from(pdf).toString("hex")}`,
      size_bytes: pdf.byteLength,
      generated_by: userId,
    })
    .select("generated_at")
    .single();

  // Falhar em congelar NÃO impede a entrega do documento: quem apertou o botão
  // precisa do PDF, e a cópia guardada é garantia para depois. O que não pode
  // é o download quebrar porque o armazenamento recusou.
  if (error || !data) return null;

  return {
    versao,
    sha256,
    pdf: Buffer.from(pdf),
    tamanhoBytes: pdf.byteLength,
    geradoEm: (data as { generated_at: string }).generated_at,
  };
}
