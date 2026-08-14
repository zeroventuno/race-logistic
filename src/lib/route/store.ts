import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { RouteIndex, type RouteTrack } from "@/lib/route/track";
import type { RouteTrackRow } from "@/lib/types";

/**
 * Carrega o percurso ativo de uma prova e mantém o índice espacial em memória.
 *
 * Construir o `RouteIndex` custa uma passada por todos os segmentos do
 * percurso. Fazer isso a cada ping recebido significaria reconstruir uma grade
 * de 20 mil segmentos dezenas de vezes por segundo — o servidor derreteria com
 * três veículos.
 *
 * O cache é por instância (cada função serverless tem a sua, e instâncias vão
 * e voltam). Isso é aceitável porque o percurso é imutável depois que a prova
 * começa: `route_tracks` nunca é atualizado no lugar, um percurso novo é uma
 * linha nova com `is_active = true` e a anterior vira `false`. A chave do
 * cache inclui o id do percurso, então trocar o traçado invalida naturalmente.
 */

interface CacheEntry {
  trackId: string;
  track: RouteTrack;
  index: RouteIndex;
  loadedAtMs: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * TTL curto. Não é para invalidar o percurso (ele não muda), é para o processo
 * não segurar indefinidamente a geometria de provas que já terminaram.
 */
const CACHE_TTL_MS = 30 * 60 * 1000;

export interface LoadedRoute {
  trackId: string;
  track: RouteTrack;
  index: RouteIndex;
}

export async function loadRaceRoute(
  raceId: string,
): Promise<LoadedRoute | null> {
  const cached = cache.get(raceId);
  if (cached && Date.now() - cached.loadedAtMs < CACHE_TTL_MS) {
    return {
      trackId: cached.trackId,
      track: cached.track,
      index: cached.index,
    };
  }

  const { data, error } = await supabaseAdmin()
    .from("route_tracks")
    .select("id, points, total_distance_m, bbox, elevation_gain_m")
    .eq("race_id", raceId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar o percurso da prova: ${error.message}`);
  }

  if (!data) {
    cache.delete(raceId);
    return null;
  }

  const row = data as Pick<
    RouteTrackRow,
    "id" | "points" | "total_distance_m" | "bbox" | "elevation_gain_m"
  >;

  const track: RouteTrack = {
    points: row.points,
    totalDistanceM: row.total_distance_m,
    bbox: row.bbox,
    elevationGainM: row.elevation_gain_m,
  };

  const entry: CacheEntry = {
    trackId: row.id,
    track,
    index: new RouteIndex(track),
    loadedAtMs: Date.now(),
  };

  cache.set(raceId, entry);

  return { trackId: entry.trackId, track: entry.track, index: entry.index };
}

/** Invalida o cache — chamar quando o diretor substitui o percurso. */
export function invalidateRouteCache(raceId: string): void {
  cache.delete(raceId);
}
