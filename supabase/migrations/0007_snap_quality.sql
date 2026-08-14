-- ===========================================================================
-- Qualidade da âncora e contagem de voltas na telemetria
--
-- `snapToRoute` já devolve três informações que o sistema estava jogando fora
-- por não ter onde guardá-las: `confidence`, `ambiguous` e `lap`. A ausência
-- dessas colunas não era uma lacuna de conveniência — era o que transformava
-- um palpite em fato.
--
-- MEDIDO num percurso real: 12 minutos sem sinal numa perna de retorno fazem
-- a âncora cair 37 km para trás. O snap sabia: devolveu `ambiguous = true` e
-- `confidence = 'low'`. A ingestão descartou os dois e gravou `off_route =
-- false`, `snap_distance_m = 0`. Do ponto de vista de quem lia o banco, era
-- uma posição perfeita. A ambulância a 200 m do ciclista foi anunciada como
-- estando a 37,6 km e 39 minutos de distância.
--
-- E MEDIDO num circuito de 3 voltas: 120,7 km percorridos, 10,9 km gravados.
-- 109,7 km de prova que simplesmente não existiam para o sistema.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Telemetria
-- ---------------------------------------------------------------------------

alter table public.location_pings
  add column snap_confidence text
    check (snap_confidence is null or snap_confidence in ('high', 'medium', 'low')),
  add column snap_ambiguous boolean not null default false,
  add column snap_method text,
  add column lap integer not null default 0 check (lap >= 0);

alter table public.position_state
  add column snap_confidence text
    check (snap_confidence is null or snap_confidence in ('high', 'medium', 'low')),
  add column snap_ambiguous boolean not null default false,
  add column lap integer not null default 0 check (lap >= 0),

  -- Distância percorrida de prova contando as voltas.
  --
  -- `route_offset_m` continua sendo a posição DENTRO do traçado — é o que o
  -- mapa usa para desenhar. `absolute_offset_m` é a posição na PROVA, e é o
  -- único número com que se pode comparar dois veículos: num circuito, o
  -- abertura na volta 3 e o vassoura na volta 1 ocupam o mesmo ponto do mapa
  -- e estão a duas voltas de distância um do outro.
  add column absolute_offset_m double precision;

-- Preenche o histórico existente com a interpretação conservadora.
update public.position_state
  set absolute_offset_m = route_offset_m
  where absolute_offset_m is null and route_offset_m is not null;

-- ---------------------------------------------------------------------------
-- Alertas
--
-- O alerta congela a posição no instante em que é disparado. Se essa posição
-- veio de uma âncora ambígua, quem for despachado precisa saber — a diferença
-- entre "a 200 m" e "a 37 km" decide se alguém pega o rádio.
-- ---------------------------------------------------------------------------

alter table public.alerts
  add column route_offset_confidence text
    check (route_offset_confidence is null
           or route_offset_confidence in ('high', 'medium', 'low')),
  add column route_offset_ambiguous boolean not null default false,
  add column lap integer not null default 0 check (lap >= 0),
  add column absolute_offset_m double precision;

-- Os campos novos descrevem o FATO do alerta, então entram no congelamento.
create or replace function public.freeze_alert_facts()
returns trigger
language plpgsql
as $$
begin
  if new.race_id is distinct from old.race_id
     or new.client_alert_id is distinct from old.client_alert_id
     or new.category is distinct from old.category
     or new.raised_by_position_id is distinct from old.raised_by_position_id
     or new.raised_by_user_id is distinct from old.raised_by_user_id
     or new.lat is distinct from old.lat
     or new.lng is distinct from old.lng
     or new.accuracy_m is distinct from old.accuracy_m
     or new.route_offset_m is distinct from old.route_offset_m
     or new.absolute_offset_m is distinct from old.absolute_offset_m
     or new.lap is distinct from old.lap
     or new.route_offset_confidence is distinct from old.route_offset_confidence
     or new.route_offset_ambiguous is distinct from old.route_offset_ambiguous
     or new.note is distinct from old.note
     or new.created_at is distinct from old.created_at
     or new.received_at is distinct from old.received_at
  then
    raise exception 'O conteúdo de um alerta não pode ser alterado. Use os campos de acompanhamento (status, reconhecimento, despacho, resolução).'
      using errcode = 'check_violation';
  end if;

  if old.status in ('resolved', 'cancelled')
     and new.status is distinct from old.status then
    raise exception 'Alerta % já está %.', old.id, old.status
      using errcode = 'check_violation';
  end if;

  if new.status <> 'open' and new.acknowledged_at is null then
    new.acknowledged_at := now();
  end if;

  if new.status = 'resolved' and new.resolved_at is null then
    new.resolved_at := now();
  end if;

  if new.resolved_at is not null and new.acknowledged_at is not null
     and new.resolved_at < new.acknowledged_at then
    raise exception 'Resolução não pode ser anterior ao reconhecimento.'
      using errcode = 'check_violation';
  end if;

  if new.status in ('dispatched', 'en_route', 'on_scene')
     and new.dispatched_position_id is null then
    raise exception 'Status % exige um veículo acionado.', new.status
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Acionamento: um veículo por vez
--
-- MEDIDO: três acidentes simultâneos acionaram a MESMA ambulância nos três, e
-- a tela dela mostrava só um. Os motoristas dos outros dois viam
-- "Ambulância 1 acionada" — sinal verde — e ninguém estava indo até eles.
--
-- O índice abaixo não impede o acionamento duplo sozinho (a escolha do
-- veículo acontece na aplicação), mas torna o estado inconsistente impossível
-- de gravar: se a aplicação errar, o banco recusa em vez de aceitar em
-- silêncio.
-- ---------------------------------------------------------------------------

create unique index alerts_one_active_dispatch_per_vehicle
  on public.alerts (dispatched_position_id)
  where dispatched_position_id is not null
    and status in ('dispatched', 'en_route', 'on_scene');

-- ---------------------------------------------------------------------------
-- Reprocessamento de acionamento
--
-- MEDIDO: quando todos os veículos despacháveis estão sem sinal no instante do
-- alerta — o cenário do túnel — nenhum acionamento acontece, e nada nunca
-- reconsidera. Trinta segundos depois a ambulância volta a transmitir e o
-- alerta continua órfão para sempre.
--
-- Esta coluna marca os alertas que precisam de nova tentativa. Uma varredura
-- periódica os reprocessa.
-- ---------------------------------------------------------------------------

alter table public.alerts
  add column dispatch_retry_after timestamptz,
  add column dispatch_attempts integer not null default 0;

create index alerts_awaiting_dispatch_idx
  on public.alerts (race_id, dispatch_retry_after)
  where dispatched_position_id is null
    and status in ('open', 'acknowledged');

comment on column public.alerts.dispatch_retry_after is
  'Instante a partir do qual o acionamento deve ser tentado de novo. Preenchido quando não havia veículo disponível (todos sem sinal, ou todos já acionados). Nulo quando o alerta já tem dono ou está encerrado.';
