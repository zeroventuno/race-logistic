-- ===========================================================================
-- Cota de provas por conta
--
-- O cadastro está aberto e não existe pagamento. Hoje qualquer pessoa cria
-- conta e quantas provas quiser, e o dono da ferramenta não fica sabendo. Esta
-- migração dá o controle manual que precede o pagamento: o dono diz "esta
-- conta pode criar N provas", e o banco cobra.
--
-- O NÚMERO MORA NO BANCO, E QUEM COBRA É O BANCO. Esconder o botão "nova
-- prova" na tela não impede ninguém de chamar a ação direto — é o mesmo
-- raciocínio que tirou `bind_code` do alcance do papel `authenticated` na
-- 0005. Cota que a interface mostra e o banco não impõe é decoração.
--
-- CONTAR PROVAS EXISTENTES BASTA, e não é uma escolha preguiçosa: não existe
-- caminho no produto para o diretor apagar uma prova. `races.created_by` é
-- `on delete restrict`, e o painel não tem a ação. Logo "provas que existem" e
-- "provas já criadas" são o mesmo número, e a brecha de apagar-e-recriar não
-- tem por onde acontecer. No dia em que apagar prova virar funcionalidade,
-- isto aqui precisa virar um contador que só sobe.
--
-- PADRÃO 1, e não 0 nem ilimitado. Zero deixaria a conta nova inútil e sem
-- explicação; ilimitado é o estado de hoje, que é justamente o problema. Um é
-- a avaliação honesta: dá para montar uma prova inteira e ver o produto
-- funcionando antes de qualquer conversa comercial.
-- ===========================================================================

alter table public.profiles
  add column if not exists race_quota integer not null default 1;

alter table public.profiles
  drop constraint if exists profiles_race_quota_check;

alter table public.profiles
  add constraint profiles_race_quota_check check (race_quota >= 0);

comment on column public.profiles.race_quota is
  'Quantas provas esta conta pode criar, no total. Cobrado pelo gatilho races_enforce_quota. Definido à mão no painel de administração enquanto não existe pagamento.';

-- Ninguém que já usava o produto pode ser bloqueado retroativamente: quem tem
-- três provas fica com cota três, e sobe pelo painel quando precisar da quarta.
update public.profiles p
   set race_quota = greatest(
     1,
     (select count(*) from public.races r where r.created_by = p.id)
   );

-- ---------------------------------------------------------------------------
-- A cobrança
-- ---------------------------------------------------------------------------

/*
 * `security definer` porque o gatilho precisa ler `profiles` de quem está
 * inserindo, e a política de RLS dessa tabela é escrita para o uso normal do
 * produto, não para um gatilho. `search_path` fixo pelo mesmo motivo da
 * migração 0006: função com privilégio elevado e caminho de busca solto é
 * como um chamador hostil sequestra o nome de uma tabela.
 */
create or replace function public.enforce_race_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cota    integer;
  usadas  integer;
begin
  select race_quota into cota
    from public.profiles
   where id = new.created_by;

  -- Perfil ausente é estado que não deveria existir (há gatilho que o cria no
  -- cadastro). Se acontecer, o padrão da coluna é o que vale — negar a criação
  -- por causa de uma linha faltando puniria a pessoa errada.
  if cota is null then
    cota := 1;
  end if;

  select count(*) into usadas
    from public.races
   where created_by = new.created_by;

  if usadas >= cota then
    raise exception
      'Limite de provas atingido: % de %. Fale com a direção do Flamme Rouge para liberar mais.',
      usadas, cota
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists races_enforce_quota on public.races;

create trigger races_enforce_quota
  before insert on public.races
  for each row execute function public.enforce_race_quota();
