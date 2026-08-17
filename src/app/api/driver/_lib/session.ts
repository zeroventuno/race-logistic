import "server-only";

import type { NextResponse } from "next/server";

import { driverError, unwrapEmbed } from "@/app/api/driver/_lib/http";
import { bearerFromHeader, hashSessionToken } from "@/lib/codes/session-token";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PositionRole, RaceStatus } from "@/lib/types";

/**
 * Autenticação do dispositivo.
 *
 * O celular não tem conta nem credencial de banco: manda um token opaco no
 * `Authorization`, e é este módulo que o transforma em "posição X da prova Y".
 * Tudo depois disto escreve com `service_role`, então esta função é a única
 * fronteira de autorização do app do motorista — se ela deixar passar, não há
 * segunda linha de defesa.
 *
 * Duas respostas diferentes para dois casos que o app trata igual (desvincular)
 * mas que o suporte precisa distinguir: token desconhecido (aparelho limpo,
 * `localStorage` corrompido) e sessão revogada (a direção vinculou outro
 * celular a esta posição — o motorista precisa saber que não é bug dele).
 */

export interface DriverSession {
  sessionId: string;
  positionId: string;
  raceId: string;
  pingsReceived: number;
  position: {
    id: string;
    label: string;
    role: PositionRole;
    ordinal: number;
    isReferenceLead: boolean;
    isReferenceSweep: boolean;
  };
  race: {
    id: string;
    name: string;
    status: RaceStatus;
    targetGapMinutes: number;
    /** Mapa de fundo da prova — o mesmo que a direção está vendo. */
    basemap: string | null;
    /**
     * Fuso DA PROVA. Vai para o app porque o celular do motorista pode estar
     * em outro fuso (ou com fuso errado), e duas pessoas olhando a mesma tela
     * têm que ler o mesmo horário para o mesmo evento.
     */
    timeZone: string;
  };
}

export type AuthResult =
  | { ok: true; session: DriverSession }
  | { ok: false; response: NextResponse };

interface SessionRow {
  id: string;
  position_id: string;
  race_id: string;
  revoked_at: string | null;
  revoked_reason: string | null;
  pings_received: number;
  race_positions: PositionEmbed | PositionEmbed[] | null;
  races: RaceEmbed | RaceEmbed[] | null;
}

interface PositionEmbed {
  id: string;
  label: string;
  role: PositionRole;
  ordinal: number;
  is_reference_lead: boolean;
  is_reference_sweep: boolean;
}

interface RaceEmbed {
  id: string;
  name: string;
  status: RaceStatus;
  map_basemap: string | null;
  target_gap_minutes: number;
  timezone: string;
}

export async function authenticateDriver(request: Request): Promise<AuthResult> {
  const token = bearerFromHeader(request.headers.get("authorization"));

  if (!token) {
    return {
      ok: false,
      response: driverError(
        "session_unknown",
        "Este aparelho não está vinculado a nenhuma posição.",
      ),
    };
  }

  const tokenHash = await hashSessionToken(token);

  const { data, error } = await supabaseAdmin()
    .from("position_sessions")
    .select(
      "id, position_id, race_id, revoked_at, revoked_reason, pings_received, " +
        "race_positions!position_id(id, label, role, ordinal, is_reference_lead, is_reference_sweep), " +
        "races!race_id(id, name, status, target_gap_minutes, timezone, map_basemap)",
    )
    .eq("token_hash", tokenHash)
    .maybeSingle<SessionRow>();

  if (error) {
    // Falha de infraestrutura não pode virar "desvincule seu aparelho": o app
    // apagaria uma sessão perfeitamente válida por causa de um soluço do banco.
    console.error("[driver] falha ao validar sessão:", error.message, error.details ?? "");
    return {
      ok: false,
      response: driverError(
        "server_error",
        "Falha ao validar a sessão. O aparelho continua vinculado; tentando de novo.",
      ),
    };
  }

  if (!data) {
    return {
      ok: false,
      response: driverError(
        "session_unknown",
        "Vínculo não reconhecido pelo servidor. Peça um código novo à direção.",
      ),
    };
  }

  if (data.revoked_at) {
    return {
      ok: false,
      response: driverError(
        "session_revoked",
        data.revoked_reason
          ? `Vínculo encerrado pela direção: ${data.revoked_reason}`
          : "Este vínculo foi encerrado pela direção. Peça um código novo.",
      ),
    };
  }

  const position = unwrapEmbed(data.race_positions);
  const race = unwrapEmbed(data.races);

  if (!position || !race) {
    return {
      ok: false,
      response: driverError(
        "session_unknown",
        "A posição vinculada a este aparelho não existe mais.",
      ),
    };
  }

  return {
    ok: true,
    session: {
      sessionId: data.id,
      positionId: data.position_id,
      raceId: data.race_id,
      pingsReceived: Number(data.pings_received ?? 0),
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
        basemap: race.map_basemap ?? null,
        timeZone: race.timezone || "Europe/Rome",
      },
    },
  };
}

/** Marca a sessão como viva. Falha aqui nunca derruba a requisição. */
export async function touchSession(
  sessionId: string,
  patch: { lastPingAt?: string; pingsReceived?: number },
): Promise<void> {
  const update: Record<string, unknown> = { last_seen_at: new Date().toISOString() };
  if (patch.lastPingAt) update.last_ping_at = patch.lastPingAt;
  if (patch.pingsReceived != null) update.pings_received = patch.pingsReceived;

  const { error } = await supabaseAdmin()
    .from("position_sessions")
    .update(update)
    .eq("id", sessionId);

  if (error && process.env.NODE_ENV !== "production") {
    console.warn("[driver] touchSession falhou:", error.message);
  }
}
