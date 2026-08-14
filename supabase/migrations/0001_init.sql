-- ===========================================================================
-- Flamme Rouge — schema inicial
--
-- Princípios de projeto que atravessam este schema:
--
--  1. INGESTÃO IDEMPOTENTE. Um celular com sinal instável vai reenviar o mesmo
--     ping e o mesmo alerta várias vezes. Toda escrita vinda do dispositivo
--     carrega um id gerado no cliente e tem índice único, então retry nunca
--     duplica dado.
--
--  2. HISTÓRICO IMUTÁVEL + SNAPSHOT RÁPIDO. `location_pings` é append-only
--     (auditoria, replay pós-prova). `position_state` guarda só o último
--     estado de cada posição — é a tabela que o Realtime observa, com uma
--     linha por veículo em vez de milhares.
--
--  3. CHEGADA FORA DE ORDEM É NORMAL. Quando o motorista recupera sinal ele
--     descarrega a fila offline, e pings antigos chegam depois de pings novos.
--     O upsert de `position_state` só avança se `recorded_at` for mais recente.
--
--  4. ALERTA NUNCA SOME. `alerts` tem trilha de auditoria própria
--     (`alert_events`), nunca é deletado, e o status só avança por ação
--     explícita e registrada de um humano.
--
--  5. RLS EM TUDO. O dashboard do diretor fala direto com o Postgres via
--     Supabase (com RLS). O app do motorista NÃO tem credencial de banco —
--     ele fala só com Route Handlers do Next.js, que validam um token de
--     sessão opaco e escrevem com service_role.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type race_status as enum ('draft', 'armed', 'live', 'finished', 'archived');

create type position_role as enum (
  'lead_car',    -- carro de abertura
  'sweep_car',   -- carro de fechamento / vassoura
  'moto',        -- moto de apoio
  'ambulance',   -- ambulância
  'mechanic',    -- apoio mecânico
  'support_car', -- carro de apoio genérico
  'marshal',     -- fiscal / staff em ponto fixo
  'other'
);

create type alert_category as enum ('mechanical', 'medical', 'other');

create type alert_status as enum ('open', 'acknowledged', 'dispatched', 'resolved', 'cancelled');

create type alert_priority as enum ('critical', 'high', 'normal');

create type track_source as enum ('gpx', 'drawn');

-- ---------------------------------------------------------------------------
-- Perfis (espelho leve de auth.users, para exibir nome do diretor)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Provas
-- ---------------------------------------------------------------------------

create table public.races (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (length(trim(name)) between 1 and 200),
  location            text,
  status              race_status not null default 'draft',
  scheduled_start     timestamptz,
  actual_start        timestamptz,
  finished_at         timestamptz,
  timezone            text not null default 'Europe/Rome',

  -- Janela de tempo entre carro de abertura e carro de fechamento.
  -- `target` é o planejado; `min`/`max` são os limites que acendem alerta
  -- no dashboard quando o pelotão estica ou comprime demais.
  target_gap_minutes  integer not null default 30 check (target_gap_minutes between 1 and 600),
  min_gap_minutes     integer check (min_gap_minutes >= 0),
  max_gap_minutes     integer check (max_gap_minutes > 0),

  created_by          uuid not null references auth.users (id) on delete restrict,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint gap_window_coherent check (
    min_gap_minutes is null
    or max_gap_minutes is null
    or min_gap_minutes < max_gap_minutes
  )
);

create index races_created_by_idx on public.races (created_by, created_at desc);
create index races_status_idx on public.races (status) where status in ('armed', 'live');

