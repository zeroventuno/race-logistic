-- ===========================================================================
-- Endurecimento após revisão adversarial
--
-- Cada bloco aqui fecha um ataque que foi executado com sucesso contra o banco
-- vivo. Os comentários dizem qual, porque uma constraint sem motivo registrado
-- é uma constraint que alguém remove daqui a seis meses para "destravar" um
-- caso de teste.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Voltas
--
-- Um circuito percorrido 3 vezes é uma prova de 3 × o traçado. O percurso
-- físico é uma linha só que se sobrepõe a si mesma; a PROVA é essa linha
-- desenrolada. Sem saber o número de voltas, o sistema não tem como saber se
-- o vassoura no km 3 está na primeira ou na terceira passagem — e a janela
-- abertura↔fechamento compara coisas incomparáveis.
-- ---------------------------------------------------------------------------

alter table public.races
  add column laps integer not null default 1 check (laps between 1 and 50);

comment on column public.races.laps is
  'Número de voltas sobre o percurso. 1 = prova ponto-a-ponto ou circuito de volta única. A distância total da prova é laps × route_tracks.total_distance_m.';

-- ---------------------------------------------------------------------------
-- 2. CRÍTICO — roubo de prova por troca de created_by
--
-- ATAQUE EXECUTADO: um co-diretor fez PATCH em `races` mudando `created_by`
-- para si mesmo. A política de UPDATE checa `can_edit_race(id)` no USING e no
-- WITH CHECK, e nada protegia a coluna de dono. Imediatamente depois, o dono
-- original passou a enxergar ZERO provas, ZERO posições e ZERO alertas — sem
-- caminho de volta, porque o acesso dele vinha só de `created_by` e o criador
-- nunca era inserido em `race_members`. No meio de uma prova, o diretor perde
-- o mapa e não tem como recuperá-lo.
-- ---------------------------------------------------------------------------

create or replace function public.freeze_race_owner()
returns trigger
language plpgsql
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'created_by não pode ser alterado (prova %)', old.id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger races_freeze_owner
  before update on public.races
  for each row execute function public.freeze_race_owner();

