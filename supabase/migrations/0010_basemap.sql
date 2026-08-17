-- ===========================================================================
-- ESCOLHA DO MAPA DE FUNDO
--
-- O cliente que paga escolhe sobre que mapa a prova é desenhada. Não é
-- preferência estética: uma prova de montanha precisa de curva de nível e de
-- estrada vicinal, coisas que um mapa de asfalto urbano não desenha, e um
-- critério de cidade precisa do contrário — traçado limpo, sem ruído de
-- relevo.
--
-- DUAS COLUNAS, E A DUPLICAÇÃO É DE PROPÓSITO.
--
--   profiles.map_basemap  o padrão da conta: o que o cliente escolheu uma vez
--   races.map_basemap     o que vale NAQUELA prova
--
-- A da prova é copiada da conta no momento em que a prova é criada, e a partir
-- daí ela é independente. Parece redundante e não é: sem isso, mexer no padrão
-- da conta trocaria o mapa de uma prova que já foi montada, briefada e
-- impressa. Configuração de prova congela quando a prova nasce — pelo mesmo
-- motivo que o fuso horário e a janela alvo ficam na prova e não na conta.
--
-- E tem um efeito prático: quem lê a prova (inclusive o app do motorista, que
-- não tem sessão e não enxerga `profiles`) resolve o mapa lendo uma coluna só,
-- sem junção e sem furo de RLS.
--
-- O VALOR É UM IDENTIFICADOR, NUNCA UMA URL. O catálogo vive no código
-- (`src/lib/map/basemaps.ts`), com atribuição, licença e as cores de rota já
-- calibradas para cada fundo. Guardar a URL do tile no banco deixaria qualquer
-- um apontar o mapa da prova para qualquer servidor — e um mapa é o lugar
-- menos indicado do sistema para aceitar entrada arbitrária.
-- ===========================================================================

alter table public.profiles
  add column if not exists map_basemap text not null default 'asfalto';

alter table public.races
  add column if not exists map_basemap text not null default 'asfalto';

-- Só o formato: quem valida o identificador contra o catálogo é a aplicação,
-- que é quem conhece o catálogo. O banco garante que não entra lixo nem
-- string vazia, e que o valor cabe num slug.
alter table public.profiles
  drop constraint if exists profiles_map_basemap_slug;
alter table public.profiles
  add constraint profiles_map_basemap_slug
  check (map_basemap ~ '^[a-z][a-z0-9-]{0,31}$');

alter table public.races
  drop constraint if exists races_map_basemap_slug;
alter table public.races
  add constraint races_map_basemap_slug
  check (map_basemap ~ '^[a-z][a-z0-9-]{0,31}$');

comment on column public.profiles.map_basemap is
  'Mapa de fundo padrão da conta. Vale para provas NOVAS; provas já criadas mantêm o que tinham. Identificador do catálogo em src/lib/map/basemaps.ts, nunca uma URL.';

comment on column public.races.map_basemap is
  'Mapa de fundo desta prova. Copiado do padrão da conta na criação e independente a partir daí — trocar o padrão não pode mudar o mapa de uma prova já briefada.';