-- Equipe da prova: permite mais de um diretor/coordenador no mesmo evento.
create table public.race_members (
  race_id     uuid not null references public.races (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null default 'director' check (role in ('owner', 'director', 'viewer')),
  created_at  timestamptz not null default now(),
  primary key (race_id, user_id)
);

create index race_members_user_idx on public.race_members (user_id);

-- ---------------------------------------------------------------------------
-- Percurso
--
-- `points` guarda a geometria completa já com distância cumulativa
-- pré-calculada, no formato compacto [[lng, lat, cum_m, ele_m|null], ...].
-- Pré-calcular a cumulativa aqui é o que torna o cálculo de gap ao longo da
-- rota barato em runtime: virar "posição na rota" em metros é uma busca
-- binária, não um recálculo do percurso inteiro a cada ping.
--
-- `render_points` é a mesma linha simplificada (Douglas-Peucker) só para
-- desenhar no mapa sem mandar 20 mil vértices para o browser.
-- ---------------------------------------------------------------------------

create table public.route_tracks (
  id                uuid primary key default gen_random_uuid(),
  race_id           uuid not null references public.races (id) on delete cascade,
  name              text,
  source            track_source not null,
  original_filename text,
  total_distance_m  double precision not null check (total_distance_m > 0),
  point_count       integer not null check (point_count >= 2),
  elevation_gain_m  double precision,
  bbox              jsonb not null,   -- {"minLng":..,"minLat":..,"maxLng":..,"maxLat":..}
  points            jsonb not null,   -- [[lng,lat,cum_m,ele|null], ...]
  render_points     jsonb not null,   -- [[lng,lat], ...] simplificado
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

create index route_tracks_race_idx on public.route_tracks (race_id);

-- Uma prova só pode ter um percurso ativo por vez.
create unique index route_tracks_one_active_per_race
  on public.route_tracks (race_id)
  where is_active;

-- ---------------------------------------------------------------------------
-- Posições de apoio
--
-- Uma "posição" é um papel operacional na prova (Moto 3, Ambulância 1), não um
-- aparelho. O aparelho é vinculado depois via código — e pode ser trocado no
-- meio da prova se o celular do motorista morrer, sem perder o histórico.
-- ---------------------------------------------------------------------------

create table public.race_positions (
  id                    uuid primary key default gen_random_uuid(),
  race_id               uuid not null references public.races (id) on delete cascade,
  role                  position_role not null,
  label                 text not null check (length(trim(label)) between 1 and 60),
  ordinal               integer not null check (ordinal > 0),
  driver_name           text,
  driver_phone          text,
  vehicle_plate         text,

  -- Marca qual posição é a referência oficial para o cálculo da janela.
  -- Garantidas como no máximo uma por prova pelos índices únicos abaixo.
  is_reference_lead     boolean not null default false,
  is_reference_sweep    boolean not null default false,

  -- Só posições que podem ser despachadas para atender um alerta entram na
  -- sugestão de "apoio mais próximo".
  is_dispatchable       boolean not null default true,

  bind_code             text not null check (bind_code ~ '^[A-Z0-9]{6}$'),
  bind_code_issued_at   timestamptz not null default now(),
  bind_code_expires_at  timestamptz,
  bind_code_revoked_at  timestamptz,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  unique (race_id, ordinal)
);

-- Código de vínculo é único globalmente enquanto estiver válido: o motorista
-- digita só 6 caracteres, sem escolher a prova, então não pode haver colisão
-- entre duas provas acontecendo no mesmo fim de semana.
create unique index race_positions_bind_code_unique
  on public.race_positions (bind_code)
  where bind_code_revoked_at is null;

create index race_positions_race_idx on public.race_positions (race_id, ordinal);

create unique index race_positions_one_lead
  on public.race_positions (race_id)
  where is_reference_lead;

create unique index race_positions_one_sweep
  on public.race_positions (race_id)
  where is_reference_sweep;

-- ---------------------------------------------------------------------------
-- Sessões de dispositivo
--
-- O app do motorista nunca recebe credencial de banco. Ele troca o código de
-- vínculo por um token opaco, e só o hash SHA-256 desse token é guardado —
-- vazamento do banco não permite personificar um veículo.
-- ---------------------------------------------------------------------------

create table public.position_sessions (
  id                 uuid primary key default gen_random_uuid(),
  position_id        uuid not null references public.race_positions (id) on delete cascade,
  race_id            uuid not null references public.races (id) on delete cascade,
  token_hash         text not null unique,
  device_label       text,
  user_agent         text,
  bound_at           timestamptz not null default now(),
  last_seen_at       timestamptz not null default now(),
  last_ping_at       timestamptz,
  pings_received     bigint not null default 0,
  revoked_at         timestamptz,
  revoked_reason     text
);

-- No máximo uma sessão ativa por posição: vincular um celular novo derruba o
-- anterior, então dois aparelhos nunca transmitem como o mesmo veículo.
create unique index position_sessions_one_active
  on public.position_sessions (position_id)
  where revoked_at is null;

create index position_sessions_race_idx on public.position_sessions (race_id);

-- ---------------------------------------------------------------------------
-- Tentativas de vínculo
--
-- Um código de 6 caracteres é curto o bastante para ser digitado com pressa e
-- curto o bastante para ser chutado em massa. Sem registro de tentativa, um
-- script poderia varrer o espaço de códigos e assumir o carro de abertura de
-- uma prova alheia. Esta tabela é a base do rate limiting e também do
-- diagnóstico ("o motorista jura que digitou certo" — dá para conferir).
-- ---------------------------------------------------------------------------

create table public.bind_attempts (
  id                 bigint generated always as identity primary key,
  code_attempted     text not null,
  client_fingerprint text not null,   -- hash de IP + user agent
  succeeded          boolean not null,
  position_id        uuid references public.race_positions (id) on delete set null,
  created_at         timestamptz not null default now()
);

create index bind_attempts_fingerprint_idx
  on public.bind_attempts (client_fingerprint, created_at desc);

create index bind_attempts_code_idx
  on public.bind_attempts (code_attempted, created_at desc);

-- ---------------------------------------------------------------------------
-- Pings de GPS (append-only)
-- ---------------------------------------------------------------------------

create table public.location_pings (
  id                bigint generated always as identity primary key,
  race_id           uuid not null references public.races (id) on delete cascade,
  position_id       uuid not null references public.race_positions (id) on delete cascade,
  session_id        uuid not null references public.position_sessions (id) on delete cascade,

  lat               double precision not null check (lat between -90 and 90),
  lng               double precision not null check (lng between -180 and 180),
  accuracy_m        double precision,
  altitude_m        double precision,
  speed_mps         double precision,
  heading_deg       double precision,

  -- Relógio do dispositivo (pode divergir) e relógio do servidor (verdade).
  recorded_at       timestamptz not null,
  received_at       timestamptz not null default now(),
  clock_skew_ms     bigint,

  -- Resultado do snap na rota, calculado na ingestão.
  route_offset_m    double precision,
  snap_distance_m   double precision,
  off_route         boolean not null default false,

  client_seq        bigint,
  client_ping_id    uuid not null,
  battery_pct       smallint check (battery_pct between 0 and 100),
  queued_offline    boolean not null default false
);

-- Idempotência: reenvio da fila offline não duplica ponto.
create unique index location_pings_client_dedupe
  on public.location_pings (position_id, client_ping_id);

create index location_pings_race_time_idx on public.location_pings (race_id, recorded_at desc);
create index location_pings_position_time_idx on public.location_pings (position_id, recorded_at desc);

-- ---------------------------------------------------------------------------
-- Estado atual de cada posição — a tabela que o Realtime observa
-- ---------------------------------------------------------------------------

create table public.position_state (
  position_id       uuid primary key references public.race_positions (id) on delete cascade,
  race_id           uuid not null references public.races (id) on delete cascade,
  session_id        uuid references public.position_sessions (id) on delete set null,

  lat               double precision not null,
  lng               double precision not null,
  accuracy_m        double precision,
  speed_mps         double precision,
  heading_deg       double precision,

  recorded_at       timestamptz not null,
  received_at       timestamptz not null default now(),

  route_offset_m    double precision,
  snap_distance_m   double precision,
  off_route         boolean not null default false,

  -- Velocidade média ao longo da rota nos últimos minutos. É o que gera uma
  -- ETA honesta: velocidade instantânea do GPS oscila demais (parada em
  -- semáforo zera, descida infla) para servir de base de projeção.
  rolling_speed_mps double precision,

  battery_pct       smallint,
  total_pings       bigint not null default 0,
  updated_at        timestamptz not null default now()
);

create index position_state_race_idx on public.position_state (race_id);

-- ---------------------------------------------------------------------------
-- Alertas
-- ---------------------------------------------------------------------------

create table public.alerts (
  id                     uuid primary key default gen_random_uuid(),
  race_id                uuid not null references public.races (id) on delete cascade,
  raised_by_position_id  uuid references public.race_positions (id) on delete set null,
  raised_by_user_id      uuid references auth.users (id) on delete set null,

  -- Gerado no dispositivo antes do primeiro envio. É o que garante que 5
  -- tentativas de envio do mesmo alerta viram 1 alerta, e que um alerta
  -- disparado offline chega inteiro quando o sinal volta.
  client_alert_id        uuid not null,

  category               alert_category not null,
  priority               alert_priority not null default 'high',
  note                   text check (length(note) <= 2000),

  lat                    double precision,
  lng                    double precision,
  accuracy_m             double precision,
  route_offset_m         double precision,

  status                 alert_status not null default 'open',
  created_at             timestamptz not null,      -- relógio do dispositivo
  received_at            timestamptz not null default now(),

  acknowledged_at        timestamptz,
  acknowledged_by        uuid references auth.users (id) on delete set null,
  dispatched_position_id uuid references public.race_positions (id) on delete set null,
  dispatched_at          timestamptz,
  resolved_at            timestamptz,
  resolved_by            uuid references auth.users (id) on delete set null,
  resolution_note        text,

  constraint ack_before_resolve check (
    resolved_at is null or acknowledged_at is not null
  )
);

create unique index alerts_client_dedupe on public.alerts (race_id, client_alert_id);
create index alerts_race_status_idx on public.alerts (race_id, status, received_at desc);

-- Índice parcial para a consulta mais quente do dashboard: "o que está aberto
-- agora e ainda não foi reconhecido por ninguém".
create index alerts_open_idx
  on public.alerts (race_id, received_at desc)
  where status in ('open', 'acknowledged', 'dispatched');

-- Sugestões de apoio mais próximo, congeladas no momento do alerta.
-- Guardar o snapshot em vez de recalcular depois preserva a razão pela qual o
-- sistema sugeriu aquele veículo — importante para revisão pós-incidente.
create table public.alert_suggestions (
  id                  uuid primary key default gen_random_uuid(),
  alert_id            uuid not null references public.alerts (id) on delete cascade,
  position_id         uuid not null references public.race_positions (id) on delete cascade,
  rank                integer not null check (rank > 0),
  route_distance_m    double precision,
  straight_distance_m double precision not null,
  eta_seconds         integer,
  is_ahead            boolean,
  reason              text,
  created_at          timestamptz not null default now(),
  unique (alert_id, position_id)
);

create index alert_suggestions_alert_idx on public.alert_suggestions (alert_id, rank);

-- Trilha de auditoria. Nunca deletada: se um alerta de ambulância for
-- questionado depois, dá para reconstruir minuto a minuto quem viu o quê.
create table public.alert_events (
  id          bigint generated always as identity primary key,
  alert_id    uuid not null references public.alerts (id) on delete cascade,
  type        text not null,
  actor_type  text not null check (actor_type in ('driver', 'director', 'system')),
  actor_id    text,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index alert_events_alert_idx on public.alert_events (alert_id, created_at);

-- ---------------------------------------------------------------------------
-- Histórico da janela abertura ↔ fechamento
-- ---------------------------------------------------------------------------

create table public.gap_snapshots (
  id                bigint generated always as identity primary key,
  race_id           uuid not null references public.races (id) on delete cascade,
  lead_offset_m     double precision,
  sweep_offset_m    double precision,
  gap_m             double precision,
  gap_seconds       integer,
  sweep_speed_mps   double precision,
  method            text not null,     -- 'route' | 'straight_fallback' | 'insufficient_data'
  computed_at       timestamptz not null default now()
);

create index gap_snapshots_race_time_idx on public.gap_snapshots (race_id, computed_at desc);

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger races_touch before update on public.races
  for each row execute function public.touch_updated_at();

create trigger race_positions_touch before update on public.race_positions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.position_state;
alter publication supabase_realtime add table public.alerts;
alter publication supabase_realtime add table public.race_positions;

-- `position_state` e `alerts` precisam de REPLICA IDENTITY FULL para que o
-- payload de UPDATE do Realtime traga a linha antiga também — sem isso o
-- dashboard não consegue distinguir "alerta mudou de status" de "alerta novo".
alter table public.position_state replica identity full;
alter table public.alerts replica identity full;
