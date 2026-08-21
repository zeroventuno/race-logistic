# E-mails de autenticação

Os templates que o Supabase envia. Eles **não** são carregados pelo código —
vivem colados no painel, em *Authentication → Emails*. Ficam versionados aqui
porque um template que só existe num painel é um template que ninguém revisa,
ninguém compara com a versão anterior, e que se perde quando o projeto é
recriado.

## O que existe

| arquivo | template do painel | assunto |
|---|---|---|
| `confirm-signup.html` | Confirm signup | `Confirm your Flamme Rouge account` |
| `reset-password.html` | Reset password | `Reset your Flamme Rouge password` |

## O que NÃO existe, e por quê

O Supabase oferece seis templates. Quatro estão sem uso porque o produto não
tem os fluxos correspondentes — conferido no código, não suposto:

- **Magic link** — o produto entra com e-mail e senha.
- **Invite user** — o cadastro é aberto hoje, e vai fechar por código de
  acesso, não por convite do Supabase.
- **Change email address** — não há tela para trocar e-mail.
- **Reauthentication** — não há operação que exija reautenticar.

Escrever esses quatro agora seria redigir texto para função inexistente.

## Idioma

Um só, em inglês. É limitação do Supabase: o template é único e não conhece o
idioma de quem se cadastrou — diferente do produto, que negocia seis pelo
aparelho. Inglês porque é o idioma franco de quem organiza evento
internacional, e porque o e-mail tem uma frase e um botão.

Se algum dia isso incomodar, a saída é parar de usar o e-mail do Supabase e
mandar a confirmação pelo Resend, que já é dependência do formulário de
contato — aí o idioma vem do cadastro.

## O logo

A flâmula vem de `/brand/email-mark.png`, gerada pelo `npm run brand` a
partir da mesma geometria do logotipo do site. O **letreiro é texto HTML**, não
imagem, e isso é conclusão de teste:

- rasterizar `signature.svg` com o `sharp` devolve ROUGE **com serifa** — o
  librsvg não tem Barlow Condensed;
- embutir a fonte no SVG como `@font-face` com data URI **também não funciona**,
  o librsvg ignora.

E mesmo que funcionasse, logo que é só imagem vira retângulo vazio para quem
tem bloqueio de imagem — que é o padrão de boa parte dos clientes. Com o nome
em texto a marca chega sempre; a flâmula é o acréscimo.

O `src` aponta para o domínio de produção em absoluto, porque e-mail não tem
URL relativa. Numa prévia da Vercel a imagem virá de produção, o que é o
comportamento certo.

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
