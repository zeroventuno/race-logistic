/**
 * Leitura de GPX.
 *
 * Arquivos de percurso de prova vêm de todo lugar — Strava, Garmin Connect,
 * RideWithGPS, Komoot, planilhas exportadas de software de traçado — e cada um
 * usa uma parte diferente do formato. Um leitor que só entende `<trkpt>` falha
 * na metade dos arquivos que um diretor de prova realmente tem na mão.
 *
 * Este leitor aceita, em ordem de preferência:
 *   - `<trk>/<trkseg>/<trkpt>` — trilha gravada (o mais comum)
 *   - `<rte>/<rtept>`          — rota planejada
 *   - `<wpt>`                  — waypoints soltos, último recurso
 *
 * Múltiplos segmentos de uma mesma trilha são concatenados; múltiplas trilhas
 * viram opções separadas para o diretor escolher, porque juntar duas trilhas
 * distintas em silêncio produziria um percurso com um salto no meio.
 */

import { XMLParser } from "fast-xml-parser";
import type { RawRoutePoint } from "@/lib/route/track";

export class GpxParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GpxParseError";
  }
}

export interface GpxSegment {
  /** Nome vindo do arquivo, quando existe. */
  name: string | null;
  kind: "track" | "route" | "waypoints";
  points: RawRoutePoint[];
}

export interface GpxParseResult {
  segments: GpxSegment[];
  /** Metadados do arquivo, quando presentes. */
  metadataName: string | null;
  warnings: string[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Sem isso, um GPX com um único <trkpt> vira objeto em vez de array e o
  // código de baixo precisaria de um caso especial em cada nível.
  isArray: (name) =>
    ["trk", "trkseg", "trkpt", "rte", "rtept", "wpt"].includes(name),
  parseAttributeValue: false,
  trimValues: true,
});

const MAX_INPUT_BYTES = 25 * 1024 * 1024;

