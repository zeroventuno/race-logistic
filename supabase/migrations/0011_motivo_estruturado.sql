-- Justificativa do acionamento em partes, e não em prosa.
--
-- O PROBLEMA. O texto do "por que este veículo" é ESCRITO uma vez, no
-- instante do acionamento, e LIDO por até três pessoas: a direção no painel,
-- o motorista acionado na tela de takeover, e quem revisar o incidente meses
-- depois. Numa prova internacional essas três pessoas leem três idiomas
-- diferentes. Qualquer idioma escolhido na hora de gravar está errado para
-- dois deles.
--
-- A SOLUÇÃO. Guardar a frase desmontada — uma lista de chaves de tradução com
-- os números já calculados — e montá-la na leitura, no idioma de quem lê. Os
-- números (2,4 km, 38 km/h) são os mesmos para todo mundo; só a moldura muda.
--
-- POR QUE ADITIVO, e por que as colunas de texto FICAM. A coluna antiga passa
-- a ser o registro congelado para auditoria: uma frase legível por um humano
-- sem precisar do dicionário da aplicação, que é exatamente o que se quer
-- quando uma federação pede o histórico de um acidente dois anos depois. As
-- linhas já gravadas continuam válidas e continuam sendo exibidas — a leitura
-- prefere a versão estruturada e cai para o texto quando ela não existe.

alter table public.alerts
  add column if not exists dispatch_reason_parts jsonb;

comment on column public.alerts.dispatch_reason_parts is
  'Justificativa do acionamento em partes: [{k, v}] com chave de tradução e variáveis. Montada no idioma do leitor. A coluna dispatch_reason guarda a mesma frase congelada em texto, para auditoria.';

alter table public.alert_suggestions
  add column if not exists reason_parts jsonb;

comment on column public.alert_suggestions.reason_parts is
  'Mesma ideia de alerts.dispatch_reason_parts, por sugestão.';
