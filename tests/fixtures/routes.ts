/**
 * Percursos sintéticos para teste, construídos com geometria conhecida para
 * que os valores esperados sejam calculáveis à mão em vez de "o que o código
 * devolveu da primeira vez".
 */

import {
  fromLocalMeters,
  localFrame,
  type LatLng,
} from "@/lib/geo/distance";
import { buildRouteTrack, type RawRoutePoint } from "@/lib/route/track";

/** Origem no Piemonte, Itália — perto de onde as provas de verdade acontecem. */
export const ORIGIN: LatLng = { lat: 44.9, lng: 7.6 };

const FRAME = localFrame(ORIGIN);

export function xyToLatLng(x: number, y: number): LatLng {
  return fromLocalMeters(FRAME, x, y);
}

export interface HairpinRoute {
  points: RawRoutePoint[];
  /** Offsets aproximados dos marcos da geometria, em metros. */
  marks: {
    leg1Start: number;
    leg1End: number;
    hairpinEnd: number;
    leg2End: number;
    finish: number;
  };
}

/**
 * Estrada de montanha com um grampo: 4 km para leste, retorno de 180° e 4 km
 * de volta para oeste apenas 80 m ao norte da ida, depois 2 km para o norte.
 *
 * A propriedade que interessa: dois pontos separados por 80 m em linha reta
 * (um em cada perna) estão a mais de 8 km um do outro pela estrada. Qualquer
 * cálculo que confunda os dois erra por duas ordens de grandeza — e é
 * exatamente esse erro que faria o diretor liberar uma rua com o pelotão ainda
 * dentro dela.
 */
export function buildHairpinRoute(spacingM = 10): HairpinRoute {
  const points: RawRoutePoint[] = [];
  const push = (x: number, y: number, ele: number) =>
    points.push({ ...xyToLatLng(x, y), ele });

  const LEG_M = 4000;
  const OFFSET_Y = 80;
  const RADIUS = OFFSET_Y / 2;
  const FINAL_LEG_M = 2000;

  // Perna 1: oeste → leste em y = 0.
  for (let x = 0; x <= LEG_M; x += spacingM) {
    push(x, 0, 300 + x * 0.01);
  }

  // Grampo: semicírculo de raio 40 m centrado em (4000, 40).
  const arcSteps = Math.max(8, Math.ceil((Math.PI * RADIUS) / spacingM));
  for (let i = 1; i <= arcSteps; i++) {
    const theta = -Math.PI / 2 + (Math.PI * i) / arcSteps;
    push(
      LEG_M + RADIUS * Math.cos(theta),
      RADIUS + RADIUS * Math.sin(theta),
      340,
    );
  }

  // Perna 2: leste → oeste em y = 80.
  for (let x = LEG_M - spacingM; x >= 0; x -= spacingM) {
    push(x, OFFSET_Y, 340 - (LEG_M - x) * 0.005);
  }

  // Perna 3: sobe 2 km para o norte.
  for (let y = OFFSET_Y + spacingM; y <= OFFSET_Y + FINAL_LEG_M; y += spacingM) {
    push(0, y, 320 + (y - OFFSET_Y) * 0.02);
  }

  const arcLen = Math.PI * RADIUS;

  return {
    points,
    marks: {
      leg1Start: 0,
      leg1End: LEG_M,
      hairpinEnd: LEG_M + arcLen,
      leg2End: LEG_M + arcLen + LEG_M,
      finish: LEG_M + arcLen + LEG_M + FINAL_LEG_M,
    },
  };
}

export function buildHairpinTrack(spacingM = 10) {
  const route = buildHairpinRoute(spacingM);
  const built = buildRouteTrack(route.points);
  return { ...built, marks: route.marks, raw: route.points };
}

/** Reta simples de 1 km para leste — geometria trivial, valores exatos. */
export function buildStraightTrack(lengthM = 1000, spacingM = 10) {
  const points: RawRoutePoint[] = [];
  for (let x = 0; x <= lengthM; x += spacingM) {
    points.push({ ...xyToLatLng(x, 0), ele: 100 });
  }
  return buildRouteTrack(points);
}

/** Gera um GPX textual a partir de pontos — para testar o leitor de verdade. */
export function toGpxXml(
  points: RawRoutePoint[],
  opts: { name?: string; kind?: "trk" | "rte" } = {},
): string {
  const name = opts.name ?? "Percurso de teste";
  const kind = opts.kind ?? "trk";

  const body =
    kind === "trk"
      ? `  <trk>
    <name>${name}</name>
    <trkseg>
${points
  .map(
    (p) =>
      `      <trkpt lat="${p.lat.toFixed(7)}" lon="${p.lng.toFixed(7)}">${
        p.ele != null ? `<ele>${p.ele.toFixed(1)}</ele>` : ""
      }</trkpt>`,
  )
  .join("\n")}
    </trkseg>
  </trk>`
      : `  <rte>
    <name>${name}</name>
${points
  .map(
    (p) =>
      `    <rtept lat="${p.lat.toFixed(7)}" lon="${p.lng.toFixed(7)}"></rtept>`,
  )
  .join("\n")}
  </rte>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="flamme-rouge-tests" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${name}</name></metadata>
${body}
</gpx>`;
}
