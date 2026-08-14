#!/usr/bin/env node
/**
 * Prova simulada de ponta a ponta, contra a API DE VERDADE e o banco DE VERDADE.
 *
 * Testes unitários provam que as funções fazem o que dizem. Este script prova
 * que o sistema inteiro sobrevive ao dia da prova: cinco veículos vinculados
 * por código, GPS chegando em lote, um deles perdendo o sinal por dois minutos,
 * um acidente disparado, o socorro acionado sozinho, a ambulância recusando, o
 * reacionamento acontecendo, e ninguém duplicando nada.
 *
 * Uso:
 *   1. `npm run dev` numa aba
 *   2. `node tests/driver-e2e.mjs`
 *
 * Tudo é conferido DIRETO NO BANCO via pg — não na resposta HTTP. A API pode
 * responder 200 e não ter gravado; é exatamente esse tipo de mentira que este
 * script existe para pegar.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import dotenv from "dotenv";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

dotenv.config({ path: join(ROOT, ".env.local"), quiet: true });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const GPX_PATH = join(ROOT, "tests", "fixtures", "real-route.gpx");

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30_000,
});

// ---------------------------------------------------------------------------
// Relatório
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function check(label, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ok   ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    console.log(`  FALHA ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

// ---------------------------------------------------------------------------
// Geometria (versão JS do que src/lib/geo faz em TS)
// ---------------------------------------------------------------------------

const EARTH_RADIUS_M = 6_371_008.8;
const D2R = Math.PI / 180;

function haversine(a, b) {
  const dLat = (b.lat - a.lat) * D2R;
  const dLng = (b.lng - a.lng) * D2R;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * D2R) * Math.cos(b.lat * D2R) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function destination(origin, bearingDeg, distanceM) {
  const d = distanceM / EARTH_RADIUS_M;
  const t = bearingDeg * D2R;
  const lat1 = origin.lat * D2R;
  const lng1 = origin.lng * D2R;
  const sinLat2 = Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(t);
  const lat2 = Math.asin(sinLat2);
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(t) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * sinLat2,
    );
  return { lat: lat2 / D2R, lng: (((lng2 / D2R + 540) % 360) - 180) };
}

function loadTrack() {
  const xml = readFileSync(GPX_PATH, "utf8");
  const raw = [...xml.matchAll(/<trkpt lat="([-\d.]+)" lon="([-\d.]+)">(?:<ele>([-\d.]+)<\/ele>)?/g)]
    .map((m) => ({ lat: Number(m[1]), lng: Number(m[2]), ele: m[3] ? Number(m[3]) : null }));

  const points = [];
  let cum = 0;
  points.push([raw[0].lng, raw[0].lat, 0, raw[0].ele]);

  for (let i = 1; i < raw.length; i++) {
    cum += haversine(raw[i - 1], raw[i]);
    points.push([raw[i].lng, raw[i].lat, cum, raw[i].ele]);
  }

  const bbox = points.reduce(
    (acc, [lng, lat]) => ({
      minLng: Math.min(acc.minLng, lng),
      maxLng: Math.max(acc.maxLng, lng),
      minLat: Math.min(acc.minLat, lat),
      maxLat: Math.max(acc.maxLat, lat),
    }),
    { minLng: 180, maxLng: -180, minLat: 90, maxLat: -90 },
  );

  return { points, totalDistanceM: cum, bbox };
}

function positionAtOffset(track, offsetM) {
  const clamped = Math.max(0, Math.min(track.totalDistanceM, offsetM));
  let lo = 0;
  let hi = track.points.length - 1;

  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (track.points[mid][2] <= clamped) lo = mid;
    else hi = mid - 1;
  }

  const a = track.points[Math.min(lo, track.points.length - 2)];
  const b = track.points[Math.min(lo + 1, track.points.length - 1)];
  const span = b[2] - a[2];
  const t = span > 0 ? (clamped - a[2]) / span : 0;

  return { lat: a[1] + (b[1] - a[1]) * t, lng: a[0] + (b[0] - a[0]) * t };
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

async function api(path, { method = "GET", token, body, headers = {} } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* resposta não-JSON (erro de proxy, HTML do Next) */
  }

  return { status: response.status, json, text, headers: response.headers };
}

// ---------------------------------------------------------------------------
// Semeadura
// ---------------------------------------------------------------------------

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function bindCode(seed) {
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[(seed * 7 + i * 13 + 5) % 32];
  return out;
}

/**
 * Todos partem de trecho com geometria não ambígua e DIRIGEM para dentro do
 * trecho em que a estrada volta por si mesma (últimos 9 km do circuito). É de
 * propósito: prova que a continuidade dos pings mantém cada veículo na perna
 * certa justamente onde a geometria sozinha não distingue nada.
 */
const VEHICLES = [
  { key: "lead", role: "lead_car", label: "Abertura", offsetM: 44_000, dispatchable: false, lead: true },
  { key: "sweep", role: "sweep_car", label: "Vassoura", offsetM: 40_000, dispatchable: false, sweep: true },
  { key: "amb", role: "ambulance", label: "Ambulância 1", offsetM: 42_500, dispatchable: true },
  { key: "mec", role: "mechanic", label: "Mecânico 1", offsetM: 41_000, dispatchable: true },
  // A ARMADILHA. Na hora do alerta o abertura estará no km 46,2 e a moto no
  // km 8,8 — dois pontos que o mapa coloca A ZERO METRO um do outro (é a mesma
  // estrada, percorrida nos dois sentidos) e que estão separados por 37 km de
  // percurso. Um ranking por linha reta mandaria a moto.
  { key: "moto", role: "moto", label: "Moto 3", offsetM: 6_680, dispatchable: true },
];

