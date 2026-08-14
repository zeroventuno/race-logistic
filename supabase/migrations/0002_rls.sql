-- ===========================================================================
-- Row Level Security
--
-- Existem dois tipos de cliente neste sistema, e eles são protegidos de
-- maneiras diferentes:
--
--  DIRETOR (authenticated). Fala direto com o Postgres pelo supabase-js, e é
--  o RLS que o limita a enxergar apenas as provas de que ele participa. O
--  Realtime respeita RLS, então a mesma política que protege um SELECT
--  protege a assinatura ao vivo.
--
--  MOTORISTA (sem conta). NÃO tem credencial de banco nenhuma. O app dele
--  fala só com Route Handlers do Next.js, que validam o token de sessão e
--  escrevem usando a service_role. Por isso não existe nenhuma política para
--  `anon` aqui: com RLS ligado e nenhuma política, o padrão é negar tudo, que
--  é exatamente o que queremos. Um vazamento da chave anon (que é pública por
--  natureza) não dá acesso a nada.
--
-- Regra geral: SELECT é liberado para membros da prova; escrita que o diretor
-- faz pela interface é liberada para membros; escrita de telemetria
-- (pings, estado, alertas vindos do celular) passa só pela service_role.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Função auxiliar de pertencimento
--
-- SECURITY DEFINER para poder ler `races`/`race_members` sem disparar
-- recursão de política. `search_path` fixo porque uma função SECURITY DEFINER
-- com search_path mutável é uma escalada de privilégio esperando acontecer.
-- ---------------------------------------------------------------------------

create or replace function public.is_race_member(p_race_id uuid)
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
    where m.race_id = p_race_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_race(p_race_id uuid)
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
      and m.role in ('owner', 'director')
  );
$$;

revoke execute on function public.is_race_member(uuid) from public;
revoke execute on function public.can_edit_race(uuid) from public;
grant execute on function public.is_race_member(uuid) to authenticated;
grant execute on function public.can_edit_race(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Liga RLS em absolutamente tudo
-- ---------------------------------------------------------------------------

alter table public.profiles           enable row level security;
alter table public.races              enable row level security;
alter table public.race_members       enable row level security;
alter table public.route_tracks       enable row level security;
alter table public.race_positions     enable row level security;
alter table public.position_sessions  enable row level security;
alter table public.bind_attempts      enable row level security;
alter table public.location_pings     enable row level security;
alter table public.position_state     enable row level security;
alter table public.alerts             enable row level security;
alter table public.alert_suggestions  enable row level security;
alter table public.alert_events       enable row level security;
alter table public.gap_snapshots      enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- races
-- ---------------------------------------------------------------------------

create policy races_select_member on public.races
  for select to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.race_members m
      where m.race_id = races.id and m.user_id = auth.uid()
    )
  );

create policy races_insert_self on public.races
  for insert to authenticated
  with check (created_by = auth.uid());

create policy races_update_editor on public.races
  for update to authenticated
  using (public.can_edit_race(id))
  with check (public.can_edit_race(id));

-- Provas não são deletadas pela interface: uma prova acontecida é registro
-- histórico (alertas, trajetos, decisões). O caminho é status = 'archived'.

-- ---------------------------------------------------------------------------
-- race_members
-- ---------------------------------------------------------------------------

create policy race_members_select on public.race_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_race_member(race_id));

create policy race_members_write_owner on public.race_members
  for all to authenticated
  using (public.can_edit_race(race_id))
  with check (public.can_edit_race(race_id));

-- ---------------------------------------------------------------------------
-- route_tracks — o diretor cria e substitui pela interface
-- ---------------------------------------------------------------------------

create policy route_tracks_select on public.route_tracks
  for select to authenticated
  using (public.is_race_member(race_id));

create policy route_tracks_write on public.route_tracks
  for all to authenticated
  using (public.can_edit_race(race_id))
  with check (public.can_edit_race(race_id));

-- ---------------------------------------------------------------------------
-- race_positions — o diretor cadastra as posições e regera códigos
-- ---------------------------------------------------------------------------

create policy race_positions_select on public.race_positions
  for select to authenticated
  using (public.is_race_member(race_id));

create policy race_positions_write on public.race_positions
  for all to authenticated
  using (public.can_edit_race(race_id))
  with check (public.can_edit_race(race_id));

-- ---------------------------------------------------------------------------
-- position_sessions — leitura para o diretor ver quem está vinculado.
-- Escrita só pela service_role (o vínculo acontece no Route Handler).
-- ---------------------------------------------------------------------------

create policy position_sessions_select on public.position_sessions
  for select to authenticated
  using (public.is_race_member(race_id));

-- Revogar uma sessão ("esse celular não é mais o carro 3") é ação de diretor.
create policy position_sessions_revoke on public.position_sessions
  for update to authenticated
  using (public.can_edit_race(race_id))
  with check (public.can_edit_race(race_id));

-- ---------------------------------------------------------------------------
-- bind_attempts — nenhuma política. Só service_role enxerga.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Telemetria: leitura para membros, escrita só pela service_role
-- ---------------------------------------------------------------------------

create policy location_pings_select on public.location_pings
  for select to authenticated
  using (public.is_race_member(race_id));

create policy position_state_select on public.position_state
  for select to authenticated
  using (public.is_race_member(race_id));

create policy gap_snapshots_select on public.gap_snapshots
  for select to authenticated
  using (public.is_race_member(race_id));

-- ---------------------------------------------------------------------------
-- alerts
--
-- Criação vem do celular (service_role). O diretor precisa poder mudar o
-- status — reconhecer, despachar, resolver — e é isso que a política de UPDATE
-- libera. Não existe DELETE: um alerta de ambulância não pode ser apagado,
-- só cancelado com registro de quem cancelou.
-- ---------------------------------------------------------------------------

create policy alerts_select on public.alerts
  for select to authenticated
  using (public.is_race_member(race_id));

create policy alerts_update_director on public.alerts
  for update to authenticated
  using (public.can_edit_race(race_id))
  with check (public.can_edit_race(race_id));

-- O diretor também pode abrir um alerta pelo dashboard (chamado por rádio).
create policy alerts_insert_director on public.alerts
  for insert to authenticated
  with check (public.can_edit_race(race_id) and raised_by_user_id = auth.uid());

create policy alert_suggestions_select on public.alert_suggestions
  for select to authenticated
  using (
    exists (
      select 1 from public.alerts a
      where a.id = alert_suggestions.alert_id
        and public.is_race_member(a.race_id)
    )
  );

create policy alert_events_select on public.alert_events
  for select to authenticated
  using (
    exists (
      select 1 from public.alerts a
      where a.id = alert_events.alert_id
        and public.is_race_member(a.race_id)
    )
  );

-- Ações do diretor sobre um alerta geram evento de auditoria escrito pelo
-- próprio cliente, então INSERT precisa ser permitido para membros.
create policy alert_events_insert on public.alert_events
  for insert to authenticated
  with check (
    exists (
      select 1 from public.alerts a
      where a.id = alert_events.alert_id
        and public.can_edit_race(a.race_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Nenhuma tabela concede permissão a `anon`. O app do motorista não toca no
-- banco diretamente — se algum dia tocar, será por uma política explícita
-- escrita de propósito, não por herança acidental.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
grant usage on schema public to anon;
