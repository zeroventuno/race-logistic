/**
 * Primitivas geodésicas.
 *
 * Duas famílias de função aqui, com propósitos diferentes:
 *
 *  - `haversineMeters` — distância verdadeira sobre a esfera. Usada para medir
 *    comprimento de percurso e distância em linha reta entre veículos.
 *
 *  - `toLocalMeters` / `projectPointOnSegment` — projeção plana local. Projetar
 *    um ponto sobre um segmento é um problema de álgebra linear, e fazer isso
 *    direto em lat/lng dá erro grosseiro fora do equador (um grau de longitude
 *    vale ~111 km na linha do equador e ~78 km em Roma). Convertendo para
 *    metros locais primeiro, a projeção fica correta; sobre distâncias de
 *    centenas de metros o erro da aproximação plana é milimétrico.
 */

export const EARTH_RADIUS_M = 6_371_008.8;

export interface LatLng {
  lat: number;
  lng: number;
}

const DEG_TO_RAD = Math.PI / 180;

/**
 * Metros por grau, derivados do MESMO raio usado pelo haversine.
 *
 * Isso não é preciosismo. Se as constantes do referencial plano viessem do
 * raio equatorial do WGS84 (6 378 137 m) enquanto o haversine usa o raio médio
 * (6 371 008,8 m), as duas famílias de função discordariam em 0,11%. Dentro de
 * um segmento de 10 m isso é irrelevante, mas o referencial plano também é
 * usado para converter posições ao longo de percursos de dezenas de
 * quilômetros — e aí 0,11% vira mais de 100 m de discordância entre "onde o
 * sistema diz que o veículo está" e "que quilômetro da prova é esse".
 * Ancorar tudo na mesma esfera elimina a classe inteira de erro.
 */
export const METERS_PER_DEG_LAT = (EARTH_RADIUS_M * Math.PI) / 180;

/** Metros por grau de longitude na latitude dada — encolhe com o cosseno. */
export function metersPerDegLng(latDeg: number): number {
  return METERS_PER_DEG_LAT * Math.cos(latDeg * DEG_TO_RAD);
}

/** Distância sobre a esfera, em metros. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * DEG_TO_RAD;
  const dLng = (b.lng - a.lng) * DEG_TO_RAD;
  const lat1 = a.lat * DEG_TO_RAD;
  const lat2 = b.lat * DEG_TO_RAD;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface LocalFrame {
  lat0: number;
  lng0: number;
  mPerLat: number;
  mPerLng: number;
}

/** Cria um referencial plano local ancorado num ponto. */
export function localFrame(origin: LatLng): LocalFrame {
  return {
    lat0: origin.lat,
    lng0: origin.lng,
    mPerLat: METERS_PER_DEG_LAT,
    mPerLng: metersPerDegLng(origin.lat),
  };
}

/** Converte lat/lng para coordenadas planas em metros dentro do referencial. */
export function toLocalMeters(
  frame: LocalFrame,
  p: LatLng,
): { x: number; y: number } {
  return {
    x: (p.lng - frame.lng0) * frame.mPerLng,
    y: (p.lat - frame.lat0) * frame.mPerLat,
  };
}

/** Converte metros locais de volta para lat/lng. */
export function fromLocalMeters(
  frame: LocalFrame,
  x: number,
  y: number,
): LatLng {
  return {
    lat: frame.lat0 + y / frame.mPerLat,
    lng: frame.lng0 + x / frame.mPerLng,
  };
}

export interface SegmentProjection {
  /** Fração ao longo do segmento, sempre presa em [0, 1]. */
  t: number;
  /** Ponto mais próximo sobre o segmento. */
  point: LatLng;
  /** Distância perpendicular do ponto original ao segmento, em metros. */
  distanceM: number;
}

/**
 * Projeta `p` sobre o segmento `a`→`b`, retornando o ponto mais próximo.
 *
 * `t` é preso em [0, 1] — se o pé da perpendicular cai fora do segmento, o
 * ponto mais próximo é um dos extremos. Isso importa: sem o clamp, um veículo
 * parado num cruzamento seria "projetado" quilômetros à frente sobre a reta
 * infinita que contém o segmento.
 */
export function projectPointOnSegment(
  p: LatLng,
  a: LatLng,
  b: LatLng,
): SegmentProjection {
  const frame = localFrame(a);
  const pa = toLocalMeters(frame, a);
  const pb = toLocalMeters(frame, b);
  const pp = toLocalMeters(frame, p);

  const dx = pb.x - pa.x;
  const dy = pb.y - pa.y;
  const lenSq = dx * dx + dy * dy;

  // Segmento degenerado (dois pontos idênticos): o ponto mais próximo é `a`.
  if (lenSq < 1e-12) {
    return { t: 0, point: a, distanceM: haversineMeters(p, a) };
  }

  const rawT = ((pp.x - pa.x) * dx + (pp.y - pa.y) * dy) / lenSq;
  const t = rawT < 0 ? 0 : rawT > 1 ? 1 : rawT;

  const closest = fromLocalMeters(frame, pa.x + t * dx, pa.y + t * dy);

  return { t, point: closest, distanceM: haversineMeters(p, closest) };
}

/** Rumo inicial de `a` para `b`, em graus (0 = norte, sentido horário). */
export function bearingDegrees(a: LatLng, b: LatLng): number {
  const lat1 = a.lat * DEG_TO_RAD;
  const lat2 = b.lat * DEG_TO_RAD;
  const dLng = (b.lng - a.lng) * DEG_TO_RAD;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return (Math.atan2(y, x) / DEG_TO_RAD + 360) % 360;
}

/**
 * Ponto a `distanceM` metros de `origin` no rumo `bearingDeg`.
 * Usado para construir percursos sintéticos nos testes e para mover os
 * veículos do simulador.
 */
export function destinationPoint(
  origin: LatLng,
  bearingDeg: number,
  distanceM: number,
): LatLng {
  const δ = distanceM / EARTH_RADIUS_M;
  const θ = bearingDeg * DEG_TO_RAD;
  const φ1 = origin.lat * DEG_TO_RAD;
  const λ1 = origin.lng * DEG_TO_RAD;

  const sinφ2 =
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ);
  const φ2 = Math.asin(sinφ2);
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * sinφ2,
    );

  return {
    lat: φ2 / DEG_TO_RAD,
    lng: (((λ2 / DEG_TO_RAD + 540) % 360) - 180),
  };
}

/** Interpola entre dois pontos (linear no plano local — ok para segmentos curtos). */
export function interpolate(a: LatLng, b: LatLng, t: number): LatLng {
  const frame = localFrame(a);
  const pa = toLocalMeters(frame, a);
  const pb = toLocalMeters(frame, b);
  return fromLocalMeters(
    frame,
    pa.x + (pb.x - pa.x) * t,
    pa.y + (pb.y - pa.y) * t,
  );
}