-- O criador passa a ter uma segunda âncora de acesso, para que a expulsão
-- deixe de ser um único ponto de falha.
create or replace function public.add_creator_as_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.race_members (race_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (race_id, user_id) do update set role = 'owner';
  return new;
end;
$$;

create trigger races_add_creator
  after insert on public.races
  for each row execute function public.add_creator_as_owner();

-- Provas que já existem antes desta migração.
insert into public.race_members (race_id, user_id, role)
select id, created_by, 'owner' from public.races
on conflict (race_id, user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Só `owner` mexe na equipe
--
-- `race_members_write_owner` liberava para qualquer `director`, então um
-- co-diretor podia promover ou remover outros — inclusive o dono.
-- ---------------------------------------------------------------------------

create or replace function public.is_race_owner(p_race_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.races r
    where r.id = p_race_id and r.created_by = auth.uid()
  ) or exists (
    select 1 from public.race_members m
    where m.race_id = p_race_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  );
$$;

drop policy if exists race_members_write_owner on public.race_members;

create policy race_members_write_owner on public.race_members
  for all to authenticated
  using (public.is_race_owner(race_id))
  with check (public.is_race_owner(race_id));

-- O dono não pode se auto-rebaixar e deixar a prova sem dono.
create or replace function public.protect_last_owner()
returns trigger
language plpgsql
as $$
declare
  remaining integer;
begin
  if tg_op = 'DELETE' then
    if old.role <> 'owner' then return old; end if;
  else
    if old.role <> 'owner' or new.role = 'owner' then return new; end if;
  end if;

  select count(*) into remaining
  from public.race_members
  where race_id = old.race_id
    and role = 'owner'
    and user_id <> old.user_id;

  if remaining = 0 then
    raise exception 'A prova precisa de pelo menos um responsável.'
      using errcode = 'check_violation';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger race_members_protect_owner
  before update or delete on public.race_members
  for each row execute function public.protect_last_owner();

-- ---------------------------------------------------------------------------
-- 4. CRÍTICO — qualquer membro lia o bind_code de todos os veículos
--
-- ATAQUE EXECUTADO: `GET /rest/v1/race_positions?select=label,bind_code`
-- devolveu os códigos de todas as posições — para qualquer membro, inclusive
-- o papel `viewer`, que o próprio schema define como somente-leitura.
--
-- O app do motorista não pede conta nenhuma: QUEM TEM O CÓDIGO VIRA O GPS
-- DAQUELE VEÍCULO. Ou seja, um observador podia se passar pelo carro de
-- abertura, e o diretor liberaria rua olhando um marcador falso.
--
-- A correção é privilégio por COLUNA. `grant select` em tabela concede todas as
-- colunas e não dá para revogar uma; a única forma correta é conceder a lista
-- explícita, deixando o segredo de fora.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update on public.races to authenticated;
grant select, insert, update, delete on public.race_members to authenticated;
grant select, insert, update, delete on public.route_tracks to authenticated;
-- `token_hash` fica de fora: exposição desnecessária de material de sessão.
grant select (
  id, position_id, race_id, device_label, user_agent, bound_at,
  last_seen_at, last_ping_at, pings_received, revoked_at, revoked_reason
),
update (revoked_at, revoked_reason)
on public.position_sessions to authenticated;

-- `bind_code` fica de fora da leitura E da escrita. O código é emitido pela
-- função `issue_bind_code`, que verifica permissão e roda com privilégio
-- elevado — o cliente nunca precisa tocar na coluna.
grant select (
  id, race_id, role, label, ordinal, driver_name, driver_phone, vehicle_plate,
  is_reference_lead, is_reference_sweep, is_dispatchable,
  bind_code_issued_at, bind_code_expires_at, bind_code_revoked_at,
  created_at, updated_at
),
insert (
  id, race_id, role, label, ordinal, driver_name, driver_phone, vehicle_plate,
  is_reference_lead, is_reference_sweep, is_dispatchable
),
update (
  role, label, ordinal, driver_name, driver_phone, vehicle_plate,
  is_reference_lead, is_reference_sweep, is_dispatchable, bind_code_revoked_at
)
on public.race_positions to authenticated;

grant delete on public.race_positions to authenticated;
grant select on public.location_pings to authenticated;
grant select on public.position_state to authenticated;
grant select, insert, update on public.alerts to authenticated;
grant select on public.alert_suggestions to authenticated;
grant select, insert on public.alert_events to authenticated;
grant select on public.gap_snapshots to authenticated;
grant select on public.alert_confirmations to authenticated;
grant select on public.alert_notifications to authenticated;
-- bind_attempts: nenhum grant. Só service_role.

-- O revoke acima também tirou TRUNCATE, que era um furo real: TRUNCATE IGNORA
-- RLS. Um `truncate public.alerts cascade` executado como `authenticated`
-- apagava os alertas de TODAS as provas do sistema. Não era alcançável por
-- HTTP hoje (PostgREST não emite TRUNCATE), mas a defesa inteira dependia
-- desse acidente.

-- Emissão de código: acontece no banco, com privilégio elevado e verificação
-- de permissão explícita. O cliente nunca precisa escrever nem ler a coluna.
create or replace function public.generate_bind_code()
returns text
language plpgsql
volatile
as $$
declare
  -- Crockford Base32: sem I, L, O, U. 32 divide 256, então o módulo abaixo
  -- é uniforme sem precisar de rejeição.
  alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  bytes bytea := gen_random_bytes(6);
  result text := '';
  i integer;
begin
  for i in 0..5 loop
    result := result || substr(alphabet, 1 + (get_byte(bytes, i) % 32), 1);
  end loop;
  return result;
end;
$$;

create or replace function public.issue_bind_code(
  p_position_id uuid,
  p_valid_for interval default interval '30 days'
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_race_id uuid;
  v_code text;
  v_attempt integer := 0;
begin
  select race_id into v_race_id
  from public.race_positions where id = p_position_id;

  if v_race_id is null then
    raise exception 'Posição não encontrada.' using errcode = 'no_data_found';
  end if;

  if not public.can_edit_race(v_race_id) then
    raise exception 'Sem permissão para emitir código nesta prova.'
      using errcode = 'insufficient_privilege';
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_code := public.generate_bind_code();

    begin
      update public.race_positions
        set bind_code = v_code,
            bind_code_issued_at = now(),
            bind_code_expires_at = now() + p_valid_for,
            bind_code_revoked_at = null
      where id = p_position_id;

      return v_code;
    exception when unique_violation then
      if v_attempt >= 20 then
        raise exception 'Não foi possível gerar um código único.';
      end if;
    end;
  end loop;
end;
$$;

-- Leitura dos códigos: só para quem pode editar a prova, e só dela.
create or replace function public.race_bind_codes(p_race_id uuid)
returns table (position_id uuid, label text, ordinal integer, bind_code text,
               expires_at timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.can_edit_race(p_race_id) then
    raise exception 'Sem permissão para ver os códigos desta prova.'
      using errcode = 'insufficient_privilege';
  end if;

  return query
    select p.id, p.label, p.ordinal, p.bind_code, p.bind_code_expires_at
    from public.race_positions p
    where p.race_id = p_race_id
      and p.bind_code_revoked_at is null
    order by p.ordinal;
end;
$$;

-- Insert sem `bind_code` precisa funcionar, já que o cliente não tem acesso à
-- coluna. O default gera um código válido na hora; `issue_bind_code` continua
-- sendo o caminho para reemitir depois.
alter table public.race_positions
  alter column bind_code set default public.generate_bind_code();

revoke execute on function public.generate_bind_code() from public, anon;
revoke execute on function public.issue_bind_code(uuid, interval) from public, anon;
revoke execute on function public.race_bind_codes(uuid) from public, anon;
grant execute on function public.issue_bind_code(uuid, interval) to authenticated;
grant execute on function public.race_bind_codes(uuid) to authenticated;

-- O `revoke execute ... from public` da migração 0002 não tirou o EXECUTE de
-- `anon` nestas duas: o grant vinha explícito dos privilégios padrão do
-- Supabase, não via PUBLIC. Não era explorável (devolvem false para anônimo),
-- mas a intenção da migração falhava em silêncio.
revoke execute on function public.is_race_member(uuid) from anon;
revoke execute on function public.can_edit_race(uuid) from anon;
revoke execute on function public.is_race_owner(uuid) from public, anon;
grant execute on function public.is_race_owner(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Códigos expiram
--
-- `bind_code_expires_at` era nullable, sem default, e nada a preenchia. Todo
-- código de toda prova já criada continuava válido para sempre — um código
-- impresso para uma prova em rascunho ainda vincularia um celular meses
-- depois. Com 30 bits de espaço, um pool que só cresce é o pior cenário para
-- adivinhação por força bruta.
-- ---------------------------------------------------------------------------

update public.race_positions
  set bind_code_expires_at = coalesce(bind_code_expires_at, now() + interval '30 days')
  where bind_code_revoked_at is null;

alter table public.race_positions
  alter column bind_code_expires_at set default (now() + interval '30 days');

-- ---------------------------------------------------------------------------
-- 6. Uma posição não pode ser abertura E fechamento ao mesmo tempo
--
-- Os dois índices únicos parciais eram independentes, então marcar a mesma
-- posição como as duas coisas era aceito. A janela passava a comparar o
-- veículo consigo mesmo: gap sempre zero, e os limites de min/max nunca
-- disparavam. Falha perfeitamente silenciosa.
-- ---------------------------------------------------------------------------

alter table public.race_positions
  add constraint lead_and_sweep_are_different
  check (not (is_reference_lead and is_reference_sweep));

-- ---------------------------------------------------------------------------
-- 7. `position_state` aceitava NaN
--
-- `location_pings` tinha CHECK de faixa; `position_state` — a tabela que o
-- mapa desenha e o Realtime transmite — não tinha nada. Aceitava NaN, ±Inf e
-- lat=999. Pior, a API devolvia `"lat": "NaN"` como STRING onde o tipo
-- TypeScript declara `number`: divergência que o compilador não pega e que
-- estoura no cliente.
-- ---------------------------------------------------------------------------

delete from public.position_state
  where lat is null or lng is null
     or lat <> lat or lng <> lng
     or lat not between -90 and 90
     or lng not between -180 and 180;

alter table public.position_state
  add constraint position_state_lat_valid check (lat between -90 and 90),
  add constraint position_state_lng_valid check (lng between -180 and 180),
  add constraint position_state_speed_sane
    check (speed_mps is null or (speed_mps >= 0 and speed_mps <= 200)),
  add constraint position_state_heading_sane
    check (heading_deg is null or (heading_deg >= 0 and heading_deg < 360)),
  add constraint position_state_rolling_speed_sane
    check (rolling_speed_mps is null or (rolling_speed_mps >= 0 and rolling_speed_mps <= 200));

alter table public.location_pings
  add constraint location_pings_speed_sane
    check (speed_mps is null or (speed_mps >= -1 and speed_mps <= 200)),
  add constraint location_pings_heading_sane
    check (heading_deg is null or (heading_deg >= 0 and heading_deg < 360));

-- ---------------------------------------------------------------------------
-- 8. `race_id` não podia divergir da posição
--
-- Aceito antes: inserir um ping com `race_id` da prova B e `position_id` de
-- uma posição da prova A. Todas as políticas de telemetria filtram por
-- `race_id`, então a linha ficava visível para a prova errada e invisível para
-- a certa.
-- ---------------------------------------------------------------------------

alter table public.race_positions
  add constraint race_positions_id_race_unique unique (id, race_id);

delete from public.location_pings lp
  using public.race_positions rp
  where lp.position_id = rp.id and lp.race_id <> rp.race_id;

delete from public.position_state ps
  using public.race_positions rp
  where ps.position_id = rp.id and ps.race_id <> rp.race_id;

alter table public.location_pings
  add constraint location_pings_position_matches_race
  foreign key (position_id, race_id)
  references public.race_positions (id, race_id) on delete cascade;

alter table public.position_state
  add constraint position_state_position_matches_race
  foreign key (position_id, race_id)
  references public.race_positions (id, race_id) on delete cascade;

alter table public.position_sessions
  add constraint position_sessions_position_matches_race
  foreign key (position_id, race_id)
  references public.race_positions (id, race_id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 9. O alerta é testemunho: o conteúdo não se reescreve
--
-- ATAQUE EXECUTADO: um diretor reescreveu um incidente inteiro —
-- `{"note":"nada aconteceu","category":"other","lat":0,"lng":0,
--   "created_at":"<agora>"}` → 200 OK. E a máquina de estados não tinha
-- dentes: `status='resolved'` com `acknowledged_at` nulo era aceito,
-- `acknowledged_at` posterior a `resolved_at` era aceito.
--
-- O que aconteceu no percurso não muda. O que muda é o que a direção FEZ a
-- respeito — e isso tem colunas próprias, com carimbo de tempo e de autor.
-- ---------------------------------------------------------------------------

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
     or new.note is distinct from old.note
     or new.created_at is distinct from old.created_at
     or new.received_at is distinct from old.received_at
  then
    raise exception 'O conteúdo de um alerta não pode ser alterado. Use os campos de acompanhamento (status, reconhecimento, despacho, resolução).'
      using errcode = 'check_violation';
  end if;

  -- Transições válidas. Estados finais são finais.
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

create trigger alerts_freeze_facts
  before update on public.alerts
  for each row execute function public.freeze_alert_facts();

-- ---------------------------------------------------------------------------
-- 10. Auditoria não é forjável
--
-- ATAQUE EXECUTADO: inserir `alert_events` com
-- `actor_type='director', actor_id='<uuid de outra pessoa>'` → 201 Created.
-- `actor_id` era texto livre, sem vínculo com quem estava autenticado. Uma
-- trilha de auditoria que qualquer um pode assinar com o nome alheio não é
-- trilha de auditoria.
-- ---------------------------------------------------------------------------

create or replace function public.stamp_alert_event_actor()
returns trigger
language plpgsql
as $$
begin
  -- A service_role escreve em nome do motorista e do sistema; ela tem que
  -- poder declarar o ator. Um usuário autenticado, não.
  if auth.uid() is not null then
    new.actor_type := 'director';
    new.actor_id := auth.uid()::text;
  end if;

  if new.type is null or length(trim(new.type)) = 0 then
    raise exception 'alert_events.type não pode ser vazio.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger alert_events_stamp_actor
  before insert on public.alert_events
  for each row execute function public.stamp_alert_event_actor();

-- ---------------------------------------------------------------------------
-- 11. Apagar uma posição não pode apagar o rastro dela
--
-- ATAQUE EXECUTADO: `DELETE /rest/v1/race_positions?id=eq.<p>` levou junto
-- todos os `location_pings` e a sessão, por CASCADE. Uma chamada HTTP destruía
-- a trilha inteira do veículo envolvido num acidente.
--
-- Posição sem histórico continua removível (cadastro errado, corrigido antes
-- da largada). Posição que já transmitiu vira registro.
-- ---------------------------------------------------------------------------

create or replace function public.block_delete_of_used_position()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.location_pings where position_id = old.id limit 1)
     or exists (select 1 from public.alerts where raised_by_position_id = old.id limit 1)
  then
    raise exception 'A posição "%" já transmitiu ou disparou alertas e não pode ser apagada. O histórico é registro da prova.', old.label
      using errcode = 'check_violation';
  end if;
  return old;
end;
$$;

create trigger race_positions_block_delete
  before delete on public.race_positions
  for each row execute function public.block_delete_of_used_position();

-- ---------------------------------------------------------------------------
-- 12. `bind_attempts` guardava o código VÁLIDO em texto claro
--
-- `select code_attempted from bind_attempts where succeeded` devolvia a lista
-- de todos os códigos vivos do sistema, para sempre. Guardar o hash serve
-- igualmente para rate limiting por código e não cria um cofre de chaves.
-- ---------------------------------------------------------------------------

alter table public.bind_attempts
  add column code_hash text,
  add column race_id uuid references public.races (id) on delete set null;

update public.bind_attempts
  set code_hash = encode(digest(code_attempted, 'sha256'), 'hex')
  where code_hash is null;

alter table public.bind_attempts drop column code_attempted;
alter table public.bind_attempts alter column code_hash set not null;

drop index if exists public.bind_attempts_code_idx;

-- Rate limiting por código: é a trava que um atacante rodando IP não dribla.
create index bind_attempts_code_hash_idx
  on public.bind_attempts (code_hash, created_at desc);

-- Purga por tempo sem varredura completa.
create index bind_attempts_created_idx
  on public.bind_attempts (created_at);

create index bind_attempts_race_idx
  on public.bind_attempts (race_id, created_at desc)
  where race_id is not null;

comment on table public.bind_attempts is
  'Tentativas de vínculo, para rate limiting. Guarda o HASH do código, nunca o código. Purgar registros com mais de 7 dias.';
