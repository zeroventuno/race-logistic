-- O relatório final, congelado.
--
-- POR QUE CONGELAR. Um documento de prova que pode ser regerado diferente
-- amanhã não prova nada. A prefeitura recebe um arquivo; seis meses depois,
-- numa discussão de seguro, alguém precisa poder afirmar que o arquivo na mesa
-- é o mesmo que saiu daqui. Sem uma cópia guardada, o sistema não consegue
-- sustentar essa frase.
--
-- E é o congelamento que LIBERA O EXPURGO dos pings. O relatório é reconstruído
-- de `location_pings`; enquanto não houver cópia congelada, apagar ping é
-- apagar a única prova de que a prova aconteceu. A ordem é: encerra, gera,
-- congela, e só então os pings ficam elegíveis.
--
-- OS BYTES FICAM NO POSTGRES, e não num bucket. Não é por simplicidade: é
-- porque a regra "este documento nunca vira link público" passa a ser
-- estrutural em vez de configuração. Bucket tem política, política tem opção de
-- leitura anônima, e essa opção é um clique. Aqui não existe caminho que sirva
-- o arquivo sem passar pela rota autenticada.
--
-- O tamanho não pesa: um relatório completo dá ~20 kB. Cem provas em seis
-- idiomas caberiam em 12 MB — menos que o rastro de UMA prova, que é justamente
-- o que isto autoriza a apagar.

create table if not exists public.race_reports (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races(id) on delete cascade,

  -- Um idioma é um documento diferente, com bytes e hash próprios. O mesmo
  -- relatório vai em italiano para a prefeitura e em inglês para a federação, e
  -- os dois precisam ser verificáveis separadamente.
  locale text not null check (locale in ('pt-BR', 'it', 'en', 'fr', 'es', 'de')),

  -- Acrescentar ponto de bloqueio depois de congelar é motivo legítimo para um
  -- documento novo. Ele não substitui o anterior: um documento de prova ganha
  -- versão, não é reescrito por cima.
  version integer not null check (version > 0),

  -- SHA-256 dos bytes, em hexadecimal. É o que quem recebeu confere no arquivo
  -- que tem em mãos.
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),

  pdf bytea not null,
  size_bytes integer not null check (size_bytes > 0),

  generated_at timestamptz not null default now(),
  generated_by uuid references auth.users(id) on delete set null,

  unique (race_id, locale, version)
);

create index if not exists race_reports_ultimo
  on public.race_reports (race_id, locale, version desc);

alter table public.race_reports enable row level security;

-- Só quem pode editar a prova — o mesmo portão que encerra e que gera. Nem
-- `is_race_member`: o documento traz nome de motorista, placa e o rastro de
-- cada incidente.
--
-- Nenhuma política de UPDATE ou DELETE, de propósito. Versão congelada não se
-- corrige: se estiver errada, gera-se a seguinte. A escrita é feita pelo
-- servidor com `service_role`, que atravessa RLS.
create policy race_reports_leitura on public.race_reports
  for select using (public.can_edit_race(race_id));

-- Nunca se atualiza uma versão congelada. O gatilho existe porque a ausência de
-- política de UPDATE protege o cliente, e não o `service_role` — que é
-- exatamente quem escreve aqui, e portanto quem poderia errar.
create or replace function public.relatorio_nao_se_reescreve()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Relatório congelado não é alterado: gere uma versão nova.';
end;
$$;

drop trigger if exists race_reports_imutavel on public.race_reports;
create trigger race_reports_imutavel
  before update on public.race_reports
  for each row execute function public.relatorio_nao_se_reescreve();
