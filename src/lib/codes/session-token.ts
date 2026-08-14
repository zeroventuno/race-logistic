/**
 * Token de sessão do dispositivo.
 *
 * Depois que o motorista troca o código de vínculo por uma sessão, é este
 * token que autentica cada ping e cada alerta. Ele vive no `localStorage` do
 * celular e vai no cabeçalho `Authorization` de toda requisição do app.
 *
 * O banco guarda apenas o SHA-256. Um dump do banco não permite personificar
 * um veículo — o que importa, porque personificar o carro de abertura
 * significaria mover o marcador que o diretor usa para liberar ruas.
 *
 * Usa Web Crypto (não `node:crypto`) para o mesmo código rodar no runtime
 * Node e no Edge sem bifurcação.
 */

const TOKEN_BYTES = 32; // 256 bits

export function generateSessionToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

export async function hashSessionToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(new Uint8Array(digest));
}

/**
 * Comparação em tempo constante.
 *
 * A busca no banco é por índice único sobre o hash, então na prática o timing
 * não vaza nada — mas onde a comparação for feita em memória, que seja a
 * correta.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Extrai o token de um cabeçalho `Authorization: Bearer <token>`. */
export function bearerFromHeader(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}
