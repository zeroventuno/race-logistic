-- Pontos de bloqueio: onde uma pessoa fica parada segurando o trânsito.
--
-- A unidade não é trecho de rua. Rua não fecha em faixa contínua — fecha em
-- rotatória, em cruzamento, em entroncamento, e em cada um desses pontos existe
-- alguém de pé. É a essa pessoa que o relatório final presta contas: "o seu
-- agente na rotatória da Via Roma ficou lá das 09h14 às 09h51".
--
-- A lista que vale é a que o organizador já entregou à prefeitura para
-- conseguir a autorização. O sistema semeia candidatos a partir do
-- OpenStreetMap no import do GPX, e a direção poda, renomeia e acrescenta.
--
-- TABELA LATERAL, DE PROPÓSITO. Nada aqui é lido no caminho quente do produto:
-- nem o despacho, nem a janela, nem o painel ao vivo sabem que ela existe. Ela
-- é lida uma vez, na hora de gerar o PDF. Um erro aqui não pode derrubar uma
-- prova em andamento.

create table if not exists public.route_blockpoints (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races(id) on delete cascade,

  -- Distância ao longo do percurso, em metros. É a chave que liga o ponto ao
  -- rastro dos veículos: dado o offset, sabemos quando cada um passou por ali.
  offset_m double precision not null check (offset_m >= 0),

  -- Nome quando houver. Sem nome, o relatório imprime o quilômetro, que é uma
  -- referência que todo mundo do meio entende.
  name text,

  -- 'detected' = veio do OpenStreetMap. 'manual' = a direção cadastrou.
  -- Serve para a tela distinguir o que o sistema sugeriu do que uma pessoa
  -- afirmou, e para uma nova detecção não apagar o trabalho de ninguém.
  source text not null default 'manual' check (source in ('detected', 'manual')),

  -- Podar sem apagar. A lista detectada traz junção demais — toda entrada de
  -- garagem é nó no OSM — e a direção vai desligar a maioria. Apagar de vez
  -- faria a próxima detecção ressuscitar tudo o que já tinha sido descartado.
  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Dois pontos no mesmo metro do mesmo percurso são o mesmo ponto. O índice
-- arredonda para o metro inteiro porque o OSM devolve coordenadas com precisão
-- que não significa nada nesta escala.
create unique index if not exists route_blockpoints_unicos
  on public.route_blockpoints (race_id, round(offset_m::numeric));

create index if not exists route_blockpoints_por_prova
  on public.route_blockpoints (race_id, offset_m)
  where active;

alter table public.route_blockpoints enable row level security;

-- Leitura para quem é da prova; escrita só para quem pode editá-la — a mesma
-- linha que separa o diretor do fiscal em todo o resto do sistema.
create policy route_blockpoints_leitura on public.route_blockpoints
  for select using (public.is_race_member(race_id));

create policy route_blockpoints_escrita on public.route_blockpoints
  for all using (public.can_edit_race(race_id))
  with check (public.can_edit_race(race_id));

create or replace function public.touch_route_blockpoints()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists route_blockpoints_touch on public.route_blockpoints;
create trigger route_blockpoints_touch
  before update on public.route_blockpoints
  for each row execute function public.touch_route_blockpoints();
