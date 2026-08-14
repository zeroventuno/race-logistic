#!/usr/bin/env node
/**
 * O painel ao vivo contra o banco DE VERDADE e a API DE VERDADE.
 *
 * Testes unitários provam que as funções puras fazem contas certas. Este script
 * prova a coisa que só quebra em integração: que o estado que o painel recebe
 * descreve a prova que está realmente acontecendo, e que as ações do diretor
 * atravessam RLS, gatilhos e máquina de estados sem serem recusadas no meio de
 * uma emergência.
 *
 * O que ele faz, em ordem:
 *   1. cria uma prova com o GPX real (Giro delle Langhe, 54,9 km, 2174 pontos);
 *   2. vincula 5 veículos por código e move todos por 3 minutos de prova, com a
 *      ingestão real fazendo o snap no percurso;
 *   3. dispara um acidente pelo app do motorista, com acionamento automático;
 *   4. entra como diretor (usuário de teste, criado e apagado aqui) e lê
 *      `GET /api/races/{id}/live`;
 *   5. confere veículo por veículo contra a verdade simulada, confere a janela
 *      abertura ↔ fechamento contra o valor calculável à mão, e confere que
 *      veículo sem sinal aparece como sem sinal;
 *   6. executa as ações urgentes do painel (reconhecer, trocar apoio, resolver)
 *      pelo MESMO caminho que o browser usa, e confere o resultado no banco;
 *   7. grava o snapshot da janela e confere a linha em `gap_snapshots`.
 *
 * Uso:
 *   1. `npm run dev` numa aba
 *   2. `node tests/live-e2e.mjs`
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import dotenv from "dotenv";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

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

let passed = 0;
let failed = 0;

function check(label, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ok    ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    console.log(`  FALHA ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

// ---------------------------------------------------------------------------
// Geometria (a mesma de tests/driver-e2e.mjs)
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
  const sinLat2 =
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(t);
  const lat2 = Math.asin(sinLat2);
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(t) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * sinLat2,
    );
  return { lat: lat2 / D2R, lng: ((lng2 / D2R + 540) % 360) - 180 };
}

function loadTrack() {
  const xml = readFileSync(GPX_PATH, "utf8");
  const raw = [
    ...xml.matchAll(
      /<trkpt lat="([-\d.]+)" lon="([-\d.]+)">(?:<ele>([-\d.]+)<\/ele>)?/g,
    ),
  ].map((m) => ({
    lat: Number(m[1]),
    lng: Number(m[2]),
    ele: m[3] ? Number(m[3]) : null,
  }));

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

async function api(path, { method = "GET", token, body, cookie } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* resposta não-JSON */
  }

  return { status: response.status, json, text };
}

// ---------------------------------------------------------------------------
// Semeadura
// ---------------------------------------------------------------------------

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function bindCode(seed) {
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[(seed * 11 + i * 7 + 3) % 32];
  return out;
}

const SPEED_MPS = 12;
const STEP_S = 3;

/**
 * Offsets iniciais escolhidos para a janela ter um valor conferível à mão.
 *
 * Abertura e fechamento separados por 3600 m; os dois andam a 12 m/s, então a
 * janela MEDIDA tem que dar 3600/12 = 300 s. Se o painel devolver outro número,
 * o erro é do painel — não da simulação.
 */
const VEHICLES = [
  { key: "lead", role: "lead_car", label: "Abertura", offsetM: 24_000, dispatchable: false, lead: true },
  { key: "sweep", role: "sweep_car", label: "Vassoura", offsetM: 20_400, dispatchable: false, sweep: true },
  { key: "amb", role: "ambulance", label: "Ambulância 1", offsetM: 21_500, dispatchable: true },
  { key: "mec", role: "mechanic", label: "Mecânico 1", offsetM: 20_800, dispatchable: true },
  { key: "moto", role: "moto", label: "Moto 3", offsetM: 22_400, dispatchable: true },
];

