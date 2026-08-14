-- ===========================================================================
-- Novos estados de alerta, num arquivo isolado de propósito.
--
-- `alter type ... add value` no Postgres não pode ter o valor novo USADO na
-- mesma transação em que é criado. Como o aplicador de migrações envolve cada
-- arquivo numa transação, separar o ALTER TYPE do resto é o que permite a
-- migração seguinte já escrever políticas e índices usando estes valores.
-- ===========================================================================

alter type alert_status add value if not exists 'en_route' after 'dispatched';
alter type alert_status add value if not exists 'on_scene' after 'en_route';
