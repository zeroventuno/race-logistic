import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslator } from "@/lib/i18n/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { supabaseServer } from "@/lib/supabase/server";
import type { Race, RacePosition, RouteTrackRow } from "@/lib/types";
import { computeReadiness, type Readiness } from "./readiness";

/**
 * Porta de entrada de toda página do diretor.
 *
 * `getUser` e não `getSession`: só o primeiro valida o token contra o servidor
 * de auth. `getSession` acredita no cookie, e o cookie é do cliente.
 */
export async function requireUser(): Promise<{
  supabase: SupabaseClient;
  user: User;
}> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  return { supabase, user: data.user };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Resumo do percurso ativo — sem `points`, que pode ter dezenas de milhares
 *  de vértices e não tem por que atravessar o servidor a cada navegação. */
export type ActiveTrackSummary = Pick<
  RouteTrackRow,
  | "id"
  | "name"
  | "source"
  | "original_filename"
  | "total_distance_m"
  | "point_count"
  | "elevation_gain_m"
  | "bbox"
  | "created_at"
>;

export interface RaceContext {
  supabase: SupabaseClient;
  user: User;
  race: Race;
  positions: RacePosition[];
  activeTrack: ActiveTrackSummary | null;
  readiness: Readiness;
  canEdit: boolean;
  /** Códigos válidos por posição. Vazio para quem não pode editar a prova. */
  bindCodes: Map<string, { code: string; expiresAt: string | null }>;
}

/**
 * Colunas de `race_positions` que o papel `authenticated` pode ler.
 *
 * `bind_code` NÃO está na lista, e o grant do banco é por coluna: um
 * `select("*")` aqui volta como "permission denied" e a tela fica vazia sem
 * dizer por quê. Quem tem o código vira o GPS daquele veículo, então ele sai
 * por um caminho separado — a função `race_bind_codes`, que confere permissão
 * de edição antes de devolver qualquer coisa.
 */
const POSITION_COLUMNS =
  "id, race_id, role, label, ordinal, driver_name, driver_phone, vehicle_plate, is_reference_lead, is_reference_sweep, is_dispatchable, bind_code_issued_at, bind_code_expires_at, bind_code_revoked_at, created_at, updated_at";

/**
 * Carrega tudo que as telas de preparação da prova compartilham.
 *
 * Envolto em `cache()` do React: o layout da prova e a página dentro dele
 * precisam dos mesmos dados, e sem isso cada navegação faria as mesmas quatro
 * consultas duas vezes.
 *
 * Nenhum filtro por dono aqui de propósito — quem filtra é o RLS. Se o usuário
 * não é membro da prova, o SELECT volta vazio e a página vira 404, que é a
 * resposta certa: "não existe para você" não vaza nem a existência do evento.
 */
export const getRaceContext = cache(
  async (raceId: string): Promise<RaceContext> => {
    const { supabase, user } = await requireUser();

    if (!isUuid(raceId)) notFound();

    const [raceRes, positionsRes, trackRes, canEditRes, codesRes] =
      await Promise.all([
        supabase.from("races").select("*").eq("id", raceId).maybeSingle(),
        supabase
          .from("race_positions")
          .select(POSITION_COLUMNS)
          .eq("race_id", raceId)
          .order("ordinal", { ascending: true }),
        supabase
          .from("route_tracks")
          .select(
            "id, name, source, original_filename, total_distance_m, point_count, elevation_gain_m, bbox, created_at",
          )
          .eq("race_id", raceId)
          .eq("is_active", true)
          .maybeSingle(),
        supabase.rpc("can_edit_race", { p_race_id: raceId }),
        // Levanta exceção para quem só observa a prova; o erro vem no envelope
        // e o mapa fica vazio, que é o comportamento certo.
        supabase.rpc("race_bind_codes", { p_race_id: raceId }),
      ]);

    const race = raceRes.data as Race | null;
    if (!race) notFound();

    const positions = ((positionsRes.data ?? []) as unknown[]).map(
      (row) => ({ ...(row as object), bind_code: "" }) as RacePosition,
    );
    const activeTrack = (trackRes.data ?? null) as ActiveTrackSummary | null;

    const bindCodes = new Map<
      string,
      { code: string; expiresAt: string | null }
    >();
    for (const linha of (codesRes.data ?? []) as Array<{
      position_id: string;
      bind_code: string;
      expires_at: string | null;
    }>) {
      bindCodes.set(linha.position_id, {
        code: linha.bind_code,
        expiresAt: linha.expires_at,
      });
    }

    for (const p of positions) {
      p.bind_code = bindCodes.get(p.id)?.code ?? "";
    }

    const readiness = computeReadiness({
      hasActiveRoute: activeTrack !== null,
      positionCount: positions.length,
      hasReferenceLead: positions.some((p) => p.is_reference_lead),
      hasReferenceSweep: positions.some((p) => p.is_reference_sweep),
      hasScheduledStart: race.scheduled_start !== null,
    });

    return {
      supabase,
      user,
      race,
      positions,
      activeTrack,
      readiness,
      canEdit: canEditRes.data === true,
      bindCodes,
    };
  },
);

/**
 * Verificação de permissão para as ações de escrita.
 *
 * O RLS já barraria a escrita, mas o erro dele é um 42501 seco no meio de um
 * update — e o diretor merece saber que perdeu o acesso à prova antes de
 * preencher o formulário inteiro.
 */
export async function requireEditableRace(raceId: string): Promise<{
  supabase: SupabaseClient;
  user: User;
}> {
  const { supabase, user } = await requireUser();

  const { t } = await getTranslator();

  if (!isUuid(raceId)) {
    throw new PermissaoNegadaError(t("errors.raceNotFound"));
  }

  const { data, error } = await supabase.rpc("can_edit_race", {
    p_race_id: raceId,
  });

  if (error || data !== true) {
    throw new PermissaoNegadaError(t("errors.forbidden"));
  }

  return { supabase, user };
}

export class PermissaoNegadaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissaoNegadaError";
  }
}