export function parseGpx(xml: string): GpxParseResult {
  if (xml.length === 0) {
    throw new GpxParseError("O arquivo está vazio.");
  }

  if (xml.length > MAX_INPUT_BYTES) {
    throw new GpxParseError(
      `O arquivo tem mais de ${MAX_INPUT_BYTES / 1024 / 1024} MB. Simplifique o GPX antes de enviar.`,
    );
  }

  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xml) as Record<string, unknown>;
  } catch {
    throw new GpxParseError(
      "Não foi possível ler o arquivo como XML. Confirme que é um .gpx válido.",
    );
  }

  const gpx = doc.gpx as Record<string, unknown> | undefined;
  if (!gpx) {
    throw new GpxParseError(
      "O arquivo não tem elemento <gpx> na raiz. Talvez seja TCX, KML ou FIT — converta para GPX primeiro.",
    );
  }

  const warnings: string[] = [];
  const segments: GpxSegment[] = [];

  const metadata = gpx.metadata as Record<string, unknown> | undefined;
  const metadataName = asText(metadata?.name);

  /**
   * Pontos que o arquivo tinha e que não puderam ser lidos.
   *
   * Contar isto não é preciosismo. Um exportador europeu que escreve
   * `lat="44,7009"` com vírgula decimal produz um arquivo que parece válido e
   * do qual metade dos pontos é ilegível. Pior: quando os pontos ilegíveis são
   * um bloco CONTÍGUO — um desvio, uma subida — o percurso não fica "com
   * buracos", ele fica CURTO. Medido num caso de teste: 43% da prova evaporou
   * e nem o leitor nem a construção do percurso disseram uma palavra. Todos os
   * quilômetros da prova ficam deslocados, e o sistema passa a dizer
   * "vassoura no km 30" com o veículo no km 33.
   */
  let droppedPoints = 0;

  const readPoints = (nodes: Record<string, unknown>[]): RawRoutePoint[] => {
    const parsed = nodes.map(toPoint);
    droppedPoints += parsed.filter((p) => p === null).length;
    return parsed.filter(isPoint);
  };

  // --- trilhas -------------------------------------------------------------
  const tracks = (gpx.trk as Record<string, unknown>[] | undefined) ?? [];

  for (const trk of tracks) {
    const segs = (trk.trkseg as Record<string, unknown>[] | undefined) ?? [];
    const points: RawRoutePoint[] = [];
    let segmentCount = 0;

    for (const seg of segs) {
      const trkpts = (seg.trkpt as Record<string, unknown>[] | undefined) ?? [];
      const parsed = readPoints(trkpts);
      if (parsed.length > 0) {
        points.push(...parsed);
        segmentCount++;
      }
    }

    if (points.length >= 2) {
      if (segmentCount > 1) {
        warnings.push(
          `A trilha "${asText(trk.name) ?? "sem nome"}" tem ${segmentCount} segmentos, que foram unidos em sequência. Confira o traçado no mapa antes de confirmar.`,
        );
      }
      segments.push({
        name: asText(trk.name),
        kind: "track",
        points,
      });
    }
  }

  // --- rotas ---------------------------------------------------------------
  const routes = (gpx.rte as Record<string, unknown>[] | undefined) ?? [];

  for (const rte of routes) {
    const rtepts = (rte.rtept as Record<string, unknown>[] | undefined) ?? [];
    const points = readPoints(rtepts);

    if (points.length >= 2) {
      segments.push({
        name: asText(rte.name),
        kind: "route",
        points,
      });
    }
  }

  // --- waypoints soltos ----------------------------------------------------
  if (segments.length === 0) {
    const wpts = (gpx.wpt as Record<string, unknown>[] | undefined) ?? [];
    const points = readPoints(wpts);

    if (points.length >= 2) {
      warnings.push(
        "O arquivo não tem trilha nem rota — o percurso foi montado ligando os waypoints na ordem em que aparecem. Confira o traçado no mapa.",
      );
      segments.push({ name: metadataName, kind: "waypoints", points });
    }
  }

  if (segments.length === 0) {
    throw new GpxParseError(
      "Nenhum ponto de percurso encontrado no arquivo (sem <trkpt>, <rtept> ou <wpt> válidos).",
    );
  }

  if (segments.length > 1) {
    warnings.push(
      `O arquivo tem ${segments.length} percursos. Escolha qual é o da prova.`,
    );
  }

  if (droppedPoints > 0) {
    const kept = segments.reduce((n, s) => n + s.points.length, 0);
    const share = Math.round((droppedPoints / (droppedPoints + kept)) * 100);

    warnings.push(
      `${droppedPoints} ponto(s) do arquivo não puderam ser lidos e foram descartados (${share}% do total). ` +
        `A causa mais comum é vírgula decimal nas coordenadas (lat="44,7009" em vez de lat="44.7009"), ` +
        `que alguns programas exportam conforme a configuração regional. ` +
        `CONFIRA A DISTÂNCIA TOTAL E O TRAÇADO NO MAPA antes de salvar: se os pontos perdidos estiverem em sequência, ` +
        `o percurso fica mais curto do que a prova de verdade e todos os quilômetros ficam deslocados.`,
    );
  }

  return { segments, metadataName, warnings };
}

function toPoint(node: Record<string, unknown>): RawRoutePoint | null {
  const lat = Number(node["@_lat"]);
  const lng = Number(node["@_lon"]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  // 0,0 é o Golfo da Guiné. Nenhuma prova de ciclismo acontece lá, e é o valor
  // que ferramentas quebradas emitem quando não têm coordenada.
  if (lat === 0 && lng === 0) return null;

  const eleRaw = node.ele;
  const ele =
    eleRaw === undefined || eleRaw === null || eleRaw === ""
      ? null
      : Number(eleRaw);

  return {
    lat,
    lng,
    ele: ele !== null && Number.isFinite(ele) ? ele : null,
  };
}

function isPoint(p: RawRoutePoint | null): p is RawRoutePoint {
  return p !== null;
}

function asText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && "#text" in value) {
    return asText((value as Record<string, unknown>)["#text"]);
  }
  return null;
}