async function limparExecucoesAnteriores() {
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
    await client.query("delete from races where name like 'E2E painel%'");
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

  await client
    .query("delete from auth.users where email like 'painel-e2e+%@flamme-rouge.test'")
    .catch(() => {});
}

async function semear(track, diretorId) {
  // O dono precisa ser OUTRO usuário: o gatilho `add_creator_as_owner` marca o
  // criador como `owner`, e o gatilho `protect_last_owner` recusa rebaixá-lo
  // para `director` depois. Criar a prova em nome de terceiro também é o caso
  // realista — o diretor de teste entra como co-diretor, que é o papel que a
  // maioria das pessoas tem numa prova alheia.
  const { rows: users } = await client.query(
    "select id from auth.users where id <> $1 limit 1",
    [diretorId],
  );

  const dono = users[0]?.id ?? diretorId;
  const soAutor = dono === diretorId;
  const stamp = Date.now();

  const { rows: raceRows } = await client.query(
    `insert into races
       (name, location, status, timezone, target_gap_minutes, min_gap_minutes,
        max_gap_minutes, laps, actual_start, created_by)
     values ($1, 'Langhe', 'live', 'Europe/Rome', 5, 3, 8, 1, now(), $2)
     returning id`,
    [`E2E painel ${stamp}`, dono],
  );
  const raceId = raceRows[0].id;

  // O diretor de teste entra como membro editor — assim ele pode ser apagado no
  // fim sem esbarrar no `on delete restrict` de `races.created_by`.
  if (!soAutor) {
    await client.query(
      `insert into race_members (race_id, user_id, role) values ($1, $2, 'director')
       on conflict (race_id, user_id) do nothing`,
      [raceId, diretorId],
    );
  }

  const renderPoints = track.points
    .filter((_, i) => i % 5 === 0)
    .map(([lng, lat]) => [lng, lat]);

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
         (race_id, role, label, ordinal, driver_name, is_reference_lead,
          is_reference_sweep, is_dispatchable, bind_code)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
      [
        raceId,
        vehicle.role,
        vehicle.label,
        i + 1,
        `Motorista ${i + 1}`,
        Boolean(vehicle.lead),
        Boolean(vehicle.sweep),
        vehicle.dispatchable,
        code,
      ],
    );
    positions[vehicle.key] = { ...vehicle, id: rows[0].id, code };
  }

  // Uma sexta posição que NUNCA vincula aparelho. O painel tem que mostrá-la
  // como "não vinculada", não como um veículo qualquer sem novidades.
  const { rows: fantasma } = await client.query(
    `insert into race_positions
       (race_id, role, label, ordinal, is_dispatchable, bind_code)
     values ($1, 'marshal', 'Fiscal sem aparelho', 99, true, $2) returning id`,
    [raceId, bindCode(stamp + 42)],
  );
  positions.fiscal = { key: "fiscal", label: "Fiscal sem aparelho", id: fantasma[0].id };

  return { raceId, positions };
}

let seqCounter = 0;

function makePing(track, offsetM, atMs) {
  const truth = positionAtOffset(track, offsetM);
  const noisy = destination(truth, Math.random() * 360, Math.random() * 8);

  return {
    clientPingId: randomUUID(),
    clientSeq: ++seqCounter,
    lat: noisy.lat,
    lng: noisy.lng,
    accuracyM: 8,
    altitudeM: 300,
    speedMps: SPEED_MPS,
    headingDeg: null,
    recordedAt: new Date(atMs).toISOString(),
    batteryPct: 64,
    queuedOffline: false,
  };
}

