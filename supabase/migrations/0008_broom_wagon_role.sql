-- ===========================================================================
-- Vassoura é um veículo, carro de fechamento é outro
--
-- O schema original tratava os dois como o mesmo papel (`sweep_car`, rotulado
-- "Carro de fechamento (vassoura)"). São funções distintas na organização de
-- uma prova de estrada, e confundi-las apaga uma das duas do cadastro:
--
--   CARRO DE ABERTURA   abre a prova. Nada de prova passa antes dele.
--   VASSOURA            vem atrás do ÚLTIMO ATLETA e recolhe quem abandona.
--   CARRO DE FECHAMENTO é o último veículo do comboio. Depois dele a via
--                       pode reabrir.
--
-- A ordem na estrada é: abertura … pelotão … último atleta … vassoura …
-- fechamento. Logo a JANELA DE TEMPO da prova é abertura ↔ FECHAMENTO, não
-- abertura ↔ vassoura: é a passagem do fechamento que libera a rua.
--
-- `is_reference_sweep` mantém o nome por ser interno e estar em 29 arquivos.
-- Ele sempre significou "o veículo que fecha a prova" — o rótulo é que estava
-- errado. O comentário abaixo passa a ser a definição.
-- ===========================================================================

alter type position_role add value if not exists 'broom_wagon' after 'sweep_car';

comment on column public.race_positions.is_reference_sweep is
  'Marca o CARRO DE FECHAMENTO — o último veículo do comboio, cuja passagem libera a via. É o extremo de baixo da janela de tempo da prova. NÃO é a vassoura: a vassoura (role broom_wagon) acompanha o último atleta e vem ANTES do fechamento.';

comment on column public.race_positions.is_reference_lead is
  'Marca o CARRO DE ABERTURA — o primeiro veículo do comboio. É o extremo de cima da janela de tempo da prova.';
