-- ===========================================================================
-- A vassoura fecha o comboio, e o fechamento não é o último veículo
--
-- A migração 0008 gravou no banco esta definição:
--
--   "a vassoura (role broom_wagon) acompanha o último atleta e vem ANTES do
--    fechamento"
--
--   "A ordem na estrada é: abertura … pelotão … último atleta … vassoura …
--    fechamento."
--
-- Está errado, e quem corrigiu foi o diretor de prova:
--
--   O CARRO DE FECHAMENTO é o limite do CONTROLE DE VIA, não o fim da prova.
--   Depois que ele passa, a rua reabre — e a prova CONTINUA atrás dele, com
--   motos de apoio, mecânicos e ambulâncias acompanhando os ciclistas lentos.
--   A VASSOURA é a última coisa do comboio, quase sempre com uma ambulância
--   junto, recolhendo quem abandona com a via já devolvida ao trânsito.
--
--   Ordem real: abertura … pelotão … fechamento … apoio … vassoura.
--
-- E isso não é detalhe de vocabulário: quem mais precisa de socorro numa prova
-- de estrada é justamente o ciclista lento, que anda ATRÁS do fechamento. Um
-- modelo que trate o fechamento como último veículo sugere que não há nada a
-- atender depois dele.
--
-- A JANELA CONTINUA SENDO abertura ↔ fechamento, e a 0008 acertou nisso: é a
-- passagem do fechamento que devolve a rua, e é esse o tempo combinado com a
-- autoridade de trânsito. O que muda é só o que existe depois dela.
--
-- NENHUMA LÓGICA DEPENDIA DO COMENTÁRIO ERRADO. Conferido antes de escrever
-- esta migração: o despacho ordena candidatos por distância ao longo do
-- percurso e não exclui quem está atrás do fechamento, e `nearest.ts` já
-- tratava a vassoura como o veículo mais lento, "no ritmo do último atleta".
-- Era dívida de documentação — mas documentação que mora no banco e que a
-- próxima pessoa leria como definição.
--
-- Só comentários mudam aqui. Nenhuma tabela, coluna, índice ou política.
-- ===========================================================================

comment on column public.race_positions.is_reference_sweep is
  'Marca o CARRO DE FECHAMENTO — o veículo cuja passagem devolve a via ao trânsito, e o extremo de baixo da janela de tempo da prova. NÃO é o último veículo do comboio: atrás dele seguem apoio, mecânicos e ambulâncias atendendo os ciclistas lentos, com a rua já reaberta. E NÃO é a vassoura: a vassoura (role broom_wagon) é a última de todas, acompanhando o último atleta.';

comment on column public.race_positions.is_reference_lead is
  'Marca o CARRO DE ABERTURA — o primeiro veículo do comboio e o extremo de cima da janela de tempo da prova. Motos de reconhecimento podem circular à frente dele sem serem a referência.';

comment on type position_role is
  'Papel do veículo no comboio. A ordem na estrada é: abertura … pelotão … fechamento (aqui a via reabre) … apoio aos ciclistas lentos … vassoura. O fechamento delimita o controle de via; a vassoura fecha a prova.';