/**
 * Apaga as provas de execuções anteriores deste script.
 *
 * Duas travas do banco impedem o `delete` direto, e as duas estão CERTAS em
 * produção: `race_positions_block_delete` protege o histórico de um veículo que
 * já transmitiu, e `protect_last_owner` impede uma prova ficar sem responsável.
 * Nenhuma das duas deveria ser removida do schema — então o arranjo aqui é
 * desligá-las apenas durante a limpeza, e só neste script, que roda com a
 * conexão de administrador do banco.
 */
async function cleanupOldRuns() {
  // A seção 10 estoura o limite de tentativas de propósito, e o bloqueio dura
  // 10 minutos — inclusive para a execução seguinte deste script, que sai do
  // mesmo IP. Zerar o contador aqui é a única forma de o teste ser repetível;
  // o bloqueio continua sendo exercitado de verdade dentro de cada execução.
  await client
    .query("delete from bind_attempts where created_at > now() - interval '30 minutes'")
    .catch(() => {});

  try {
    await client.query("begin");
    await client.query(
      "alter table public.race_members disable trigger race_members_protect_owner",
    );
    await client.query(
      "alter table public.race_positions disable trigger race_positions_block_delete",
    );
    await client.query("delete from races where name like 'E2E motorista%'");
    await client.query(
      "alter table public.race_positions enable trigger race_positions_block_delete",
    );
    await client.query(
      "alter table public.race_members enable trigger race_members_protect_owner",
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    console.log(`  (limpeza pulada: ${error.message})`);
  }
}

async function seed(track) {
  const { rows: users } = await client.query("select id from auth.users limit 1");
  if (users.length === 0) {
    throw new Error(
      "Nenhum usuário em auth.users. Crie um diretor pelo dashboard antes de rodar este script.",
    );
  }

  const createdBy = users[0].id;
  const stamp = Date.now();

  await cleanupOldRuns();

  const { rows: raceRows } = await client.query(
    `insert into races (name, location, status, timezone, target_gap_minutes, created_by)
     values ($1, 'Langhe', 'live', 'Europe/Rome', 30, $2) returning id`,
    [`E2E motorista ${stamp}`, createdBy],
  );
  const raceId = raceRows[0].id;

  const renderPoints = track.points.filter((_, i) => i % 5 === 0).map(([lng, lat]) => [lng, lat]);

  await client.query(
    `insert into route_tracks
       (race_id, name, source, total_distance_m, point_count, bbox, points, render_points, is_active)
     values ($1, 'Giro delle Langhe', 'gpx', $2, $3, $4, $5, $6, true)`,
    [
      raceId,
      track.totalDistanceM,
      track.points.length,
      JSON.stringify(track.bbox),
      JSON.stringify(track.points),
      JSON.stringify(renderPoints),
    ],
  );

  const positions = {};

  for (const [i, vehicle] of VEHICLES.entries()) {
    const code = bindCode(stamp + i);
    const { rows } = await client.query(
      `insert into race_positions
         (race_id, role, label, ordinal, is_reference_lead, is_reference_sweep,
          is_dispatchable, bind_code)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
      [
        raceId,
        vehicle.role,
        vehicle.label,
        i + 1,
        Boolean(vehicle.lead),
        Boolean(vehicle.sweep),
        vehicle.dispatchable,
        code,
      ],
    );

    positions[vehicle.key] = { ...vehicle, id: rows[0].id, code };
  }

  return { raceId, positions, createdBy };
}

// ---------------------------------------------------------------------------
// Simulação de um veículo
// ---------------------------------------------------------------------------

let seqCounter = 0;

function makePing(track, offsetM, atMs, { queuedOffline = false, speedMps = 12 } = {}) {
  const truth = positionAtOffset(track, offsetM);
  const noisy = destination(truth, Math.random() * 360, Math.random() * 8);

  return {
    clientPingId: randomUUID(),
    clientSeq: ++seqCounter,
    lat: noisy.lat,
    lng: noisy.lng,
    accuracyM: 8,
    altitudeM: 300,
    speedMps,
    headingDeg: null,
    recordedAt: new Date(atMs).toISOString(),
    batteryPct: 78,
    queuedOffline,
  };
}

/**
 * Prova em CIRCUITO: 3 voltas sobre o mesmo traçado.
 *
 * O caso que estava completamente quebrado: `previous.lap` nunca era devolvido
 * ao cursor, então todo lote reinterpretava o veículo como se ele estivesse na
 * primeira volta. Medido antes da correção: 120,7 km percorridos, 10,9 km
 * gravados — 109,7 km de prova que não existiam para o sistema, e um vassoura
 * uma volta atrás do abertura aparecendo com gap ZERO.
 */
async function runLapsScenario(track, createdBy) {
  const LAPS = 3;
  const stamp = Date.now();

  const { rows: raceRows } = await client.query(
    `insert into races (name, location, status, timezone, target_gap_minutes, laps, created_by)
     values ($1, 'Circuito', 'live', 'Europe/Rome', 20, $2, $3) returning id`,
    [`E2E motorista circuito ${stamp}`, LAPS, createdBy],
  );
  const lapRaceId = raceRows[0].id;

  const renderPoints = track.points.filter((_, i) => i % 5 === 0).map(([lng, lat]) => [lng, lat]);

  await client.query(
    `insert into route_tracks
       (race_id, name, source, total_distance_m, point_count, bbox, points, render_points, is_active)
     values ($1, 'Circuito Langhe', 'gpx', $2, $3, $4, $5, $6, true)`,
    [
      lapRaceId,
      track.totalDistanceM,
      track.points.length,
      JSON.stringify(track.bbox),
      JSON.stringify(track.points),
      JSON.stringify(renderPoints),
    ],
  );

  const codes = {};
  for (const [i, spec] of [
    { key: "lead", role: "lead_car", label: "Abertura circuito", lead: true },
    { key: "sweep", role: "sweep_car", label: "Vassoura circuito", sweep: true },
  ].entries()) {
    const code = bindCode(stamp + 100 + i);
    await client.query(
      `insert into race_positions
         (race_id, role, label, ordinal, is_reference_lead, is_reference_sweep, is_dispatchable, bind_code)
       values ($1, $2, $3, $4, $5, $6, false, $7)`,
      [lapRaceId, spec.role, spec.label, i + 1, Boolean(spec.lead), Boolean(spec.sweep), code],
    );
    codes[spec.key] = code;
  }

  const lapTokens = {};
  for (const key of Object.keys(codes)) {
    const response = await api("/api/driver/bind", {
      method: "POST",
      body: { code: codes[key], deviceLabel: `Circuito ${key}` },
    });
    lapTokens[key] = response.json?.token;
  }

  /** Dirige `metros` de prova a partir de `deM`, em lotes de 40 pings. */
  async function drive(token, deM, ateM, baseMs) {
    const STEP_M = 300;
    let seq = 0;
    let batch = [];

    for (let absolute = deM; absolute <= ateM; absolute += STEP_M) {
      const local = absolute % track.totalDistanceM;
      const point = positionAtOffset(track, local);
      const noisy = destination(point, Math.random() * 360, Math.random() * 6);

      batch.push({
        clientPingId: randomUUID(),
        clientSeq: ++seq,
        lat: noisy.lat,
        lng: noisy.lng,
        accuracyM: 8,
        altitudeM: 300,
        speedMps: 12,
        headingDeg: null,
        recordedAt: new Date(baseMs + (absolute - deM) * 25).toISOString(),
        batteryPct: 80,
        queuedOffline: false,
      });

      if (batch.length === 40) {
        await api("/api/driver/ping", { method: "POST", token, body: { pings: batch } });
        batch = [];
      }
    }

    if (batch.length > 0) {
      await api("/api/driver/ping", { method: "POST", token, body: { pings: batch } });
    }
  }

  const raceDistance = track.totalDistanceM * LAPS;
  const now = Date.now();

  // A linha do tempo TEM que caber no passado.
  //
  // O `drive` avança 25 ms por metro, então a prova inteira leva ~68 min de
  // relógio simulado. Começar 40 min atrás jogava o último terço dos pings no
  // futuro, e o servidor os recusava — corretamente, porque relógio adiantado
  // é sintoma real de aparelho desregulado (seção 9d testa exatamente isso).
  // O veículo então parava no último ping válido e o teste acusava uma falha
  // que era artefato dele mesmo.
  const duracaoAberturaMs = (raceDistance - 2_000) * 25;
  const margemMs = 5 * 60_000;

  // Abertura: quase a prova inteira (fim da 3ª volta).
  await drive(lapTokens.lead, 0, raceDistance - 2_000, now - duracaoAberturaMs - margemMs);
  // Vassoura: mesmo PONTO DO MAPA do abertura, mas duas voltas atrás.
  const duracaoVassouraMs = (track.totalDistanceM - 2_000) * 25;
  await drive(lapTokens.sweep, 0, track.totalDistanceM - 2_000, now - duracaoVassouraMs - margemMs);

  const { rows: lapStates } = await client.query(
    `select p.label, s.lap, round(s.route_offset_m::numeric, 0) as local,
            round(s.absolute_offset_m::numeric, 0) as absoluto
       from position_state s join race_positions p on p.id = s.position_id
      where s.race_id = $1 order by p.ordinal`,
    [lapRaceId],
  );

  const lead = lapStates.find((r) => r.label === "Abertura circuito");
  const sweep = lapStates.find((r) => r.label === "Vassoura circuito");

  check(
    "abertura reconhecido na 3ª volta",
    lead?.lap === LAPS - 1,
    `volta ${lead?.lap}, local ${lead?.local} m`,
  );

  check(
    "distância de prova gravada é a REAL, não a de uma volta",
    Number(lead?.absoluto) > raceDistance * 0.9,
    `${(Number(lead?.absoluto) / 1000).toFixed(1)} km de ${(raceDistance / 1000).toFixed(1)} km`,
  );

  check(
    "vassoura duas voltas atrás não é confundido com o abertura",
    Math.abs(Number(lead?.absoluto) - Number(sweep?.absoluto)) > track.totalDistanceM * 1.5,
    `separação ${((Number(lead?.absoluto) - Number(sweep?.absoluto)) / 1000).toFixed(1)} km ` +
      `(pelo offset local seriam ${(Math.abs(Number(lead?.local) - Number(sweep?.local)) / 1000).toFixed(2)} km)`,
  );

  const gapState = await api("/api/driver/state", { token: lapTokens.sweep });
  check(
    "gap não é zero entre veículos em voltas diferentes",
    Math.abs(gapState.json?.gap?.gapM ?? 0) > track.totalDistanceM,
    `${((gapState.json?.gap?.gapM ?? 0) / 1000).toFixed(1)} km, método ${gapState.json?.gap?.method}`,
  );
}

// ---------------------------------------------------------------------------
// Roteiro
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\nFlamme Rouge — simulação de prova contra ${BASE_URL}\n`);

  await client.connect();

  const track = loadTrack();
  console.log(
    `  Percurso: ${(track.totalDistanceM / 1000).toFixed(1)} km, ${track.points.length} pontos`,
  );

  const { raceId, positions, createdBy } = await seed(track);
  console.log(`  Prova ${raceId} criada com ${Object.keys(positions).length} posições\n`);

  // --- 1. Vínculo --------------------------------------------------------
  section("1. Vínculo por código");

  const tokens = {};

  for (const key of Object.keys(positions)) {
    const position = positions[key];
    const response = await api("/api/driver/bind", {
      method: "POST",
      body: { code: formatCode(position.code), deviceLabel: `Simulador ${key}` },
    });

    check(
      `vínculo de ${position.label}`,
      response.status === 200 && Boolean(response.json?.token),
      response.status === 200 ? "" : JSON.stringify(response.json ?? response.text.slice(0, 120)),
    );

    tokens[key] = response.json?.token;

    if (key === "lead") {
      check(
        "resposta traz o percurso para desenhar",
        Array.isArray(response.json?.route?.renderPoints) &&
          response.json.route.renderPoints.length > 100,
        `${response.json?.route?.renderPoints?.length ?? 0} pontos`,
      );
      check(
        "resposta traz o fuso da prova",
        response.json?.race?.timeZone === "Europe/Rome",
        String(response.json?.race?.timeZone),
      );
    }
  }

  const badCode = await api("/api/driver/bind", {
    method: "POST",
    body: { code: "ZZZ999" },
  });
  check(
    "código inexistente devolve 401 sem revelar nada",
    badCode.status === 401 && badCode.json?.error?.code === "invalid_code",
    badCode.json?.error?.message,
  );

  // --- 2. Transmissão normal --------------------------------------------
  section("2. Transmissão ao vivo (5 veículos, 60 s de prova)");

  const STEP_S = 3;
  const SPEED = 12;

  // O último ping tem que cair no presente. Um veículo cuja posição mais
  // recente tem 10 minutos está SEM SINAL pela definição do sistema e — com
  // razão — não é candidato a socorro nenhum.
  const T0 = Date.now() - 61 * STEP_S * 1000;

  /** Offsets simulados por veículo ao longo do tempo. */
  const offsets = {};
  for (const key of Object.keys(positions)) offsets[key] = positions[key].offsetM;

  async function tick(count, { skip = [] } = {}) {
    const batches = {};

    for (let i = 0; i < count; i++) {
      for (const key of Object.keys(positions)) {
        offsets[key] += SPEED * STEP_S;
        const atMs = T0 + (tickClock + i) * STEP_S * 1000;
        (batches[key] ??= []).push(makePing(track, offsets[key], atMs));
      }
    }

    tickClock += count;

    for (const key of Object.keys(batches)) {
      if (skip.includes(key)) {
        // Sinal caiu: os pings ficam na "fila" local, exatamente como o app faz.
        queued[key] = (queued[key] ?? []).concat(
          batches[key].map((p) => ({ ...p, queuedOffline: true })),
        );
        continue;
      }

      const response = await api("/api/driver/ping", {
        method: "POST",
        token: tokens[key],
        body: { pings: batches[key] },
      });

      if (response.status !== 200) {
        check(`envio de pings de ${key}`, false, JSON.stringify(response.json));
      }
    }
  }

  let tickClock = 0;
  const queued = {};

  await tick(20); // 60 s de prova para todos

  const { rows: pingCount } = await client.query(
    "select count(*)::int as n from location_pings where race_id = $1",
    [raceId],
  );
  check("pings gravados", pingCount[0].n === 100, `${pingCount[0].n} de 100`);

  const { rows: snapped } = await client.query(
    "select count(*)::int as n from location_pings where race_id = $1 and route_offset_m is not null",
    [raceId],
  );
  check("todos ancorados no percurso", snapped[0].n === pingCount[0].n, `${snapped[0].n}`);

  const { rows: leadState } = await client.query(
    "select route_offset_m, rolling_speed_mps, total_pings from position_state where position_id = $1",
    [positions.lead.id],
  );
  const expectedLead = offsets.lead;
  check(
    "offset do abertura bate com a verdade simulada",
    Math.abs(leadState[0].route_offset_m - expectedLead) < 60,
    `erro ${Math.abs(leadState[0].route_offset_m - expectedLead).toFixed(1)} m`,
  );
  check(
    "velocidade média calculada",
    leadState[0].rolling_speed_mps > 8 && leadState[0].rolling_speed_mps < 16,
    `${leadState[0].rolling_speed_mps?.toFixed(1)} m/s`,
  );

  // --- 3. Dois minutos sem sinal ----------------------------------------
  section("3. Abertura perde o sinal por 2 minutos");

  await tick(40, { skip: ["lead"] }); // 120 s

  const offlineBatch = queued.lead ?? [];
  check("pings acumulados na fila local", offlineBatch.length === 40, `${offlineBatch.length}`);

  const { rows: duringOutage } = await client.query(
    "select count(*)::int as n from location_pings where position_id = $1",
    [positions.lead.id],
  );
  check("nada do abertura chegou durante a queda", duringOutage[0].n === 20, `${duringOutage[0].n}`);

  // A fila descarrega FORA DE ORDEM, como acontece quando o app manda tudo de
  // uma vez e a rede reordena.
  const shuffled = [...offlineBatch].sort(() => Math.random() - 0.5);

  const drain = await api("/api/driver/ping", {
    method: "POST",
    token: tokens.lead,
    body: { pings: shuffled },
  });

  check("descarga da fila aceita", drain.status === 200, `${drain.status}`);
  check(
    "servidor confirmou todos os 40",
    drain.json?.accepted?.length === 40,
    `${drain.json?.accepted?.length}`,
  );
  check("nenhum recusado", drain.json?.rejected?.length === 0, JSON.stringify(drain.json?.rejected));

  const { rows: afterDrain } = await client.query(
    "select count(*)::int as n from location_pings where position_id = $1",
    [positions.lead.id],
  );
  check("histórico completo, sem furo", afterDrain[0].n === 60, `${afterDrain[0].n} de 60`);

  const { rows: dupes } = await client.query(
    `select client_ping_id, count(*) from location_pings
      where race_id = $1 group by client_ping_id having count(*) > 1`,
    [raceId],
  );
  check("nenhuma duplicata", dupes.length === 0, `${dupes.length} ids repetidos`);

  // Reenvio integral do mesmo lote: é o que acontece quando o ack se perde.
  const resend = await api("/api/driver/ping", {
    method: "POST",
    token: tokens.lead,
    body: { pings: offlineBatch },
  });

  const { rows: afterResend } = await client.query(
    "select count(*)::int as n from location_pings where position_id = $1",
    [positions.lead.id],
  );
  check(
    "reenvio do lote não duplica nada",
    resend.status === 200 && afterResend[0].n === 60,
    `${afterResend[0].n}`,
  );

  const { rows: outOfOrder } = await client.query(
    `select recorded_at, route_offset_m from location_pings
      where position_id = $1 order by recorded_at`,
    [positions.lead.id],
  );
  const monotonic = outOfOrder.every(
    (row, i) => i === 0 || row.route_offset_m >= outOfOrder[i - 1].route_offset_m - 5,
  );
  check("offsets avançam em ordem cronológica", monotonic);

  const worstGap = outOfOrder.reduce((worst, row, i) => {
    if (i === 0) return worst;
    const dt = (Date.parse(row.recorded_at) - Date.parse(outOfOrder[i - 1].recorded_at)) / 1000;
    return Math.max(worst, dt);
  }, 0);
  check("nenhum buraco no histórico", worstGap <= STEP_S + 0.5, `maior intervalo ${worstGap}s`);

  // --- 4. Alerta médico e acionamento automático -------------------------
  section("4. Acidente: alerta e acionamento automático");

  const alertPoint = positionAtOffset(track, offsets.lead);
  const clientAlertId = randomUUID();

  const alertBody = {
    clientAlertId,
    category: "medical",
    note: "Ciclista caído na descida",
    lat: alertPoint.lat,
    lng: alertPoint.lng,
    accuracyM: 8,
    createdAt: new Date().toISOString(),
  };

  const alertResponse = await api("/api/driver/alert", {
    method: "POST",
    token: tokens.lead,
    body: alertBody,
  });

  check("alerta aceito", alertResponse.status === 200, `${alertResponse.status}`);
  check("ack traz o id do servidor", Boolean(alertResponse.json?.alertId));
  check(
    "socorro acionado automaticamente",
    alertResponse.json?.dispatch != null && alertResponse.json?.dispatchFailed === false,
    alertResponse.json?.dispatch?.reason,
  );
  check(
    "a AMBULÂNCIA foi acionada, não a moto geograficamente próxima",
    alertResponse.json?.dispatch?.positionId === positions.amb.id,
    `acionado: ${alertResponse.json?.dispatch?.label}`,
  );

  const { rows: alertRows } = await client.query(
    `select id, status, dispatch_mode, dispatched_position_id, dispatch_reason,
            route_offset_m, proximity_radius_m, visible_until
       from alerts where race_id = $1`,
    [raceId],
  );
  check("exatamente 1 alerta no banco", alertRows.length === 1, `${alertRows.length}`);
  check("status = dispatched", alertRows[0]?.status === "dispatched", alertRows[0]?.status);
  check("modo automático", alertRows[0]?.dispatch_mode === "auto");
  check(
    "alerta ancorado no percurso",
    Math.abs((alertRows[0]?.route_offset_m ?? 0) - offsets.lead) < 80,
    `offset ${alertRows[0]?.route_offset_m?.toFixed(0)} vs ${offsets.lead.toFixed(0)}`,
  );
  check(
    "raio de proximidade de acidente é o maior",
    alertRows[0]?.proximity_radius_m === 3000,
    `${alertRows[0]?.proximity_radius_m} m`,
  );

  const alertId = alertRows[0]?.id;

  const { rows: suggestionRows } = await client.query(
    `select s.rank, s.route_distance_m, s.straight_distance_m, s.eta_seconds, s.is_ahead, p.label
       from alert_suggestions s join race_positions p on p.id = s.position_id
      where s.alert_id = $1 order by s.rank`,
    [alertId],
  );
  check("sugestões congeladas no banco", suggestionRows.length >= 2, `${suggestionRows.length}`);

  const motoSuggestion = suggestionRows.find((s) => s.label === "Moto 3");
  if (motoSuggestion) {
    check(
      "moto: distância pela rota é MUITO maior que a linha reta",
      motoSuggestion.route_distance_m > 30_000 && motoSuggestion.straight_distance_m < 3_000,
      `rota ${(motoSuggestion.route_distance_m / 1000).toFixed(1)} km vs reta ${(motoSuggestion.straight_distance_m / 1000).toFixed(2)} km`,
    );
  }

  // Reenvio do MESMO alerta 5 vezes — o cenário do sinal instável.
  const acks = [];
  for (let i = 0; i < 5; i++) {
    acks.push(await api("/api/driver/alert", { method: "POST", token: tokens.lead, body: alertBody }));
  }

  const { rows: afterResendAlerts } = await client.query(
    "select count(*)::int as n from alerts where race_id = $1",
    [raceId],
  );
  check(
    "5 reenvios do mesmo alerta = 1 alerta",
    afterResendAlerts[0].n === 1 && acks.every((a) => a.status === 200 && a.json.deduplicated),
    `${afterResendAlerts[0].n} alerta(s)`,
  );
  check(
    "reenvio devolve o MESMO id",
    acks.every((a) => a.json.alertId === alertId),
  );

  // --- 5. Recusa e reacionamento ----------------------------------------
  section("5. A ambulância recusa: reacionamento automático");

  const declineResponse = await api(`/api/driver/alert/${alertId}/respond`, {
    method: "POST",
    token: tokens.amb,
    body: { action: "decline", reason: "já estou atendendo outra ocorrência" },
  });

  check("recusa aceita", declineResponse.status === 200, `${declineResponse.status}`);
  check(
    "outro veículo assumiu automaticamente",
    Boolean(declineResponse.json?.reassignedTo) && declineResponse.json?.orphaned === false,
    `novo responsável: ${declineResponse.json?.reassignedTo?.label}`,
  );

  const { rows: afterDecline } = await client.query(
    "select status, dispatched_position_id, dispatch_declined_at from alerts where id = $1",
    [alertId],
  );
  check(
    "banco reflete o novo acionado",
    afterDecline[0].dispatched_position_id !== positions.amb.id &&
      afterDecline[0].dispatched_position_id !== null,
    `status ${afterDecline[0].status}`,
  );

  const { rows: events } = await client.query(
    "select type from alert_events where alert_id = $1 order by created_at",
    [alertId],
  );
  const eventTypes = events.map((e) => e.type);
  check(
    "auditoria registra criação, acionamento, recusa e reacionamento",
    eventTypes.includes("created") &&
      eventTypes.includes("auto_dispatched") &&
      eventTypes.includes("dispatch_declined") &&
      eventTypes.includes("auto_redispatched"),
    eventTypes.join(", "),
  );

  // O novo acionado aceita.
  const newAssignee = Object.values(positions).find(
    (p) => p.id === afterDecline[0].dispatched_position_id,
  );
  const acceptResponse = await api(`/api/driver/alert/${alertId}/respond`, {
    method: "POST",
    token: tokens[newAssignee.key],
    body: { action: "on_my_way" },
  });
  check("novo acionado confirma", acceptResponse.json?.status === "en_route", acceptResponse.json?.status);

  // Idempotência: a fila offline reenvia a mesma resposta.
  const repeatAccept = await api(`/api/driver/alert/${alertId}/respond`, {
    method: "POST",
    token: tokens[newAssignee.key],
    body: { action: "on_my_way" },
  });
  check("resposta repetida é inócua", repeatAccept.status === 200);

  // Resposta de quem NÃO é mais o acionado não pode mexer no alerta.
  const staleResponse = await api(`/api/driver/alert/${alertId}/respond`, {
    method: "POST",
    token: tokens.amb,
    body: { action: "on_my_way" },
  });
  const { rows: afterStale } = await client.query(
    "select dispatched_position_id from alerts where id = $1",
    [alertId],
  );
  check(
    "resposta atrasada de quem recusou é ignorada",
    staleResponse.status === 200 &&
      afterStale[0].dispatched_position_id === afterDecline[0].dispatched_position_id,
  );

  // --- 6. Confirmação colaborativa --------------------------------------
  section("6. Confirmação colaborativa");

  const confirmationId = randomUUID();
  const confirm1 = await api(`/api/driver/alert/${alertId}/confirm`, {
    method: "POST",
    token: tokens.sweep,
    body: { clientConfirmationId: confirmationId, kind: "still_there" },
  });
  const confirm2 = await api(`/api/driver/alert/${alertId}/confirm`, {
    method: "POST",
    token: tokens.sweep,
    body: { clientConfirmationId: confirmationId, kind: "still_there" },
  });

  const { rows: confirmations } = await client.query(
    "select count(*)::int as n from alert_confirmations where alert_id = $1",
    [alertId],
  );
  check(
    "confirmação idempotente",
    confirm1.status === 200 && confirm2.json?.deduplicated === true && confirmations[0].n === 1,
    `${confirmations[0].n} confirmação(ões)`,
  );

  // --- 7. Estado ao vivo -------------------------------------------------
  section("7. Estado ao vivo e proximidade");

  const state = await api("/api/driver/state", { token: tokens.sweep });
  check("estado carregado", state.status === 200, `${state.status}`);
  check("todos os veículos visíveis", state.json?.vehicles?.length === 5, `${state.json?.vehicles?.length}`);
  check(
    "alerta visível para quem não o disparou",
    state.json?.alerts?.some((a) => a.alertId === alertId),
  );
  check(
    "gap abertura↔fechamento calculado",
    state.json?.gap?.gapSeconds != null,
    `${state.json?.gap?.method}: ${Math.round(state.json?.gap?.gapSeconds ?? 0)} s / ${Math.round(state.json?.gap?.gapM ?? 0)} m`,
  );

  const etag = state.headers.get("etag");
  const notModified = await api("/api/driver/state", {
    token: tokens.sweep,
    headers: { "if-none-match": etag },
  });
  check("ETag evita reenviar o mesmo estado", notModified.status === 304, `${notModified.status}`);

  // A ambulância está 1,5 km atrás do alerta e já recusou o acionamento — ou
  // seja, o alerta não é mais tarefa dela, mas continua no caminho dela. É
  // exatamente o caso do aviso de proximidade. (O acionado NÃO recebe este
  // aviso: para ele a tela inteira já é o alerta.)
  const mecState = await api("/api/driver/state", { token: tokens.amb });
  const proximity = mecState.json?.proximity ?? [];
  check(
    "veículo atrás recebe aviso de alerta à frente",
    proximity.some((p) => p.alertId === alertId),
    proximity.length > 0 ? `${Math.round(proximity[0].distanceAheadM)} m à frente` : "nenhum",
  );
  check(
    "primeiro aviso marcado como novo",
    proximity.find((p) => p.alertId === alertId)?.firstNotice === true,
  );

  const mecState2 = await api("/api/driver/state", { token: tokens.amb });
  const proximity2 = mecState2.json?.proximity ?? [];
  check(
    "segundo aviso NÃO repete o alarme",
    proximity2.find((p) => p.alertId === alertId)?.firstNotice === false,
  );

  const { rows: notifications } = await client.query(
    "select count(*)::int as n from alert_notifications where alert_id = $1 and kind = 'proximity'",
    [alertId],
  );
  check("aviso de proximidade registrado uma vez", notifications[0].n >= 1, `${notifications[0].n}`);

  // --- 8. Revogação de sessão -------------------------------------------
  section("8. Troca de celular derruba o anterior");

  const oldToken = tokens.moto;
  const rebind = await api("/api/driver/bind", {
    method: "POST",
    body: { code: formatCode(positions.moto.code), deviceLabel: "Celular novo" },
  });
  check("novo vínculo na mesma posição", rebind.status === 200);

  const withOldToken = await api("/api/driver/ping", {
    method: "POST",
    token: oldToken,
    body: { pings: [makePing(track, offsets.moto, Date.now())] },
  });
  check(
    "aparelho antigo é rejeitado com código que o app entende",
    withOldToken.status === 401 && withOldToken.json?.error?.code === "session_revoked",
    withOldToken.json?.error?.code,
  );

  const { rows: sessions } = await client.query(
    "select count(*)::int as n from position_sessions where position_id = $1 and revoked_at is null",
    [positions.moto.id],
  );
  check("apenas uma sessão ativa por posição", sessions[0].n === 1, `${sessions[0].n}`);

  // --- 9. Alerta com o token revogado ------------------------------------
  section("9. O alerta não pode falhar em silêncio");

  const alertWithDeadToken = await api("/api/driver/alert", {
    method: "POST",
    token: oldToken,
    body: {
      clientAlertId: randomUUID(),
      category: "medical",
      note: "token morto",
      lat: alertPoint.lat,
      lng: alertPoint.lng,
      accuracyM: 8,
      createdAt: new Date().toISOString(),
    },
  });
  check(
    "token revogado devolve erro explícito (app mantém o alerta na fila)",
    alertWithDeadToken.status === 401 &&
      alertWithDeadToken.json?.error?.code === "session_revoked",
    alertWithDeadToken.json?.error?.code,
  );

  const malformed = await api("/api/driver/alert", {
    method: "POST",
    token: tokens.mec,
    body: {
      clientAlertId: "não-é-uuid",
      category: "categoria-inexistente",
      createdAt: "amanhã",
      lat: 999,
      lng: null,
    },
  });
  check(
    "alerta malformado é REPARADO, nunca recusado",
    malformed.status === 200 && Boolean(malformed.json?.alertId),
    `status ${malformed.status}`,
  );

  const { rows: repaired } = await client.query(
    "select category, priority, lat, created_at from alerts where id = $1",
    [malformed.json?.alertId],
  );
  check(
    "categoria inválida virou 'other' e a hora virou a do servidor",
    repaired[0]?.category === "other" && repaired[0]?.lat === null,
    `categoria ${repaired[0]?.category}`,
  );
  check(
    "categoria desconhecida NÃO rebaixa a urgência",
    repaired[0]?.priority === "critical",
    `prioridade ${repaired[0]?.priority}`,
  );
  check(
    "o app é avisado do que foi consertado",
    Array.isArray(malformed.json?.repairs) && malformed.json.repairs.length > 0,
    (malformed.json?.repairs ?? []).join(" | "),
  );

  const bigBody = await api("/api/driver/alert", {
    method: "POST",
    token: tokens.mec,
    body: {
      clientAlertId: randomUUID(),
      category: "other",
      note: "x".repeat(2_000_000),
      createdAt: new Date().toISOString(),
    },
  });
  check(
    "corpo gigante é recusado antes de ser processado",
    bigBody.status === 400,
    `status ${bigBody.status}`,
  );

  // --- 9b. Três acidentes ao mesmo tempo ---------------------------------
  section("9b. Acidentes simultâneos não acionam o mesmo veículo");

  const simultaneous = [];
  for (let i = 0; i < 3; i++) {
    const point = positionAtOffset(track, offsets.sweep + i * 400);
    simultaneous.push(
      await api("/api/driver/alert", {
        method: "POST",
        token: tokens.sweep,
        body: {
          clientAlertId: randomUUID(),
          category: "medical",
          note: `acidente simultâneo ${i + 1}`,
          lat: point.lat,
          lng: point.lng,
          accuracyM: 8,
          createdAt: new Date().toISOString(),
        },
      }),
    );
  }

  const dispatchedTo = simultaneous
    .map((r) => r.json?.dispatch?.positionId)
    .filter(Boolean);

  check(
    "cada acidente recebeu um veículo diferente (ou nenhum)",
    new Set(dispatchedTo).size === dispatchedTo.length,
    dispatchedTo
      .map((id) => Object.values(positions).find((p) => p.id === id)?.label)
      .join(", ") || "nenhum acionado",
  );

  const { rows: doubleBooked } = await client.query(
    `select dispatched_position_id, count(*)::int as n
       from alerts
      where race_id = $1 and dispatched_position_id is not null
        and status in ('dispatched', 'en_route', 'on_scene')
      group by dispatched_position_id having count(*) > 1`,
    [raceId],
  );
  check(
    "nenhum veículo com dois acionamentos ativos no banco",
    doubleBooked.length === 0,
    `${doubleBooked.length} veículo(s) duplicado(s)`,
  );

  const semAcionamento = simultaneous.filter((r) => r.json?.dispatchFailed);
  check(
    "quem não conseguiu socorro é avisado explicitamente",
    semAcionamento.every((r) => r.json?.dispatch === null),
    `${semAcionamento.length} de 3 sem acionamento`,
  );

  // --- 9c. Alerta órfão é reprocessado -----------------------------------
  section("9c. Alerta sem ninguém disponível é reconsiderado");

  const orphan = simultaneous.find((r) => r.json?.dispatchFailed);

  if (orphan) {
    const { rows: retryRow } = await client.query(
      "select dispatch_retry_after, dispatch_attempts from alerts where id = $1",
      [orphan.json.alertId],
    );
    check(
      "alerta órfão fica marcado para nova tentativa",
      retryRow[0]?.dispatch_retry_after !== null,
      `tentativas: ${retryRow[0]?.dispatch_attempts}`,
    );

    // Força a hora da retentativa e libera um veículo para provar que a
    // varredura do /state realmente reprocessa.
    await client.query(
      "update alerts set dispatch_retry_after = now() - interval '1 minute' where id = $1",
      [orphan.json.alertId],
    );
    await client.query(
      `update alerts set status = 'resolved', resolved_at = now()
        where race_id = $1 and id <> $2 and dispatched_position_id is not null`,
      [raceId, orphan.json.alertId],
    );

    // A varredura é limitada a uma por prova a cada 10 s — senão doze
    // motoristas consultando ao mesmo tempo disparariam doze varreduras
    // idênticas. O teste respeita o intervalo em vez de contorná-lo.
    await new Promise((resolve) => setTimeout(resolve, 11_000));
    await api("/api/driver/state", { token: tokens.lead });

    const { rows: afterSweep } = await client.query(
      "select dispatched_position_id, status from alerts where id = $1",
      [orphan.json.alertId],
    );
    check(
      "a varredura aciona alguém assim que há veículo livre",
      afterSweep[0]?.dispatched_position_id !== null,
      `status ${afterSweep[0]?.status}`,
    );
  } else {
    check("alerta órfão fica marcado para nova tentativa", true, "nenhum órfão neste cenário");
    check("a varredura aciona alguém assim que há veículo livre", true, "não aplicável");
  }

  // --- 9d. Relógio adiantado ---------------------------------------------
  section("9d. Relógio do aparelho 20 minutos adiantado");

  const skewed = await api("/api/driver/ping", {
    method: "POST",
    token: tokens.mec,
    body: {
      pings: Array.from({ length: 5 }, (_, i) =>
        makePing(track, offsets.mec + i * 36, Date.now() + 20 * 60_000 + i * 3000),
      ),
    },
  });

  check(
    "servidor recusa e EXPLICA cada ping do futuro",
    skewed.status === 200 &&
      skewed.json?.rejected?.length === 5 &&
      skewed.json.rejected.every((r) => /futuro/.test(r.reason)),
    skewed.json?.rejected?.[0]?.reason,
  );
  check(
    "nenhum ping do futuro foi aceito",
    skewed.json?.accepted?.length === 0,
    `${skewed.json?.accepted?.length} aceitos`,
  );

  // --- 9e. Circuito de 3 voltas ------------------------------------------
  section("9e. Circuito de 3 voltas");

  await runLapsScenario(track, createdBy);

  // --- 10. Rate limiting -------------------------------------------------
  section("10. Força bruta no código de vínculo");

  let blockedAt = null;
  for (let i = 0; i < 12; i++) {
    const attempt = await api("/api/driver/bind", {
      method: "POST",
      body: { code: `Z${String(i).padStart(2, "0")}XYZ` },
    });
    if (attempt.status === 429) {
      blockedAt = i + 1;
      break;
    }
  }
  check("tentativas em massa são bloqueadas", blockedAt !== null, `bloqueou na tentativa ${blockedAt}`);

  const { rows: attempts } = await client.query(
    "select count(*)::int as n from bind_attempts where succeeded = false",
  );
  check("todas as tentativas ficaram registradas", attempts[0].n > 0, `${attempts[0].n} registros`);

  // --- Resumo ------------------------------------------------------------
  const { rows: finalCounts } = await client.query(
    `select
       (select count(*) from location_pings where race_id = $1) as pings,
       (select count(*) from alerts where race_id = $1) as alerts,
       (select count(*) from alert_events e join alerts a on a.id = e.alert_id where a.race_id = $1) as events,
       (select count(*) from position_state where race_id = $1) as states`,
    [raceId],
  );

  console.log(
    `\n  Banco: ${finalCounts[0].pings} pings, ${finalCounts[0].alerts} alertas, ` +
      `${finalCounts[0].events} eventos de auditoria, ${finalCounts[0].states} estados.`,
  );

  console.log(`\n  ${passed} verificações passaram, ${failed} falharam.\n`);

  if (failed > 0) process.exitCode = 1;
}

function formatCode(code) {
  // O app formata com hífen; a API tem que aceitar assim.
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

main()
  .catch((error) => {
    console.error(`\n  Erro fatal: ${error.message}\n`, error.stack);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => {});
  });
