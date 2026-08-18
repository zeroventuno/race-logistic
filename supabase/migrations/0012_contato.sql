-- Pedidos de contato vindos da landing.
--
-- POR QUE UMA TABELA, e não só um `mailto`. O endereço visível continua na
-- página e é o caminho preferido de quem já tem cliente de e-mail configurado.
-- Mas metade de quem organiza prova responde do webmail do celular, e para
-- essa pessoa um `mailto:` abre um aplicativo que ela não usa — o clique morre
-- ali e ninguém fica sabendo. A tabela é o que garante que o pedido existe
-- mesmo quando o e-mail não sai.
--
-- NENHUMA POLÍTICA DE RLS, de propósito, como em `bind_attempts`. A tabela
-- guarda nome, e-mail e telefone de gente que ainda não é cliente: é o dado
-- mais sensível que este sistema coleta de quem não fez login. Sem política,
-- o RLS nega tudo por padrão e só o `service_role` — que vive apenas nos
-- Route Handlers, nunca no navegador — enxerga a tabela.
--
-- O QUE NÃO ESTÁ AQUI: envio de e-mail. Gravar e notificar são duas coisas, e
-- a gravação não pode depender da segunda funcionar. A notificação entra
-- depois, lendo daqui.

create table public.contact_requests (
  id           uuid primary key default gen_random_uuid(),

  name         text not null check (char_length(btrim(name)) between 1 and 120),
  email        text not null check (char_length(btrim(email)) between 3 and 200),
  organization text check (char_length(organization) <= 200),
  message      text not null check (char_length(btrim(message)) between 1 and 4000),

  -- O idioma em que a pessoa escreveu. Não é estatística: é como responder na
  -- língua dela sem ter que adivinhar pelo texto.
  locale       text not null default 'pt-BR',

  -- Origem, para medir de onde vêm os pedidos sem depender de rastreador
  -- externo. O IP é guardado em HASH: serve para limitar taxa e reconhecer
  -- repetição, e não precisa ser reversível para isso.
  ip_hash      text,
  user_agent   text,

  -- Estado do atendimento. Quem responde marca aqui; sem isto a caixa vira
  -- uma lista sem memória de quem já foi respondido.
  handled_at   timestamptz,
  handled_note text,

  created_at   timestamptz not null default now()
);

alter table public.contact_requests enable row level security;

-- Sem política: negado para `anon` e `authenticated`. Só `service_role`.

create index contact_requests_created_idx
  on public.contact_requests (created_at desc);

-- Limite de taxa por origem: a consulta é sempre "quantos vieram deste hash na
-- última janela", e sem este índice ela varre a tabela inteira a cada envio.
create index contact_requests_ip_idx
  on public.contact_requests (ip_hash, created_at desc);

-- A fila de quem ainda não foi respondido, que é a única consulta que importa
-- no dia a dia. Parcial: a tabela cresce para sempre, a fila não.
create index contact_requests_pendentes_idx
  on public.contact_requests (created_at desc)
  where handled_at is null;

comment on table public.contact_requests is
  'Pedidos de contato da landing. Sem política de RLS: só service_role lê. Contém dado pessoal de quem ainda não é cliente.';
