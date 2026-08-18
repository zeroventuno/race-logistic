# Flamme Rouge

**Direção de prova ao vivo para ciclismo de estrada.**

---

## Cartão curto

Sistema de direção de prova para ciclismo de estrada. Cada veículo de apoio
vira um ponto no mapa usando o celular do próprio motorista — sem instalar
aplicativo e sem equipamento a comprar. O sistema mede a janela entre o carro
de abertura e o de fechamento como tempo observado, calcula distância **pela
estrada** e não em linha reta, e aciona sozinho o socorro certo quando alguém
dispara um alerta.

Next.js 15, TypeScript e Supabase. Seis idiomas, 325 testes automatizados,
testado em campo numa prova real.

---

## Resumo

Prova de ciclismo de estrada acontece no rádio. A direção pergunta onde está o
carro de fechamento e recebe uma estimativa; é em cima dessa estimativa que se
reabre a via — e que se cumpre, ou não, o tempo de interdição combinado com a
autoridade de trânsito.

O Flamme Rouge substitui a estimativa por medição. Cada veículo de apoio recebe
um código de 6 caracteres impresso na folha do briefing, com QR ao lado. O
motorista aponta a câmera, e o celular dele passa a ser o rastreador daquele
veículo — sem loja de aplicativos, sem conta, sem equipamento para comprar,
carregar, distribuir e recolher no fim do dia.

A partir daí a direção vê tudo num mapa: quem está onde, em que quilômetro da
prova, com que idade de dado, e quanto tempo separa a frente do fim do pelotão.

---

## O que ele resolve

### A janela abertura ↔ fechamento deixa de ser palpite

O sistema guarda a que horas o carro de abertura passou por cada ponto do
percurso. Quando o fechamento chega ao km 42, a janela é a diferença entre dois
horários observados — a mesma conta de um tempo intermediário de cronometragem.
Quando não há histórico suficiente, a tela diz "projetado" e explica o motivo,
em vez de fingir precisão.

### Distância pela estrada, não em linha reta

Numa ida-e-volta, dois veículos podem estar a dezenas de metros um do outro e a
dezenas de quilômetros pela estrada, em pernas opostas. Um sistema que compara
coordenadas manda o veículo errado. Este projeta cada posição sobre o traçado
indexado e compara ao longo dele, considerando inclusive o custo de quem já
passou do ponto e precisa retornar contra o fluxo.

### O alerta não falha em silêncio

Um pedido de socorro fura a fila na frente de qualquer ponto de GPS e é
retentado até o servidor confirmar — mesmo que isso signifique uma fila que não
esvazia. E o socorro é acionado automaticamente por categoria: acidente chama
ambulância, problema mecânico chama o mecânico, com escalonamento explícito e
registrado quando não há veículo da especialidade disponível.

### Funciona sem sinal

Nada é enviado antes de ser gravado no aparelho, e nada sai da fila antes da
confirmação do servidor. Num teste de dois minutos sem cobertura, os pontos
acumulados chegaram completos, em ordem e sem duplicar quando o sinal voltou.

### Seis idiomas, um único link

O idioma não vai na URL — o aparelho negocia. O mesmo QR entrega português ao
motorista brasileiro e alemão ao austríaco, sem a direção gerenciar nada.

---

## Decisões técnicas

**O dicionário é tipado, então texto faltando não compila.** As seis línguas
derivam do mesmo tipo; uma chave ausente em alemão quebra o build em vez de
aparecer como texto cru na tela de um motorista austríaco no dia da prova.

**A justificativa de um acionamento é gravada desmontada.** Ela é escrita uma
vez, no instante da decisão, e lida por até três pessoas em idiomas diferentes
— direção, motorista acionado, e quem revisar o incidente depois. Guardar a
frase pronta erraria para dois deles, então o banco guarda chave e números, e a
frase é montada na leitura.

**Segurança por ausência de política.** Tabelas com dado sensível — tentativas
de vínculo, pedidos de contato — não têm política de RLS nenhuma: o Postgres
nega por padrão e só o papel de serviço, que vive apenas em rotas de servidor,
enxerga.

**A degradação é desenhada, não acidental.** Chave de mapa indisponível cai para
o fundo padrão sozinha; banco fora do ar não vira porta trancada num formulário;
falha de e-mail não reprova um pedido já gravado.

---

## Stack

**Next.js 15** (App Router, Server Components) · **TypeScript** · **Supabase**
(Postgres, Realtime, Auth, RLS) · **Vercel** · **MapLibre GL** com CARTO e
MapTiler · **Tailwind v4** · **Vitest**

| | |
|---|---|
| Código | ~35.300 linhas em 143 arquivos |
| Testes | 325 automatizados, 26 arquivos |
| Banco | 16 tabelas, 22 políticas de RLS, 17 funções e gatilhos, 12 migrações |
| Idiomas | 6, com verificação em tempo de compilação |
| Papéis de veículo | 9 |

---

## Status

Em produção técnica, ainda sem cliente pagante. Testado em campo numa prova real
com dois celulares e três funções simultâneas — abertura, fechamento e
ambulância —, incluindo alerta de acidente com confirmação e acionamento
automático.
