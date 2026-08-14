/**
 * Representação do percurso e índice espacial.
 *
 * A ideia central do sistema todo está aqui: o percurso é tratado como uma
 * *linha referenciada*. Cada vértice carrega sua distância cumulativa desde a
 * largada, então a posição de qualquer veículo vira um único número — quantos
 * metros de prova ele já percorreu. Com isso:
 *
 *   - a distância entre dois veículos é uma subtração, e é a distância pela
 *     estrada, não pelo ar;
 *   - "onde estará o vassoura daqui a 10 min" é uma soma seguida de uma busca
 *     binária;
 *   - um percurso em U não confunde o cálculo: dois veículos a 50 m um do
 *     outro em linha reta, mas em pernas opostas do U, aparecem corretamente
 *     como estando a 8 km um do outro.
 */

import {
  bearingDegrees,
  haversineMeters,
  interpolate,
  type LatLng,
} from "@/lib/geo/distance";

/** Formato compacto de persistência: [lng, lat, distância cumulativa, elevação]. */
export type RoutePointTuple = [number, number, number, number | null];

export interface BBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface RouteTrack {
  points: RoutePointTuple[];
  totalDistanceM: number;
  bbox: BBox;
  elevationGainM: number | null;
}

export interface RawRoutePoint {
  lat: number;
  lng: number;
  ele?: number | null;
}

/** Descarta pontos consecutivos mais próximos que isto (ruído de GPS parado). */
const MIN_VERTEX_SPACING_M = 0.5;

/**
 * Salto absurdo entre dois pontos consecutivos de um GPX. Acima disso, o
 * arquivo provavelmente tem um artefato (pausa na gravação, sinal perdido em
 * túnel) e somar essa distância inflaria o comprimento da prova.
 */
const MAX_PLAUSIBLE_VERTEX_JUMP_M = 5_000;

export interface BuildTrackResult {
  track: RouteTrack;
  /** Problemas encontrados que o diretor precisa ver antes de confirmar. */
  warnings: string[];
}

/**
 * Constrói um percurso a partir de pontos crus, calculando a distância
 * cumulativa em cada vértice.
 */
export function buildRouteTrack(raw: RawRoutePoint[]): BuildTrackResult {
  const warnings: string[] = [];

  const valid = raw.filter(
    (p) =>
      Number.isFinite(p.lat) &&
      Number.isFinite(p.lng) &&
      p.lat >= -90 &&
      p.lat <= 90 &&
      p.lng >= -180 &&
      p.lng <= 180,
  );

  if (valid.length !== raw.length) {
    warnings.push(
      `${raw.length - valid.length} ponto(s) com coordenada inválida foram descartados.`,
    );
  }

  if (valid.length < 2) {
    throw new RouteTrackError(
      "O percurso precisa de pelo menos 2 pontos válidos.",
    );
  }

  const points: RoutePointTuple[] = [];
  let cum = 0;
  let elevationGain = 0;
  let sawElevation = false;
  let jumpCount = 0;

  const first = valid[0]!;
  points.push([first.lng, first.lat, 0, first.ele ?? null]);
  if (first.ele != null) sawElevation = true;

  let prev: RawRoutePoint = first;

  for (let i = 1; i < valid.length; i++) {
    const cur = valid[i]!;
    const step = haversineMeters(prev, cur);

    // Vértices coincidentes só engordam o array e criam segmentos degenerados
    // no snap. O último ponto é sempre mantido para não encurtar a prova.
    if (step < MIN_VERTEX_SPACING_M && i !== valid.length - 1) {
      continue;
    }

    if (step > MAX_PLAUSIBLE_VERTEX_JUMP_M) {
      jumpCount++;
    }

    cum += step;

    if (cur.ele != null) {
      sawElevation = true;
      if (prev.ele != null && cur.ele > prev.ele) {
        elevationGain += cur.ele - prev.ele;
      }
    }

    points.push([cur.lng, cur.lat, cum, cur.ele ?? null]);
    prev = cur;
  }

  if (jumpCount > 0) {
    warnings.push(
      `${jumpCount} salto(s) acima de ${MAX_PLAUSIBLE_VERTEX_JUMP_M / 1000} km entre pontos consecutivos — verifique se o GPX tem trechos faltando.`,
    );
  }

  if (points.length < 2) {
    throw new RouteTrackError(
      "Depois de remover pontos duplicados sobrou menos de 2 pontos.",
    );
  }

  if (cum < 100) {
    warnings.push(
      `O percurso tem apenas ${cum.toFixed(0)} m. Confirme se é isso mesmo.`,
    );
  }

  return {
    track: {
      points,
      totalDistanceM: cum,
      bbox: computeBBox(points),
      elevationGainM: sawElevation ? elevationGain : null,
    },
    warnings,
  };
}

export class RouteTrackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RouteTrackError";
  }
}

export function computeBBox(points: RoutePointTuple[]): BBox {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of points) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  return { minLng, minLat, maxLng, maxLat };
}

