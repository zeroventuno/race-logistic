#!/usr/bin/env node
/**
 * Baixa um percurso REAL de estrada e grava como GPX para os testes.
 *
 * Percurso sintético não serve para validar o cálculo: uma linha desenhada à
 * mão tem curvas suaves e regulares, enquanto uma estrada de verdade tem
 * grampos de 15 m de raio, trechos que passam a 30 m de si mesmos, e densidade
 * de vértices irregular. É justamente nessa geometria que o snap ingênuo
 * quebra — então é com ela que temos que testar.
 *
 * Fonte: OSRM público (roteamento sobre dados do OpenStreetMap), sem chave.
 * Traçado: circuito clássico das Langhe (Piemonte) — Alba, La Morra, Barolo,
 * Monforte, Serralunga. Estrada real de ciclismo, cheia de curvas fechadas.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "tests", "fixtures", "real-route.gpx");

// [lng, lat] — ordem exigida pelo OSRM.
const WAYPOINTS = [
  [8.0350, 44.7009], // Alba
  [7.9370, 44.6383], // La Morra
  [7.9430, 44.6110], // Barolo
  [7.9700, 44.5850], // Monforte d'Alba
  [8.0000, 44.6180], // Serralunga d'Alba
  [8.0350, 44.7009], // volta a Alba
];

const url =
  "https://router.project-osrm.org/route/v1/driving/" +
  WAYPOINTS.map(([lng, lat]) => `${lng},${lat}`).join(";") +
  "?overview=full&geometries=geojson&continue_straight=false";

console.log("  Buscando percurso real no OSRM...");

const res = await fetch(url, {
  headers: { "User-Agent": "flamme-rouge-dev/0.1 (teste de percurso)" },
});

if (!res.ok) {
  console.error(`  OSRM devolveu ${res.status}. Tente de novo em instantes.`);
  process.exit(1);
}

const data = await res.json();

if (data.code !== "Ok" || !data.routes?.[0]) {
  console.error(`  OSRM não conseguiu rotear: ${data.code} ${data.message ?? ""}`);
  process.exit(1);
}

const route = data.routes[0];
const coords = route.geometry.coordinates; // [[lng, lat], ...]

console.log(
  `  ${coords.length} pontos, ${(route.distance / 1000).toFixed(1)} km segundo o OSRM.`,
);

// Elevação sintética plausível para as Langhe (200–500 m), só para o leitor de
// GPX ter o que ler. Não é usada em nenhum cálculo de distância.
const ele = (i) =>
  (250 + 140 * Math.sin((i / coords.length) * Math.PI * 6) + 60 * Math.sin(i / 40)).toFixed(1);

const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="flamme-rouge/fetch-real-gpx" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Giro delle Langhe — Alba / La Morra / Barolo / Monforte / Serralunga</name>
    <desc>Percurso real sobre estradas do OpenStreetMap, roteado via OSRM. ${(route.distance / 1000).toFixed(1)} km.</desc>
  </metadata>
  <trk>
    <name>Giro delle Langhe</name>
    <trkseg>
${coords
  .map(
    ([lng, lat], i) =>
      `      <trkpt lat="${lat.toFixed(7)}" lon="${lng.toFixed(7)}"><ele>${ele(i)}</ele></trkpt>`,
  )
  .join("\n")}
    </trkseg>
  </trk>
</gpx>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, gpx, "utf8");

console.log(`  Gravado em tests/fixtures/real-route.gpx (${(gpx.length / 1024).toFixed(0)} KB)`);