// ---------------------------------------------------------------------------
// Roteiro
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\nPainel ao vivo — verificação contra ${BASE_URL}\n`);

  await client.connect();
  await limparExecucoesAnteriores();

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const email = `painel-e2e+${Date.now()}@flamme-rouge.test`;
  const senha = `S${randomUUID()}!`;

  const { data: criado, error: erroUsuario } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });
  if (erroUsuario) throw new Error(`não criou o diretor de teste: ${erroUsuario.message}`);

  const diretorId = criado.user.id;

  const track = loadTrack();
  console.log(
    `  Percurso: ${(track.totalDistanceM / 1000).toFixed(1)} km, ${track.points.length} pontos`,
  );

  const { raceId, positions } = await semear(track, diretorId);
  console.log(`  Prova ${raceId} · diretor de teste ${email}\n`);

  try {
    await roteiro({ track, raceId, positions, email, senha, diretorId });
  } finally {
    // `--keep` deixa a prova e o diretor de teste de pé para inspeção visual do
    // painel num browser de verdade. Sem isso, tudo é apagado: este script roda
    // contra o banco real e não pode ir deixando prova de mentira para trás.
    if (process.argv.includes("--keep")) {
      console.log(
        `\n  MANTIDO para inspeção:\n` +
          `    ${BASE_URL}/dashboard/${raceId}/ao-vivo\n` +
          `    login: ${email}\n` +
          `    senha: ${senha}\n` +
          `  Apague depois com: node tests/live-e2e.mjs (a limpeza inicial remove 'E2E painel%')`,
      );
    } else {
      await limpar(raceId, diretorId, admin);
    }
  }
}

async function roteiro({ track, raceId, positions, email, senha, diretorId }) {
  // --- 1. Vínculo e movimento ---------------------------------------------
  section("1. Cinco veículos vinculados e em movimento (3 min de prova)");

  const tokens = {};
  const offsets = {};

  for (const key of ["lead", "sweep", "amb", "mec", "moto"]) {
    const p = positions[key];
    offsets[key] = p.offsetM;

    const r = await api("/api/driver/bind", {
      method: "POST",
      body: {
        code: `${p.code.slice(0, 3)}-${p.code.slice(3)}`,
        deviceLabel: `Simulador ${key}`,
      },
    });

    if (r.status !== 200 || !r.json?.token) {
      check(`vínculo de ${p.label}`, false, JSON.stringify(r.json ?? r.text.slice(0, 160)));
      return;
    }
    tokens[key] = r.json.token;
  }
  check("todos os cinco vincularam", Object.keys(tokens).length === 5);

  // 150 × 3 s = 450 s de prova, e isso NÃO é um número arbitrário: o método
  // MEDIDO da janela pergunta "a que horas a abertura passou pelo ponto onde o
  // fechamento está agora". Com os dois a 12 m/s e 3600 m de separação, isso
  // exige que o histórico da abertura cubra pelo menos 3600 m para trás — ou
  // seja, 300 s. Com menos que isso o cálculo cai para a projeção, e cai com
  // razão. Simular 180 s e cobrar "medido" seria cobrar do painel um dado que a
  // simulação não produziu.
  const passos = 150;
  const T0 = Date.now() - passos * STEP_S * 1000;

  for (const key of Object.keys(tokens)) {
    const lote = [];
    for (let i = 0; i < passos; i++) {
      offsets[key] += SPEED_MPS * STEP_S;
      lote.push(makePing(track, offsets[key], T0 + i * STEP_S * 1000));
    }

    const r = await api("/api/driver/ping", {
      method: "POST",
      token: tokens[key],
      body: { pings: lote },
    });

    if (r.status !== 200) {
      check(`pings de ${key}`, false, JSON.stringify(r.json));
      return;
    }
  }

  const { rows: gravados } = await client.query(
    "select count(*)::int n from location_pings where race_id = $1",
    [raceId],
  );
  check("pings gravados", gravados[0].n === passos * 5, `${gravados[0].n} de ${passos * 5}`);

  // --- 2. Acidente ---------------------------------------------------------
  section("2. Acidente disparado pela Moto 3, com acionamento automático");

  const pontoDoAlerta = positionAtOffset(track, offsets.moto);

  const alerta = await api("/api/driver/alert", {
    method: "POST",
    token: tokens.moto,
    body: {
      clientAlertId: randomUUID(),
      category: "medical",
      note: "Ciclista caído na descida",
      lat: pontoDoAlerta.lat,
      lng: pontoDoAlerta.lng,
      accuracyM: 10,
      createdAt: new Date().toISOString(),
    },
  });

  check("alerta gravado", alerta.status === 200 && Boolean(alerta.json?.alertId),
    JSON.stringify(alerta.json?.error ?? "").slice(0, 140));
  check(
    "socorro acionado automaticamente",
    Boolean(alerta.json?.dispatch?.positionId),
    alerta.json?.dispatch?.label ?? `dispatchFailed=${alerta.json?.dispatchFailed}`,
  );

  const alertId = alerta.json?.alertId;

  // --- 3. O diretor abre o painel -----------------------------------------
  section("3. Estado ao vivo lido pelo painel do diretor");

  const jar = new Map();
  const diretor = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
        setAll: (lista) => lista.forEach(({ name, value }) => jar.set(name, value)),
      },
    },
  );

  const login = await diretor.auth.signInWithPassword({ email, password: senha });
  check("diretor autenticado", !login.error, login.error?.message ?? "");

  const cookie = [...jar.entries()]
    .map(([n, v]) => `${n}=${encodeURIComponent(v)}`)
    .join("; ");

  const semSessao = await api(`/api/races/${raceId}/live`);
  check(
    "sem sessão o endpoint recusa",
    semSessao.status === 401 || semSessao.status === 404,
    `HTTP ${semSessao.status}`,
  );

  const resposta = await api(`/api/races/${raceId}/live`, { cookie });
  check("painel carregou", resposta.status === 200, `HTTP ${resposta.status} ${resposta.text.slice(0, 160)}`);

  const s = resposta.json;
  if (!s) return;

  check("seis posições no painel", s.vehicles.length === 6, `${s.vehicles.length}`);

  const porLabel = new Map(s.vehicles.map((v) => [v.label, v]));

  // --- 4. As posições batem com a verdade simulada -------------------------
  section("4. Posições conferidas contra a verdade simulada");

  for (const key of ["lead", "sweep", "amb", "mec", "moto"]) {
    const esperado = offsets[key];
    const v = porLabel.get(positions[key].label);
    const erro = Math.abs((v?.routeOffsetM ?? -1e9) - esperado);
    check(
      `${positions[key].label} no km certo`,
      erro < 80,
      `erro ${erro.toFixed(1)} m (painel ${(v?.routeOffsetM / 1000).toFixed(3)} km, verdade ${(esperado / 1000).toFixed(3)} km)`,
    );
  }

  const fiscal = porLabel.get("Fiscal sem aparelho");
  check(
    "posição sem aparelho aparece como não vinculada",
    fiscal.bound === false && fiscal.receivedAt === null,
    `bound=${fiscal.bound}`,
  );

  // --- 5. A janela ---------------------------------------------------------
  section("5. Janela abertura ↔ fechamento");

  const separacaoM = offsets.lead - offsets.sweep;
  const esperadoS = separacaoM / SPEED_MPS;

  check(
    "método é MEDIDO (há histórico dos dois)",
    s.gap.method === "measured",
    `${s.gap.method} · ${s.gap.explanation}`,
  );
  check(
    "distância pela estrada bate",
    Math.abs(s.gap.gapM - separacaoM) < 120,
    `painel ${(s.gap.gapM / 1000).toFixed(3)} km, verdade ${(separacaoM / 1000).toFixed(3)} km`,
  );
  check(
    "tempo da janela bate com distância/velocidade",
    Math.abs(s.gap.gapSeconds - esperadoS) < 20,
    `painel ${s.gap.gapSeconds?.toFixed(1)} s, esperado ${esperadoS.toFixed(1)} s`,
  );
  check("dado fresco não é marcado como velho", s.gap.stale === false);
  check(
    "janela de 5 min alvo com limites 3–8 min classificada",
    ["within", "over", "under"].includes(s.gap.band),
    `${s.gap.band} (alvo ${s.gap.targetSeconds}s, ${s.gap.minSeconds}–${s.gap.maxSeconds}s)`,
  );
  check(
    "trecho ocupado desenhado entre fechamento e abertura",
    Array.isArray(s.occupiedSegment) && s.occupiedSegment.length >= 2,
    `${s.occupiedSegment?.length ?? "null"} pontos`,
  );

  // --- 6. O alerta como o painel o vê --------------------------------------
  section("6. Alerta no painel");

  const aPainel = s.alerts.find((a) => a.alertId === alertId);
  check("alerta presente", Boolean(aPainel));
  if (!aPainel) return;

  check("categoria e autor preservados",
    aPainel.category === "medical" && aPainel.raisedBy?.label === "Moto 3",
    `${aPainel.category} / ${aPainel.raisedBy?.label}`);
  check("km do percurso calculado", aPainel.routeOffsetM !== null,
    `${(aPainel.routeOffsetM / 1000).toFixed(2)} km`);
  check("apoio acionado com o porquê registrado",
    Boolean(aPainel.dispatch?.positionId) && Boolean(aPainel.dispatch?.reason),
    `${aPainel.dispatch?.label}: ${String(aPainel.dispatch?.reason).slice(0, 90)}`);
  check("sugestões com ordem e motivo",
    aPainel.suggestions.length >= 1 && aPainel.suggestions.every((x) => x.reason),
    `${aPainel.suggestions.length} sugestão(ões)`);
  check(
    "acionamento automático NÃO conta como reconhecido por humano",
    aPainel.acknowledgedAt !== null && aPainel.acknowledgedBy === null,
    `acknowledged_at=${Boolean(aPainel.acknowledgedAt)}, acknowledged_by=${aPainel.acknowledgedBy}`,
  );

  // --- 7. As ações do diretor ---------------------------------------------
  section("7. Ações urgentes pelo mesmo caminho do browser");

  const ack = await diretor
    .from("alerts")
    .update({ status: "acknowledged", acknowledged_by: diretorId })
    .eq("id", alertId)
    .select("id");
  check("reconhecer (1 clique)", !ack.error && ack.data?.length === 1, ack.error?.message ?? "");

  const outro = aPainel.suggestions.find(
    (x) => x.positionId !== aPainel.dispatch?.positionId,
  ) ?? { positionId: positions.mec.id, label: "Mecânico 1", reason: "escolha manual" };

  const troca = await diretor
    .from("alerts")
    .update({
      dispatched_position_id: outro.positionId,
      dispatched_at: new Date().toISOString(),
      dispatch_mode: "manual",
      dispatch_reason: `${outro.label} — trocado pela direção`,
      dispatch_acknowledged_at: null,
      dispatch_declined_at: null,
      dispatch_decline_reason: null,
      status: "dispatched",
      acknowledged_by: diretorId,
    })
    .eq("id", alertId)
    .select("id");
  check("trocar o apoio acionado (1 clique)", !troca.error && troca.data?.length === 1,
    troca.error?.message ?? `→ ${outro.label}`);

  const evento = await diretor.from("alert_events").insert({
    alert_id: alertId,
    type: "dispatch_reassigned_by_director",
    actor_type: "director",
    payload: { positionId: outro.positionId, label: outro.label },
  });
  check("auditoria aceita a escrita do painel", !evento.error, evento.error?.message ?? "");

  const resolver = await diretor
    .from("alerts")
    // Nenhum carimbo de tempo sai do cliente: o gatilho preenche com o relógio
    // do banco. Mandar a hora do browser é o que dispara
    // "resolução anterior ao reconhecimento".
    .update({ status: "resolved", resolved_by: diretorId, resolution_note: "Ciclista liberado" })
    .eq("id", alertId)
    .select("id");
  check("resolver (1 clique)", !resolver.error && resolver.data?.length === 1,
    resolver.error?.message ?? "");

  const { rows: final } = await client.query(
    `select status, acknowledged_by, resolved_by, resolved_at >= acknowledged_at as ordem_ok,
            dispatched_position_id
       from alerts where id = $1`,
    [alertId],
  );
  check("banco reflete o encerramento", final[0].status === "resolved", final[0].status);
  check("autor humano do reconhecimento gravado", final[0].acknowledged_by === diretorId);
  check("resolução não é anterior ao reconhecimento", final[0].ordem_ok === true);
  check("apoio final é o escolhido pela direção",
    final[0].dispatched_position_id === outro.positionId);

  const { rows: trilha } = await client.query(
    "select count(*)::int n from alert_events where alert_id = $1",
    [alertId],
  );
  check("trilha de auditoria com eventos", trilha[0].n >= 2, `${trilha[0].n} eventos`);

  // --- 8. Movimento continua e o painel acompanha -------------------------
  section("8. Segunda leitura: os veículos andaram");

  for (const key of Object.keys(tokens)) {
    const lote = [];
    for (let i = 0; i < 10; i++) {
      offsets[key] += SPEED_MPS * STEP_S;
      lote.push(makePing(track, offsets[key], Date.now() - (10 - i) * STEP_S * 1000));
    }
    await api("/api/driver/ping", {
      method: "POST",
      token: tokens[key],
      body: { pings: lote },
    });
  }

  const depois = await api(`/api/races/${raceId}/live`, { cookie });
  check("segunda leitura ok", depois.status === 200, `HTTP ${depois.status}`);

  const s2 = depois.json;
  const antes = porLabel.get("Vassoura").routeOffsetM;
  const agora = s2.vehicles.find((v) => v.label === "Vassoura").routeOffsetM;
  check(
    "o mapa se mexe: vassoura avançou 360 m",
    Math.abs(agora - antes - 360) < 80,
    `${(antes / 1000).toFixed(3)} km → ${(agora / 1000).toFixed(3)} km`,
  );
  check(
    "janela continua medida e estável",
    s2.gap.method === "measured" && Math.abs(s2.gap.gapSeconds - esperadoS) < 25,
    `${s2.gap.method} ${s2.gap.gapSeconds?.toFixed(1)} s`,
  );
  check(
    "alerta resolvido saiu dos ativos",
    !s2.alerts.some((a) => a.alertId === alertId && ["open", "acknowledged", "dispatched", "en_route", "on_scene"].includes(a.status)),
  );

  // --- 9. Snapshot histórico da janela -------------------------------------
  section("9. Histórico da janela em gap_snapshots");

  const snap = await api(`/api/races/${raceId}/live/gap-snapshot`, {
    method: "POST",
    cookie,
  });
  check("snapshot aceito", snap.status === 201, `HTTP ${snap.status} ${snap.text.slice(0, 120)}`);

  const { rows: linhas } = await client.query(
    "select gap_seconds, gap_m, method from gap_snapshots where race_id = $1",
    [raceId],
  );
  check("linha gravada", linhas.length === 1, `${linhas.length} linha(s)`);
  if (linhas[0]) {
    check(
      "valor gravado é o calculado no servidor",
      Math.abs(linhas[0].gap_seconds - esperadoS) < 25 && linhas[0].method === "measured",
      `${linhas[0].gap_seconds} s, método ${linhas[0].method}`,
    );
  }

  const repetido = await api(`/api/races/${raceId}/live/gap-snapshot`, {
    method: "POST",
    cookie,
  });
  check(
    "segunda aba não dobra a densidade do histórico",
    repetido.status === 200 && repetido.json?.recorded === false,
    `HTTP ${repetido.status} ${JSON.stringify(repetido.json)}`,
  );

  // --- 10. Degradação: o painel tem que confessar --------------------------
  section("10. Sinal perdido e relógio de aparelho fora de hora");

  // "Perder o sinal" é literalmente `received_at` no passado — o relógio do
  // servidor é a única fonte de idade no sistema. Empurrar a linha para trás
  // exercita exatamente o caminho que o painel percorre.
  await client.query(
    `update position_state
        set received_at = now() - interval '4 minutes',
            recorded_at = recorded_at - interval '4 minutes'
      where position_id = $1`,
    [positions.mec.id],
  );

  // Abertura com o relógio do aparelho 9 minutos adiantado. É o caso que faz um
  // painel ingênuo declarar "idade: 0 s, dado fresco" enquanto o veículo já
  // parou de reportar — e é por isso que a idade sai de `received_at`.
  await client.query(
    `update position_state set recorded_at = received_at + interval '9 minutes'
      where position_id = $1`,
    [positions.lead.id],
  );

  const degradado = await api(`/api/races/${raceId}/live`, { cookie });
  const s3 = degradado.json;
  check("terceira leitura ok", degradado.status === 200, `HTTP ${degradado.status}`);

  if (s3) {
    const agoraMs = Date.parse(s3.serverTime);
    const idade = (v) => (agoraMs - Date.parse(v.receivedAt)) / 1000;
    const porLabel3 = new Map(s3.vehicles.map((v) => [v.label, v]));

    check(
      "sem sinal há 4 min é reportado como tal",
      idade(porLabel3.get("Mecânico 1")) > 180,
      `${Math.round(idade(porLabel3.get("Mecânico 1")))} s`,
    );

    const abertura = porLabel3.get("Abertura");
    check(
      "relógio adiantado NÃO vira 'dado fresco'",
      Math.abs(abertura.clockSkewSeconds) > 60 && idade(abertura) < 120,
      `desvio ${Math.round(abertura.clockSkewSeconds)} s, idade real ${Math.round(idade(abertura))} s`,
    );
    check(
      "relógio suspeito é confessado na janela",
      s3.gap.clockSuspect === true,
      `clockSuspect=${s3.gap.clockSuspect}`,
    );
    check(
      "trecho ocupado some quando o relógio é suspeito",
      s3.occupiedSegment === null,
      `${s3.occupiedSegment?.length ?? "null"} pontos`,
    );
  }

  // --- 11. RLS -------------------------------------------------------------
  section("11. Isolamento entre provas");

  const { rows: outras } = await client.query(
    "select id from races where id <> $1 order by created_at desc limit 1",
    [raceId],
  );

  if (outras.length > 0) {
    const alheia = await api(`/api/races/${outras[0].id}/live`, { cookie });
    check(
      "prova de que não sou membro responde 404",
      alheia.status === 404,
      `HTTP ${alheia.status}`,
    );
  }
}

async function limpar(raceId, diretorId, admin) {
  try {
    await client.query("begin");
    await client.query(
      "alter table public.race_members disable trigger race_members_protect_owner",
    );
    await client.query(
      "alter table public.race_positions disable trigger race_positions_block_delete",
    );
    await client.query("delete from races where id = $1", [raceId]);
    await client.query(
      "alter table public.race_positions enable trigger race_positions_block_delete",
    );
    await client.query(
      "alter table public.race_members enable trigger race_members_protect_owner",
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    console.log(`\n  (limpeza da prova falhou: ${error.message})`);
  }

  const { error } = await admin.auth.admin.deleteUser(diretorId);
  if (error) console.log(`  (diretor de teste não removido: ${error.message})`);
}

main()
  .then(async () => {
    await client.end().catch(() => {});
    console.log(`\n${passed} ok, ${failed} falha(s)\n`);
    process.exit(failed === 0 ? 0 : 1);
  })
  .catch(async (error) => {
    await client.end().catch(() => {});
    console.error("\nERRO:", error.message);
    process.exit(1);
  });