/** Posição geográfica a `offsetM` metros da largada, ao longo do percurso. */
export function positionAtOffset(track: RouteTrack, offsetM: number): LatLng {
  const pts = track.points;
  const clamped = Math.max(0, Math.min(track.totalDistanceM, offsetM));

  const i = findSegmentIndex(track, clamped);
  const a = pts[i]!;
  const b = pts[i + 1];

  if (!b) {
    return { lat: a[1], lng: a[0] };
  }

  const segLen = b[2] - a[2];
  const t = segLen > 0 ? (clamped - a[2]) / segLen : 0;

  return interpolate({ lat: a[1], lng: a[0] }, { lat: b[1], lng: b[0] }, t);
}

/** Rumo do percurso no offset dado — usado para orientar o ícone do veículo. */
export function headingAtOffset(
  track: RouteTrack,
  offsetM: number,
): number | null {
  const pts = track.points;
  if (pts.length < 2) return null;

  const i = findSegmentIndex(track, offsetM);
  const a = pts[i]!;
  const b = pts[i + 1] ?? pts[i - 1];
  if (!b) return null;

  return bearingDegrees({ lat: a[1], lng: a[0] }, { lat: b[1], lng: b[0] });
}

/**
 * Índice do segmento que contém `offsetM`. Busca binária sobre a cumulativa —
 * é o que mantém o custo em O(log n) mesmo num GPX de 20 mil pontos.
 */
export function findSegmentIndex(track: RouteTrack, offsetM: number): number {
  const pts = track.points;
  let lo = 0;
  let hi = pts.length - 1;

  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (pts[mid]![2] <= offsetM) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  // Devolve sempre um índice que tem um sucessor, exceto num percurso de 1 ponto.
  return Math.min(lo, Math.max(0, pts.length - 2));
}

// ---------------------------------------------------------------------------
// Índice espacial
// ---------------------------------------------------------------------------

const GRID_CELL_M = 250;

/**
 * Grade uniforme que mapeia célula → segmentos que a atravessam.
 *
 * Sem isso, achar o segmento mais próximo de um ping custa uma varredura em
 * todos os segmentos do percurso. Com 12 veículos a 1 Hz num percurso de
 * 20 mil pontos isso seria 240 mil testes de projeção por segundo, no servidor,
 * durante horas. Com a grade, cada ping olha algumas dezenas de candidatos.
 */
export class RouteIndex {
  readonly track: RouteTrack;
  private readonly cells = new Map<number, number[]>();
  private readonly originLat: number;
  private readonly originLng: number;
  private readonly cellDegLat: number;
  private readonly cellDegLng: number;
  private readonly cols: number;

  constructor(track: RouteTrack) {
    this.track = track;

    const { minLat, minLng, maxLat, maxLng } = track.bbox;
    this.originLat = minLat;
    this.originLng = minLng;

    const midLat = (minLat + maxLat) / 2;
    this.cellDegLat = GRID_CELL_M / 111_132.954;
    this.cellDegLng =
      GRID_CELL_M /
      Math.max(1, 111_319.488 * Math.cos((midLat * Math.PI) / 180));

    this.cols =
      Math.max(1, Math.ceil((maxLng - minLng) / this.cellDegLng)) + 2;

    this.buildIndex();
  }

  private cellKey(ix: number, iy: number): number {
    return iy * this.cols + ix;
  }

  private cellOf(lat: number, lng: number): { ix: number; iy: number } {
    return {
      ix: Math.floor((lng - this.originLng) / this.cellDegLng),
      iy: Math.floor((lat - this.originLat) / this.cellDegLat),
    };
  }

  private buildIndex(): void {
    const pts = this.track.points;

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;

      // Rasteriza o segmento: caminha por ele em passos de meia célula e
      // registra o segmento em cada célula tocada. Mais simples que um
      // algoritmo de linha exato e nunca deixa um buraco.
      const segLen = b[2] - a[2];
      const steps = Math.max(1, Math.ceil((segLen * 2) / GRID_CELL_M));

      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const lng = a[0] + (b[0] - a[0]) * t;
        const lat = a[1] + (b[1] - a[1]) * t;
        const { ix, iy } = this.cellOf(lat, lng);

        // Registra também nas 8 células vizinhas: um ponto consultado perto da
        // borda de uma célula precisa enxergar o segmento da célula ao lado.
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const key = this.cellKey(ix + dx, iy + dy);
            let bucket = this.cells.get(key);
            if (!bucket) {
              bucket = [];
              this.cells.set(key, bucket);
            }
            if (bucket[bucket.length - 1] !== i) {
              bucket.push(i);
            }
          }
        }
      }
    }
  }

  /** Segmentos candidatos perto de um ponto, expandindo o raio se necessário. */
  candidatesNear(p: LatLng, maxRings = 4): number[] {
    const { ix, iy } = this.cellOf(p.lat, p.lng);

    for (let ring = 0; ring <= maxRings; ring++) {
      const found = new Set<number>();

      for (let dx = -ring; dx <= ring; dx++) {
        for (let dy = -ring; dy <= ring; dy++) {
          // Só a casca do anel — o interior já foi visto na iteração anterior.
          if (ring > 0 && Math.abs(dx) !== ring && Math.abs(dy) !== ring) {
            continue;
          }
          const bucket = this.cells.get(this.cellKey(ix + dx, iy + dy));
          if (bucket) {
            for (const seg of bucket) found.add(seg);
          }
        }
      }

      if (found.size > 0) {
        return [...found];
      }
    }

    return [];
  }
}
