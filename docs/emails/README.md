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

E, fora do Supabase, `assinatura-pessoal.html` — a assinatura para colar no
cliente de e-mail, derivada da assinatura Ventuno. Ver o fim deste arquivo.

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

## A assinatura pessoal

`assinatura-pessoal.html`, para colar em *Configurações → Assinatura* do
cliente de e-mail. **Cole como HTML, não como texto**, senão vira código na
tela de quem recebe.

Ela repete a estrutura da assinatura Ventuno de propósito — marca à esquerda,
régua vertical, dados à direita. As duas são do mesmo remetente, e a
familiaridade entre elas é o que faz as duas parecerem sérias. O que muda é só
o que é identidade: a bandeirola no lugar do letreiro Ventuno, o rouge no lugar
do roxo, e o descritivo do produto.

**O vermelho pode aparecer aqui.** Dentro do produto ele significa uma coisa só
— alguém precisa de socorro —, mas assinatura é material de marca, não
superfície de operação. Ocupa o mesmo lugar que o roxo ocupa na Ventuno.

### O descritivo, nos seis idiomas

A linha sob o nome sai de `BRAND.tagline` em `src/brand/mark.ts`. Troque
conforme para quem você responde:

| | |
|---|---|
| pt-BR | `Flamme Rouge · direção de prova ao vivo` |
| **it** | `Flamme Rouge · direzione gara in tempo reale` ← no arquivo |
| en | `Flamme Rouge · live race control` |
| fr | `Flamme Rouge · direction de course en direct` |
| es | `Flamme Rouge · dirección de carrera en directo` |
| de | `Flamme Rouge · rennleitung in echtzeit` |

Deixei o italiano porque é onde estão os primeiros organizadores e é o registro
da sua assinatura Ventuno. Se a maioria das respostas for para fora, troque
pelo inglês.

### A marca é imagem, o nome é texto

Cliente de e-mail bloqueia imagem por padrão. Com o nome em texto a assinatura
chega inteira mesmo assim, e a bandeirola é o acréscimo que aparece quando as
imagens carregam — mesmo raciocínio do e-mail de confirmação.

A imagem é `/brand/email-mark.png`, servida do domínio de produção. Ela é a
**bandeirola com mastro**, que o manual reserva para material de marca, e a 46
px de altura fica bem acima do mínimo de 24 px que a versão com mastro pede.
