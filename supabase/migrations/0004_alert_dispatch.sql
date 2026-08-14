-- ===========================================================================
-- Alertas: acionamento automático e consciência coletiva
--
-- Muda o modelo de "o motorista avisa a direção, a direção decide" para o que
-- funciona num app de trânsito colaborativo: quem está perto fica sabendo na
-- hora, e o socorro certo já é acionado sozinho.
--
-- A regra de segurança que orienta o desenho: FALHAR PARA O LADO DO SOCORRO.
-- O acionamento acontece automaticamente e imediatamente; o diretor pode
-- REDIRECIONAR, não precisa AUTORIZAR. Um alerta de acidente que fica parado
-- esperando alguém clicar é um alerta que falhou, e a pessoa caída no asfalto
-- não tem como saber que o clique não veio.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Acionamento
-- ---------------------------------------------------------------------------

alter table public.alerts
  -- 'auto'   → escolhido pelo sistema no instante do alerta
  -- 'manual' → o diretor escolheu ou trocou
  add column dispatch_mode text
    check (dispatch_mode in ('auto', 'manual')),

  -- O motorista acionado confirmou que está indo. Fecha o laço: quem pediu
  -- socorro precisa saber que alguém assumiu, não só que "o sistema mandou".
  add column dispatch_acknowledged_at timestamptz,
  add column dispatch_declined_at     timestamptz,
  add column dispatch_decline_reason  text,

  -- Quando o veículo acionado chegou ao local.
  add column on_scene_at timestamptz,

  -- Por que o sistema escolheu este veículo. Guardado em texto legível para
  -- revisão pós-prova: "moto 3, 1,2 km atrás pelo percurso, ~2 min".
  add column dispatch_reason text,

  -- Até quando este alerta deve aparecer no mapa dos outros veículos.
  -- Alerta resolvido some; alerta esquecido expira sozinho em vez de poluir o
  -- mapa pelo resto da prova.
  add column visible_until timestamptz,

  -- Raio, em metros ao longo do percurso, dentro do qual os veículos que se
  -- aproximam recebem aviso. Mecânico parado importa a 1 km; acidente importa
  -- de muito mais longe.
  add column proximity_radius_m integer not null default 1500;

-- Consulta quente do app do motorista: "quais alertas ativos existem nesta
-- prova agora". Roda a cada polling de cada veículo.
create index alerts_active_for_map_idx
  on public.alerts (race_id, route_offset_m)
  where status in ('open', 'acknowledged', 'dispatched', 'en_route', 'on_scene');

-- Consulta do app: "fui acionado para alguma coisa?"
create index alerts_dispatched_to_idx
  on public.alerts (dispatched_position_id, status)
  where dispatched_position_id is not null;

-- ---------------------------------------------------------------------------
-- Confirmação colaborativa
--
-- Outros veículos que passam pelo local confirmam que o problema continua lá
-- ou avisam que já foi resolvido. É o que impede o mapa de encher de alertas
-- fantasma — e o que dá ao diretor uma segunda fonte independente sobre um
-- incidente que ele não consegue ver.
-- ---------------------------------------------------------------------------

create table public.alert_confirmations (
  id           uuid primary key default gen_random_uuid(),
  alert_id     uuid not null references public.alerts (id) on delete cascade,
  position_id  uuid not null references public.race_positions (id) on delete cascade,
  race_id      uuid not null references public.races (id) on delete cascade,

  -- 'still_there' → confirmo que o problema continua
  -- 'cleared'     → passei pelo local e está liberado
  -- 'not_found'   → passei e não vi nada
  kind         text not null check (kind in ('still_there', 'cleared', 'not_found')),

  note         text check (length(note) <= 500),
  lat          double precision,
  lng          double precision,

  client_confirmation_id uuid not null,
  created_at   timestamptz not null default now(),
  received_at  timestamptz not null default now()
);

-- Idempotência, pelo mesmo motivo dos pings: o celular reenvia.
create unique index alert_confirmations_client_dedupe
  on public.alert_confirmations (position_id, client_confirmation_id);

create index alert_confirmations_alert_idx
  on public.alert_confirmations (alert_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Avisos de proximidade entregues
--
-- Registra que um veículo FOI avisado de um alerta à frente. Serve para não
-- repetir o aviso a cada polling — um alarme que toca de 3 em 3 segundos é um
-- alarme que o motorista desliga.
-- ---------------------------------------------------------------------------

create table public.alert_notifications (
  alert_id     uuid not null references public.alerts (id) on delete cascade,
  position_id  uuid not null references public.race_positions (id) on delete cascade,
  race_id      uuid not null references public.races (id) on delete cascade,
  kind         text not null check (kind in ('proximity', 'dispatch')),
  delivered_at timestamptz not null default now(),
  primary key (alert_id, position_id, kind)
);

create index alert_notifications_position_idx
  on public.alert_notifications (position_id, delivered_at desc);

-- ---------------------------------------------------------------------------
-- RLS das tabelas novas
-- ---------------------------------------------------------------------------

alter table public.alert_confirmations enable row level security;
alter table public.alert_notifications enable row level security;

create policy alert_confirmations_select on public.alert_confirmations
  for select to authenticated
  using (public.is_race_member(race_id));

create policy alert_notifications_select on public.alert_notifications
  for select to authenticated
  using (public.is_race_member(race_id));

-- Escrita só pela service_role: quem confirma é o celular do motorista, que
-- não tem credencial de banco.

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.alert_confirmations;
alter table public.alert_confirmations replica identity full;
