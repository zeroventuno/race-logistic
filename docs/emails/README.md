# E-mails de autenticação

Os templates que o Supabase envia. Eles **não** são carregados pelo código —
vivem colados no painel, em *Authentication → Emails*. Ficam versionados aqui
porque um template que só existe num painel é um template que ninguém revisa,
ninguém compara com a versão anterior, e que se perde quando o projeto é
recriado.

## O que existe

| arquivo | template do painel | usado? |
|---|---|---|
| `confirm-signup.html` | Confirm signup | **sim**, é o único fluxo de e-mail de auth do produto |

Assunto: `Confirm your Flamme Rouge account`

## O que NÃO existe, e por quê

O Supabase oferece seis templates. Cinco estão sem uso porque o produto não
tem os fluxos correspondentes — conferido no código, não suposto:

- **Reset password** — não há `resetPasswordForEmail` em lugar nenhum.
  **Este é um buraco real**, não uma decisão: um diretor que esquece a senha
  na manhã da prova não tem como entrar. Quando o fluxo for construído, o
  template vem junto.
- **Magic link** — o produto entra com e-mail e senha.
- **Invite user** — o cadastro é aberto hoje, e vai fechar por código de
  acesso, não por convite do Supabase.
- **Change email address** — não há tela para trocar e-mail.
- **Reauthentication** — não há operação que exija reautenticar.

Escrever esses cinco agora seria redigir texto para função inexistente.

## Idioma

Um só, em inglês. É limitação do Supabase: o template é único e não conhece o
idioma de quem se cadastrou — diferente do produto, que negocia seis pelo
aparelho. Inglês porque é o idioma franco de quem organiza evento
internacional, e porque o e-mail tem uma frase e um botão.

Se algum dia isso incomodar, a saída é parar de usar o e-mail do Supabase e
mandar a confirmação pelo Resend, que já é dependência do formulário de
contato — aí o idioma vem do cadastro.

## O link

O template usa `{{ .ConfirmationURL }}`, e **não** uma URL escrita à mão.

A ação de cadastro define `emailRedirectTo` a partir do host da requisição
(`src/app/login/actions.ts`), então esse mesmo template funciona em
`localhost`, na pré-visualização da Vercel e em produção sem ninguém editar
nada. Escrever o endereço aqui quebraria os três.

Do outro lado, quem recebe é `src/app/auth/callback/route.ts`, que aceita
tanto `?code=` quanto `?token_hash=&type=` — os dois formatos que o Supabase
usa conforme a versão do template.

## Antes de valer

O remetente ainda é o genérico do Supabase, e o serviço de e-mail embutido
deles tem **limite de poucos envios por hora** — é para desenvolvimento, não
para produção. Configurar SMTP próprio (Resend) em *Authentication → Emails →
SMTP Settings* resolve o remetente e o limite de uma vez.
