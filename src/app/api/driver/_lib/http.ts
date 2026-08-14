import "server-only";

import { NextResponse } from "next/server";

import type { DriverErrorBody, DriverErrorCode } from "@/lib/driver/protocol";

/**
 * Utilidades comuns dos Route Handlers do motorista.
 *
 * O ponto delicado aqui é a IMPRESSÃO DIGITAL DO CLIENTE. O rate limiting do
 * vínculo depende dela, e ela é derivada de cabeçalhos que o cliente controla.
 * Por isso: só o PRIMEIRO endereço de `x-forwarded-for` é considerado (é o que
 * o proxy da borda escreve; os seguintes podem ser forjados), e o resultado é
 * um hash — a tabela `bind_attempts` não precisa guardar IP em claro para
 * cumprir sua função, e guardar seria dado pessoal sem necessidade.
 */

const STATUS_BY_CODE: Record<DriverErrorCode, number> = {
  session_unknown: 401,
  session_revoked: 401,
  invalid_code: 401,
  rate_limited: 429,
  bad_request: 400,
  not_found: 404,
  race_over: 409,
  server_error: 500,
};

export function driverError(
  code: DriverErrorCode,
  message: string,
  extra?: { retryAfterSeconds?: number },
): NextResponse<DriverErrorBody> {
  const body: DriverErrorBody = { error: { code, message } };
  if (extra?.retryAfterSeconds != null) {
    body.error.retryAfterSeconds = extra.retryAfterSeconds;
  }

  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (extra?.retryAfterSeconds != null) {
    headers["Retry-After"] = String(Math.ceil(extra.retryAfterSeconds));
  }

  return NextResponse.json(body, { status: STATUS_BY_CODE[code], headers });
}

export function driverJson<T>(body: T, init?: { status?: number; headers?: Record<string, string> }) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) },
  });
}

export interface ClientContext {
  ip: string;
  userAgent: string;
  fingerprint: string;
}

export async function clientContext(request: Request): Promise<ClientContext> {
  const h = request.headers;

  const forwarded = h.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    h.get("cf-connecting-ip")?.trim() ||
    "desconhecido";

  const userAgent = (h.get("user-agent") ?? "desconhecido").slice(0, 400);

  return { ip, userAgent, fingerprint: await sha256Hex(`${ip}|${userAgent}`) };
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Normaliza um relacionamento embutido do PostgREST.
 *
 * Dependendo de como o PostgREST classifica a relação (um-para-um por chave
 * primária compartilhada, ou um-para-muitos), o mesmo `select` devolve um
 * objeto ou um array de um elemento. Depender dessa classificação é como
 * depender de detalhe de implementação de terceiro: funciona até a versão
 * seguinte. Desembrulhar sempre custa nada.
 */
export function unwrapEmbed<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

/** Teto padrão de corpo: cabe um lote cheio de 500 pings com folga. */
export const DEFAULT_MAX_BODY_BYTES = 512 * 1024;

export type JsonBody =
  | { ok: true; value: unknown }
  | { ok: false; reason: string };

/**
 * Lê o corpo como JSON, com teto de tamanho.
 *
 * O teto é lido do STREAM, não do `content-length`: um cliente pode mentir no
 * cabeçalho ou omiti-lo, e `await request.json()` bufferizaria tudo antes de
 * qualquer verificação. Sem isto, um POST de 20 MB em `/api/driver/alert` é
 * aceito e processado — memória do servidor gasta por quem não tem nem sessão
 * válida ainda.
 */
export async function readJsonBody(
  request: Request,
  maxBytes = DEFAULT_MAX_BODY_BYTES,
): Promise<JsonBody> {
  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, reason: `Corpo de ${declared} bytes acima do limite de ${maxBytes}.` };
  }

  const body = request.body;
  if (!body) return { ok: false, reason: "Requisição sem corpo." };

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, reason: `Corpo acima do limite de ${maxBytes} bytes.` };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: "Falha ao ler o corpo da requisição." };
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(merged)) };
  } catch {
    return { ok: false, reason: "Corpo da requisição não é JSON válido." };
  }
}

/**
 * Espera um tempinho antes de responder uma tentativa de vínculo falha.
 *
 * Não é segurança de verdade — é atrito. Sem isso, uma varredura do espaço de
 * códigos é limitada só pela latência da rede; com isso, cada tentativa custa
 * um slot de conexão aberta. O limite duro continua sendo `bind_attempts`.
 */
export function slowDown(ms = 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
