-- ===========================================================================
-- Correção dos comentários de domínio
--
-- A migração 0008 afirmou que a passagem da vassoura libera a via. Está
-- errado, e o erro veio de mim, não do schema. A ordem e o significado reais:
--
--   abertura … pelotão … FECHAMENTO … retardatários … VASSOURA
--                            ↑
--                    a via reabre AQUI
--
--  - O CARRO DE FECHAMENTO encerra a interdição. Quando ele passa, a via
--    volta ao trânsito normal.
--
--  - Os ciclistas que ficaram atrás dele seguem pedalando entre carros, sem a
--    proteção do fechamento de via. É penalização de fato para quem anda
--    devagar, e é a realidade aceita das provas amadoras.
--
--  - A VASSOURA é o último veículo e recolhe quem abandona. Ela NÃO interdita
--    nada — circula com a via já reaberta.
--
-- Daí a natureza da janela abertura ↔ fechamento: ela é antes de tudo um
-- COMPROMISSO ADMINISTRATIVO com a autoridade de trânsito — quanto tempo a
-- organização combinou manter a via fechada. Estourá-la é quebrar acordo com
-- quem autorizou o evento, e é por isso que o painel a exibe em destaque.
-- ===========================================================================

comment on column public.race_positions.is_reference_sweep is
  'Marca o CARRO DE FECHAMENTO — o veículo cuja passagem ENCERRA A INTERDIÇÃO da via. É o extremo de baixo da janela de tempo, que representa o compromisso de fechamento de via acordado com a autoridade de trânsito. NÃO é a vassoura: a vassoura (role broom_wagon) vem depois, com a via já reaberta, apenas para recolher quem abandona.';

comment on column public.races.target_gap_minutes is
  'Janela alvo entre a passagem do carro de abertura e a do carro de fechamento. É o tempo de interdição de via combinado com a autoridade de trânsito — um compromisso administrativo, não uma medida interna da prova.';

comment on column public.races.max_gap_minutes is
  'Acima disto a interdição passou do combinado com a autoridade. O painel sinaliza antes de chegar aqui.';
