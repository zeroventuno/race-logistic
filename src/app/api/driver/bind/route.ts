import "server-only";

import { NextResponse } from "next/server";

import {
  clientContext,
  driverError,
  driverJson,
  readJsonBody,
  sha256Hex,
  slowDown,
} from "@/app/api/driver/_lib/http";
import { normalizeBindCode } from "@/lib/codes/bind-code";
import { generateSessionToken, hashSessionToken } from "@/lib/codes/session-token";
import type { DriverBindResponse } from "@/lib/driver/protocol";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { BindRequest, PositionRole, RaceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Troca do código de vínculo por uma sessão de dispositivo.
 *
 * É o único endpoint do app do motorista que aceita um segredo curto, e por
 * isso o único que precisa de defesa contra força bruta. São 32^6 ≈ 1,07 bilhão
 * de códigos, o que parece muito até alguém apontar um script: a 50 req/s um
 * atacante testa 4,3 milhões de códigos por dia. Numa prova com 20 posições
 * ativas isso é uma chance real de assumir o carro de abertura de um evento
 * alheio — e o carro de abertura é o marcador que a direção usa para liberar
 * ruas ao público.
 *
 * Três camadas, nesta ordem:
 *
 *  1. REGISTRO DE TODA TENTATIVA em `bind_attempts`, inclusive as malformadas.
 *     Sem registro não existe limite, e sem registro também não existe
 *     diagnóstico quando o motorista jura que digitou certo.
 *
 *  2. LIMITE POR ORIGEM em duas chaves. `IP+user-agent` pega o caso comum;
 *     `IP` sozinho pega quem gira o user-agent para escapar da primeira. Girar
 *     o IP ainda escapa das duas — é a limitação conhecida, e é por isso que a
 *     camada 3 existe.
 *
 *  3. RESPOSTA INDISTINGUÍVEL. Código malformado, inexistente, expirado ou
 *     revogado devolvem exatamente a mesma mensagem e o mesmo status. Um
 *     atacante distribuído por mil IPs continua sem oráculo para saber se
 *     chegou perto.
 */

/** Janela do limite. Curta o bastante para não punir o dia seguinte. */
const RATE_WINDOW_MS = 10 * 60_000;

/** Falhas toleradas para a mesma combinação IP + user-agent. */
const MAX_FAILURES_PER_DEVICE = 8;

/** Falhas toleradas para o mesmo IP, somando todos os user-agents. */
const MAX_FAILURES_PER_IP = 20;

/**
 * Falhas toleradas para o MESMO código, somando todas as origens.
 *
 * 15 é generoso para erro humano (um código digitado errado 15 vezes em 10 min
 * já virou ligação para a direção) e apertado para adivinhação: completar um
 * caractere ilegível do alfabeto de 32 símbolos exige 32 tentativas.
 */
const MAX_FAILURES_PER_CODE = 15;

interface PositionRow {
  id: string;
  race_id: string;
  label: string;
  role: PositionRole;
  ordinal: number;
  is_reference_lead: boolean;
  is_reference_sweep: boolean;
  bind_code_expires_at: string | null;
}

interface RaceRow {
  id: string;
  name: string;
  status: RaceStatus;
  target_gap_minutes: number;
  timezone: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  const ctx = await clientContext(request);
  const ipKey = `ip:${await sha256Hex(ctx.ip)}`;

  const body = await readJsonBody(request);
  if (!body.ok) {
    return driverError("bad_request", "Corpo da requisição não é JSON válido.");
  }

  const payload = body.value as Partial<BindRequest>;
  const rawCode = typeof payload?.code === "string" ? payload.code : "";
  const deviceLabel =
    typeof payload?.deviceLabel === "string" ? payload.deviceLabel.slice(0, 80) : null;

  const code = normalizeBindCode(rawCode);

  // O hash é calculado do código NORMALIZADO para o contador por código não ser
  // driblado alternando maiúsculas, hífens ou os apelidos O/0 e I/1.
  const codeHash = code ? await sha256Hex(code) : await sha256Hex(rawCode.toUpperCase());

  const attempt = {
    codeHash,
    deviceKey: ctx.fingerprint,
    ipKey,
  };

  const limit = await checkRateLimit(ctx.fingerprint, ipKey, code ? codeHash : null);
  if (limit.blocked) {
    // Tentativa bloqueada também é registrada: sem isso, o atacante que já
    // estourou o limite fica invisível no histórico.
    await recordAttempt({ ...attempt, succeeded: false, positionId: null, raceId: null });
    return driverError(
      "rate_limited",
      `Muitas tentativas seguidas. Aguarde ${Math.ceil(limit.retryAfterSeconds / 60)} min e confira o código com a direção.`,
      { retryAfterSeconds: limit.retryAfterSeconds },
    );
  }

  if (!code) {
    await recordAttempt({ ...attempt, succeeded: false, positionId: null, raceId: null });
    await slowDown();
    return invalidCode();
  }

  const admin = supabaseAdmin();

  const { data: position, error: positionError } = await admin
    .from("race_positions")
    .select(
      "id, race_id, label, role, ordinal, is_reference_lead, is_reference_sweep, bind_code_expires_at",
    )
    .eq("bind_code", code)
    .is("bind_code_revoked_at", null)
    .maybeSingle<PositionRow>();

  if (positionError) {
    return driverError("server_error", "Falha ao consultar o código. Tente de novo.");
  }

  const expired =
    position?.bind_code_expires_at != null &&
    Date.parse(position.bind_code_expires_at) <= Date.now();

  if (!position || expired) {
    await recordAttempt({
      ...attempt,
      succeeded: false,
      positionId: position?.id ?? null,
      raceId: position?.race_id ?? null,
    });
    await slowDown();
    return invalidCode();
  }

  const { data: race, error: raceError } = await admin
    .from("races")
    .select("id, name, status, target_gap_minutes, timezone")
    .eq("id", position.race_id)
    .maybeSingle<RaceRow>();

  if (raceError || !race) {
    return driverError("server_error", "Falha ao carregar a prova deste código.");
  }

  // Prova encerrada responde EXATAMENTE como código inexistente.
  //
  // A versão anterior explicava a situação ("a prova X já foi encerrada") e era
  // um oráculo: confirmava que o código existe, entregava o nome da prova, e
  // respondia rápido enquanto os códigos inválidos passavam pelo atraso — três
  // sinais diferentes para separar acerto de erro. A ajuda que o motorista
  // perde aqui a direção dá por rádio em cinco segundos; o oráculo, não se
  // desfaz.
  if (race.status === "finished" || race.status === "archived") {
    await recordAttempt({
      ...attempt,
      succeeded: false,
      positionId: position.id,
      raceId: race.id,
    });
    await slowDown();
    return invalidCode();
  }

  const bound = await bindSession({
    positionId: position.id,
    raceId: position.race_id,
    deviceLabel,
    userAgent: ctx.userAgent,
  });

  if (!bound) {
    return driverError(
      "server_error",
      "Não foi possível concluir o vínculo. Tente de novo em alguns segundos.",
    );
  }

  await recordAttempt({
    ...attempt,
    succeeded: true,
    positionId: position.id,
    raceId: race.id,
  });

  const response: DriverBindResponse = {
    token: bound.token,
    position: {
      id: position.id,
      label: position.label,
      role: position.role,
      ordinal: position.ordinal,
      isReferenceLead: position.is_reference_lead,
      isReferenceSweep: position.is_reference_sweep,
    },
    race: {
      id: race.id,
      name: race.name,
      status: race.status,
      targetGapMinutes: race.target_gap_minutes,
      timeZone: race.timezone || "Europe/Rome",
    },
    route: await loadRenderRoute(position.race_id),
  };

  return driverJson(response);
}

/** Mensagem única para todos os motivos de recusa do código. */
function invalidCode(): NextResponse {
  return driverError(
    "invalid_code",
    "Código não reconhecido. Confira os 6 caracteres com a direção da prova.",
  );
}

interface RateLimitVerdict {
  blocked: boolean;
  retryAfterSeconds: number;
}

async function checkRateLimit(
  deviceKey: string,
  ipKey: string,
  codeHash: string | null,
): Promise<RateLimitVerdict> {
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const admin = supabaseAdmin();

  const [byOrigin, byCode] = await Promise.all([
    admin
      .from("bind_attempts")
      .select("client_fingerprint, created_at")
      .in("client_fingerprint", [deviceKey, ipKey])
      .eq("succeeded", false)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(200),
    // Limite POR CÓDIGO. Fecha o ataque que os limites por origem não fecham:
    // uma foto da folha impressa com um caractere ilegível são 32 tentativas
    // para adivinhar aquele caractere — trivial de distribuir entre IPs, e
    // impossível de escapar deste contador.
    codeHash
      ? admin
          .from("bind_attempts")
          .select("created_at")
          .eq("code_hash", codeHash)
          .eq("succeeded", false)
          .gte("created_at", since)
          .order("created_at", { ascending: true })
          .limit(50)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (byOrigin.error || !byOrigin.data) {
    // Banco fora do ar não pode virar porta aberta nem porta trancada: seguimos
    // sem limite, porque travar o vínculo de todos os motoristas por causa de
    // uma consulta que falhou é o pior dos dois erros no dia da prova.
    return { blocked: false, retryAfterSeconds: 0 };
  }

  const byDevice = byOrigin.data.filter((r) => r.client_fingerprint === deviceKey);
  const byIp = byOrigin.data.filter((r) => r.client_fingerprint === ipKey);
  const codeFailures = byCode.data ?? [];

  const verdicts: RateLimitVerdict[] = [];

  if (byDevice.length >= MAX_FAILURES_PER_DEVICE) {
    verdicts.push(retryAfterFrom(byDevice[0]!.created_at as string));
  }
  if (byIp.length >= MAX_FAILURES_PER_IP) {
    verdicts.push(retryAfterFrom(byIp[0]!.created_at as string));
  }
  if (codeFailures.length >= MAX_FAILURES_PER_CODE) {
    verdicts.push(retryAfterFrom(codeFailures[0]!.created_at as string));
  }

  if (verdicts.length === 0) return { blocked: false, retryAfterSeconds: 0 };

  return {
    blocked: true,
    retryAfterSeconds: Math.max(...verdicts.map((v) => v.retryAfterSeconds)),
  };
}

function retryAfterFrom(oldestIso: string): RateLimitVerdict {
  const freeAtMs = Date.parse(oldestIso) + RATE_WINDOW_MS;
  return {
    blocked: true,
    retryAfterSeconds: Math.max(30, Math.ceil((freeAtMs - Date.now()) / 1000)),
  };
}

/**
 * Registra a tentativa em duas chaves de origem.
 *
 * O código vai como HASH, nunca em claro: a tabela guarda toda tentativa
 * BEM-SUCEDIDA também, e um `select` nela devolveria a lista de códigos vivos
 * do sistema inteiro. Hash serve igualmente para contar e não cria um cofre.
 */
async function recordAttempt(params: {
  codeHash: string;
  deviceKey: string;
  ipKey: string;
  succeeded: boolean;
  positionId: string | null;
  raceId: string | null;
}): Promise<void> {
  const row = {
    code_hash: params.codeHash,
    succeeded: params.succeeded,
    position_id: params.positionId,
    race_id: params.raceId,
  };

  const { error } = await supabaseAdmin()
    .from("bind_attempts")
    .insert([
      { ...row, client_fingerprint: params.deviceKey },
      { ...row, client_fingerprint: params.ipKey },
    ]);

  if (error && process.env.NODE_ENV !== "production") {
    console.warn("[bind] falha ao registrar tentativa:", error.message);
  }
}

interface BindParams {
  positionId: string;
  raceId: string;
  deviceLabel: string | null;
  userAgent: string;
}

/**
 * Revoga a sessão anterior e cria a nova.
 *
 * A ordem importa: existe um índice único parcial que só admite UMA sessão não
 * revogada por posição, então inserir antes de revogar falha. E a revogação
 * primeiro é também o comportamento certo — dois celulares transmitindo como o
 * mesmo veículo fariam o marcador oscilar entre duas posições no mapa da
 * direção, que é o tipo de defeito que ninguém consegue diagnosticar ao vivo.
 *
 * O retry existe para o caso de dois aparelhos vincularem no mesmo instante: um
 * dos dois perde a corrida contra o índice único e precisa refazer o ciclo.
 */
async function bindSession(params: BindParams): Promise<{ token: string } | null> {
  const admin = supabaseAdmin();

  for (let attempt = 0; attempt < 2; attempt++) {
    const { error: revokeError } = await admin
      .from("position_sessions")
      .update({
        revoked_at: new Date().toISOString(),
        revoked_reason: "outro aparelho assumiu esta posição",
      })
      .eq("position_id", params.positionId)
      .is("revoked_at", null);

    if (revokeError) return null;

    const token = generateSessionToken();
    const tokenHash = await hashSessionToken(token);

    const { error: insertError } = await admin.from("position_sessions").insert({
      position_id: params.positionId,
      race_id: params.raceId,
      token_hash: tokenHash,
      device_label: params.deviceLabel,
      user_agent: params.userAgent,
    });

    if (!insertError) return { token };

    // 23505 = violação de unicidade: outro vínculo entrou entre a revogação e
    // a inserção. Vale tentar de novo; qualquer outro erro é definitivo.
    if (insertError.code !== "23505") return null;
  }

  return null;
}

/**
 * Percurso para desenhar no celular.
 *
 * Vai na resposta do vínculo (e não numa chamada separada) porque é a única
 * hora em que o aparelho tem rede garantida. O app guarda isso localmente e
 * consegue desenhar o traçado mesmo depois de horas sem sinal.
 */
async function loadRenderRoute(raceId: string): Promise<DriverBindResponse["route"]> {
  const { data, error } = await supabaseAdmin()
    .from("route_tracks")
    .select("total_distance_m, render_points")
    .eq("race_id", raceId)
    .eq("is_active", true)
    .maybeSingle<{ total_distance_m: number; render_points: [number, number][] }>();

  if (error || !data) return null;

  return {
    totalDistanceM: data.total_distance_m,
    renderPoints: data.render_points ?? [],
  };
}
