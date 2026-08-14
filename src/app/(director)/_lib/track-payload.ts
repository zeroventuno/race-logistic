/**
 * Contrato de rede entre o editor de percurso (browser) e `POST /api/races/:id/track`.
 *
 * Decisão central: o browser manda os PONTOS CRUS, não o percurso já calculado.
 * O servidor roda `buildRouteTrack` e `simplifyToBudget` de novo. Custa alguns
 * milissegundos e garante que a distância gravada saiu do mesmo código para
 * todo mundo — um cliente com bug (ou adulterado) não consegue gravar uma prova
 * de "5 km" que na verdade tem 120 km e falsear todos os cálculos de janela.
 *
 * O preview mostrado ao diretor antes de confirmar roda exatamente as mesmas
 * funções sobre a mesma entrada, então o número da tela é o número do banco.
 */

import type { RawRoutePoint } from "@/lib/route/track";
import type { RoutePointTuple } from "@/lib/types";

/** Formato de fio de um ponto cru: `[lat, lng, elevação|null]`. */
export type WirePoint = [number, number, number | null];

/**
 * Teto de pontos aceitos numa submissão.
 *
 * 120 mil pontos cobre com folga um GPX de 1 s de amostragem numa prova de
 * 12 horas. Acima disso o arquivo quase certamente é uma trilha de treino
 * inteira, não um percurso de prova — e aceitar transformaria um erro de
 * seleção de arquivo num JSON de dezenas de MB indo para o Postgres.
 */
export const MAX_UPLOAD_POINTS = 120_000;

/** Teto de vértices desenhados à mão. Passar disso é sinal de clique acidental. */
export const MAX_DRAWN_POINTS = 5_000;

/** Teto de pontos que o mapa recebe para desenhar. Ver `simplifyToBudget`. */
export const RENDER_POINT_BUDGET = 3_000;

export interface TrackUploadBody {
  source: "gpx" | "drawn";
  name: string | null;
  originalFilename: string | null;
  points: WirePoint[];
}

export interface TrackUploadResult {
  trackId: string;
  totalDistanceM: number;
  pointCount: number;
  renderPointCount: number;
  elevationGainM: number | null;
  replacedTrackId: string | null;
  warnings: string[];
}

export function toWirePoints(points: RawRoutePoint[]): WirePoint[] {
  return points.map((p) => [
    round(p.lat, 7),
    round(p.lng, 7),
    p.ele == null || !Number.isFinite(p.ele) ? null : round(p.ele, 1),
  ]);
}

export function fromWirePoints(points: WirePoint[]): RawRoutePoint[] {
  return points.map(([lat, lng, ele]) => ({ lat, lng, ele }));
}

export interface WireValidation {
  ok: boolean;
  /** Mensagem pronta para a tela, em português. */
  error?: string;
  points?: WirePoint[];
}

/**
 * Valida o array de pontos à mão em vez de com zod.
 *
 * Um schema de zod sobre 100 mil tuplas constrói 100 mil objetos de resultado
 * antes de responder qualquer coisa. Aqui a varredura é uma passada e para no
 * primeiro ponto ruim, dizendo qual é o índice — que é o que ajuda quem está
 * tentando entender por que o arquivo dele não entra.
 */
export function validateWirePoints(value: unknown): WireValidation {
  if (!Array.isArray(value)) {
    return { ok: false, error: "A lista de pontos do percurso não veio." };
  }

  if (value.length < 2) {
    return {
      ok: false,
      error: "O percurso precisa de pelo menos 2 pontos.",
    };
  }

  if (value.length > MAX_UPLOAD_POINTS) {
    return {
      ok: false,
      error: `O percurso tem ${value.length.toLocaleString("pt-BR")} pontos, acima do limite de ${MAX_UPLOAD_POINTS.toLocaleString("pt-BR")}. Recorte o arquivo para o trecho da prova antes de enviar.`,
    };
  }

  const out: WirePoint[] = new Array(value.length);

  for (let i = 0; i < value.length; i++) {
    const p: unknown = value[i];
    if (!Array.isArray(p) || p.length < 2) {
      return { ok: false, error: `O ponto ${i + 1} está malformado.` };
    }

    const lat = Number(p[0]);
    const lng = Number(p[1]);
    const eleRaw = p[2];

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return {
        ok: false,
        error: `O ponto ${i + 1} tem latitude inválida (${String(p[0])}).`,
      };
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return {
        ok: false,
        error: `O ponto ${i + 1} tem longitude inválida (${String(p[1])}).`,
      };
    }

    const ele =
      eleRaw == null || !Number.isFinite(Number(eleRaw)) ? null : Number(eleRaw);

    out[i] = [lat, lng, ele];
  }

  return { ok: true, points: out };
}

/**
 * Encolhe a geometria antes de virar JSONB.
 *
 * Sete casas de latitude são ~1 cm — mais que suficiente, e evita gravar
 * `44.90000000000001` (17 caracteres) num array de 40 mil pontos. A cumulativa
 * fica em milímetros, folgada em relação ao espaçamento mínimo de 0,5 m entre
 * vértices, então continua estritamente crescente e a busca binária do
 * `findSegmentIndex` não é afetada.
 */
export function compactTrackPoints(
  points: RoutePointTuple[],
): RoutePointTuple[] {
  return points.map(([lng, lat, cum, ele]) => [
    round(lng, 7),
    round(lat, 7),
    round(cum, 3),
    ele == null ? null : round(ele, 1),
  ]);
}

export function compactRenderPoints(
  points: Array<{ lat: number; lng: number }>,
): [number, number][] {
  return points.map((p) => [round(p.lng, 6), round(p.lat, 6)]);
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
