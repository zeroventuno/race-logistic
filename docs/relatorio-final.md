# O relatório final da prova

Pensado em 25/08/2026, para construir depois. Nada disso está implementado.

---

## Antes de qualquer coisa: quem lê

Todo o resto sai daqui. Não é um documento, são três leitores com pressas
diferentes lendo o mesmo arquivo.

**A autoridade de trânsito.** Autorizou uma rua fechada por um tempo. Quer uma
resposta e uma só: *o combinado foi respeitado?* Lê uma página. Se a resposta
estiver na página dois, ela não foi lida.

**A federação, ou o organizador no ano seguinte.** Quer saber se a prova correu
dentro do padrão, quantos incidentes houve, quanto tempo o socorro levou.
Lê o sumário e mergulha em uma ou duas seções.

**O seguro, ou um advogado.** Só aparece quando algo deu errado, e aí quer o
rastro completo de um incidente específico: quem chamou, às que horas, onde,
quem foi mandado, quando chegou. Lê uma seção e ignora o resto.

Os três leem o mesmo PDF. A ordem das seções é a ordem da pressa deles.

---

## A tese

**Este relatório não é um resumo da prova. É a prova de que a prova foi
medida.**

É a diferença entre "a rua reabriu por volta das 14h30" e "a rua reabriu às
14h32, e aqui está a série temporal que sustenta isso". A primeira frase
qualquer organizador diz hoje. A segunda ninguém consegue dizer — e é
exatamente o que o Flamme Rouge existe para produzir.

Por isso o relatório é o momento de maior valor do produto. Não é um extra
depois da prova: é a entrega. Durante a prova o sistema ajuda a direção; depois
dela, é o único que tem o que a federação vai pedir.

E é por isso que ele tem que ser gerado **quando a direção encerra a prova** —
no instante em que ainda existe adrenalina e alguém para ler.

---

## A regra da honestidade

Esta é a decisão de projeto mais importante do documento inteiro, e é
contraintuitiva.

**O relatório declara o que não sabe.**

Se a Moto 3 ficou oito minutos sem sinal, a janela naqueles oito minutos é
interpolada, não medida — e o relatório diz isso, com essas palavras, naquele
trecho do gráfico. Se o carro de fechamento nunca foi vinculado, o relatório
abre dizendo que a janela não pôde ser medida naquela prova.

A tentação é o contrário: preencher os buracos, suavizar a curva, entregar um
documento limpo. Seria um erro caro. Um documento de prova vale pela
credibilidade, e credibilidade não é gradual — no dia em que uma federação
pegar um número inflado, todo o resto do documento morre junto, e o produto
também. Um relatório que admite oito minutos cegos é mais forte que um que
finge tê-los visto, porque o primeiro pode ser conferido e o segundo não.

**O banco já fala essa língua.** `gap_snapshots.method` hoje grava:

| valor | o que significa no relatório |
|---|---|
| `measured` | os dois carros transmitindo, número medido |
| `measured_stale` | medido, mas com leitura velha — vale com ressalva |
| `projected` | estimado a partir da velocidade, não observado |
| `insufficient_data` | o sistema não sabia onde estava alguém |
| `insufficient_data_stale` | idem, e as leituras já estavam velhas |

O comentário do endpoint já diz por quê: *"`insufficient_data` também é
gravado."* Essa decisão, tomada lá atrás, é o que torna o relatório possível.
O trabalho do relatório é **não jogar fora** essa distinção — pintá-la no
gráfico, não achatá-la numa linha contínua bonita.

O mesmo vocabulário já existe no painel (`stale`, `lost`, `never`, `clockOff`,
`lapUnknown`). O relatório herda, não inventa.

---

## O documento, seção a seção

### Capa

Marca com mastro, nome da prova, data, local. E **um número**: a janela
autorizada e a janela real. A capa responde a pergunta da autoridade de
trânsito antes de virar a página.

### 1 · Sumário — uma página, e só uma

Janela autorizada · janela mínima · máxima · média. Quantos minutos fora do
autorizado, se houve. Quantos incidentes, e o tempo mediano até o primeiro
socorro chegar. Cobertura de sinal do comboio em porcentagem.

Se o chefe da polícia ler só isto, ele leu o suficiente.

### 2 · A janela — a página que justifica o produto

O gráfico central: tempo no eixo horizontal, minutos de janela no vertical,
com a **faixa autorizada sombreada** (`target_gap_minutes`, e `min`/`max`
quando existirem). A linha da janela real por cima.

Onde estourou, vermelho. Onde o dado é `projected` ou `insufficient_data`, a
linha vira tracejada ou some, com a legenda explicando. Um gráfico que tem
buracos visíveis e assumidos.

É a imagem que vende o produto sozinha, e ela só é convincente porque tem
buracos.

### 3 · Os pontos de bloqueio

**A tabela que ninguém consegue produzir hoje**, e provavelmente a seção que a
polícia mais quer.

A unidade aqui não é trecho de rua — é **ponto de bloqueio**. Rua não fecha em
faixa contínua: fecha em rotatória, em cruzamento, em entroncamento, e em cada
um desses pontos existe **uma pessoa parada segurando o trânsito**. É essa
pessoa que o relatório presta contas.

| km | ponto | fechou | reabriu | duração |
|---|---|---|---|---|
| 3,2 | Rotatória Via Roma × SP 422 | 09:14 | 09:51 | 37 min |
| 8,6 | Cruzamento SP 422 × Via Cuneo | 09:22 | 10:03 | 41 min |
| 14,1 | km 14,1 | 09:31 | 10:12 | 41 min |

"Fechou" é a passagem do carro de abertura por aquele quilômetro. "Reabriu" é a
passagem do **carro de fechamento**. Os dois veículos de referência existem
para exatamente isso: um fecha a rua e liga o cronômetro naquele ponto, o outro
reabre e para o cronômetro.

**A duração de um bloqueio é a janela medida naquele quilômetro** — o mesmo
número da seção 2, amostrado por ponto em vez de por tempo. As duas seções
dizem a mesma coisa de dois jeitos, e é bom que digam: uma serve para ver o
comportamento ao longo do dia, a outra para prestar contas a quem ficou parado
num cruzamento.

**O que vem atrás do fechamento não entra nessa conta.** Ali ainda há prova —
motos de apoio, mecânicos, ambulâncias e por último a vassoura, que acompanha o
último ciclista e recolhe quem abandona. Mas a rua já está aberta ao trânsito.
Numa prova amadora é normal ter muita gente pedalando com a rua liberada, e é
justamente por isso que esses ciclistas são os que mais precisam de apoio.

> Esta seção já esteve errada aqui, com a vassoura no lugar do fechamento.
> Registrado porque o erro é atraente: "a prova continua atrás do fechamento" é
> verdade, e leva a concluir que a rua continua fechada — que não é.

**Por que isso é melhor que segmentar por quilometragem arbitrária:** a linha
vira conferível e pessoal. "O seu agente na rotatória da Via Roma ficou lá das
09h14 às 09h51, 37 minutos" é uma frase que a autoridade de trânsito pode
checar com o próprio agente. "Km 0 a 8 fechado por 37 minutos" não diz nada a
ninguém.

E é o mesmo documento que o organizador já produziu: a lista de pontos a
bloquear, com quantos fiscais em cada um, é exatamente o que ele entregou à
prefeitura para conseguir a autorização. O relatório devolve aquele documento
preenchido com horários reais.

**Nada disso exige instrumentação nova.** Já sabemos o offset de cada veículo
ao longo do tempo; dado um quilômetro, sabemos quando a abertura passou por
ele e quando a vassoura passou. O que falta é só a lista de quilômetros que
importam.

#### De onde vem a lista de pontos

Em ordem de preferência, com queda limpa entre elas:

1. **Detectados no import do GPX.** Uma consulta única ao Overpass
   (OpenStreetMap, sem chave, sem custo) sobre a *bbox* do percurso devolve os
   nós de junção — onde duas ou mais vias se encontram — com os nomes das
   ruas. Cruzando com a geometria da rota, sai a lista com quilômetro e nome.
   Roda **uma vez, no cadastro**, não a cada relatório. E cai no caminho dos
   99%, que é a importação de GPX.
2. **Editados pela direção.** A lista automática vai trazer junção demais —
   toda entrada de garagem vira nó no OSM. A direção poda o que não é
   bloqueio, renomeia o que ficou com nome ruim, e **acrescenta** o que faltou.
   Esta é a lista que vale, porque é a que bate com o documento da prefeitura.
3. **Sem nome, só quilômetro.** Se o Overpass falhar, se a cobertura do OSM
   naquela estrada for pobre, ou se ninguém quiser editar nada, o ponto entra
   como `km 14,1`. Menos útil para a prefeitura, mas **honesto e entregável
   hoje** — e continua conferível, porque quilômetro numa prova é uma
   referência que todo mundo do meio entende.

O relatório nunca deixa de sair por falta de nome de rua. O nome é acabamento;
o horário é a prova.

### 4 · Os incidentes

Um bloco por alerta, em ordem cronológica. Cada um com a linha do tempo
completa: chamado às, reconhecido às, despachado para quem, aceito, no local,
resolvido. Quilômetro e coordenada. Categoria e prioridade.

E o tempo de resposta de cada um, com a mediana no sumário.

Incidentes que demoraram, ou que ficaram sem resposta, **aparecem com o mesmo
destaque dos outros**. Um relatório que esconde o número ruim não serve como
prova — e o único momento em que este documento realmente importa é justamente
quando algo deu errado.

`alert_events` já guarda o rastro inteiro, com autor: `created`,
`acknowledged_by_director`, `auto_dispatched`, `dispatch_accepted`,
`on_scene`, `resolved_by_director`, e também os fracassos —
`dispatch_unavailable`, `dispatch_retry_failed`. Isso é uma auditoria pronta.

### 5 · O comboio

Os veículos, papéis, motoristas e placas. **Sem telefone** — ver abaixo.
Quando cada um vinculou o aparelho. E a **cobertura de sinal de cada um**: quanto tempo transmitindo,
quantos e quais intervalos sem sinal, com início, fim e quilômetro.

É a seção que explica os buracos das seções anteriores. Sem ela, o buraco no
gráfico parece defeito; com ela, é um fato registrado sobre a prova.

### 6 · O traçado

O mapa do percurso com os rastros. Vale como anexo, não como argumento.

### Rodapé de toda página

Nome da prova, data, número da página, e o **instante de geração**. Se o
documento for regenerado depois, é preciso saber qual versão está na mesa de
quem.

---

## O que o banco já tem — e é quase tudo

Conferido em 25/08/2026 contra o esquema real:

| dado | onde | situação |
|---|---|---|
| janela autorizada | `races.target_gap_minutes`, `min_`, `max_` | pronto |
| série da janela | `gap_snapshots` (com `method`) | **ver o problema abaixo** |
| linha do tempo dos alertas | `alerts` + `alert_events` | pronto, e completo |
| comboio | `race_positions` | pronto |
| vínculo de aparelho | `position_sessions` (`bound_at`, `last_seen_at`) | pronto |
| rastro | `location_pings` | pronto, mas ver retenção |
| percurso | `route_tracks` (`points`, `render_points`, `bbox`) | pronto |

Praticamente não falta instrumentação. Faltam duas coisas, e uma delas é séria.

---

## DECIDIDO: a série é recalculada dos pings, não lida do histórico

**O problema.** `gap_snapshots` é escrito pelo **navegador do diretor**.
`useLiveState` chama o endpoint periodicamente. O endpoint faz a coisa certa —
recalcula no servidor em vez de confiar no número que o browser mandou, e o
comentário lá explica por quê: *"se alguém questionar depois por que a rua foi
liberada às 14h32, a resposta não pode ter passado pelo browser de ninguém."*

Só que o **disparo** ainda passava. Notebook fechado, aba dormindo no tablet,
bateria acabando às 14h: o histórico parava. E o buraco não ficava marcado como
`insufficient_data` — ficava **sem linha nenhuma**, indistinguível de um período
que não existiu.

**A decisão (25/08/2026): caminho B.** O relatório reconstrói a série inteira a
partir de `location_pings`, no momento da geração, com a mesma matemática de
offset que o painel usa ao vivo.

### Por que B, e não uma tarefa agendada

**Não depende de aba nenhuma jamais ter existido.** Era o problema; some por
construção, sem infraestrutura nova — nada de cron, nada de função agendada na
Vercel para manter de pé.

**É mais forte como prova.** "Recalculamos a partir do registro bruto de GPS"
vale mais que "confiamos no número que um navegador calculou na hora". O
relatório passa a ser derivado da evidência, não um resumo dela — e derivação
se refaz e se confere.

**A honestidade fica melhor, não pior.** Com o registro bruto na mão dá para
ver exatamente quando cada veículo ficou calado, e classificar cada instante da
série pelo que de fato havia. O caminho A só saberia o que conseguiu calcular
na hora; B enxerga a prova inteira depois, inclusive os silêncios.

**E vale para trás.** As provas que já rodaram têm pings gravados. Dá para
gerar relatório delas — inclusive para testar o gerador contra dados reais, em
vez de esperar a próxima prova.

**`gap_snapshots` continua existindo**, mas rebaixado ao que sempre deveria ter
sido: conveniência do painel ao vivo. Não é mais o registro oficial de nada.

### O custo, e por que ele é menor do que parece

A cadência medida é de **um ping a cada ~20 s**. Uma prova de 6 h dá cerca de
1 080 pings por veículo — com doze veículos, ~13 000 pontos. Fazer *snap* de
tudo isso contra uma rota de milhares de pontos seria pesado.

Só que **não é preciso**. A janela é a distância entre dois veículos: a
abertura e o fechamento. Somando a vassoura, que é quem devolve a rua e por
isso define a coluna "reabriu" da seção 3, são **três veículos — ~3 200
pontos**, não treze mil.

E há uma propriedade a explorar: um veículo **anda para a frente**. Cada snap
pode começar a busca perto do offset anterior em vez de varrer a rota inteira,
o que derruba o custo de linear para praticamente constante por ponto. Só
precisa tratar com cuidado a virada de volta, em prova de várias voltas.

Os demais nove veículos entram só na seção 5, de cobertura de sinal — e ali
basta o **carimbo de tempo** dos pings, sem snap nenhum. É contagem, é barata.

Ainda assim, a geração não deve ser síncrona no clique: gera em segundo plano e
entrega quando ficar pronta.

### O que isso torna carga estrutural: a retenção dos pings

Já estava na lista apagar `location_pings` antigos. Com B, **isso passa a ser
perigoso**: apagar os pings destrói a capacidade de gerar o relatório daquela
prova.

A regra, então, tem ordem obrigatória:

1. A prova é encerrada.
2. O relatório é gerado e **congelado** — PDF guardado, com hash.
3. **Só então** os pings daquela prova ficam elegíveis para expurgo.

E enquanto o congelamento não existir, **não expurgar nada**. Uma limpeza feita
antes disso é irreversível e leva junto a única prova que a prova aconteceu.

Congelar tem outro motivo, independente deste: um documento de prova que pode
ser regenerado diferente amanhã não prova nada.

## O que falta de dado: a lista de pontos de bloqueio

É a única coisa que a seção 3 pede e o sistema ainda não tem. Detalhada lá em
cima; aqui fica só o que é trabalho de construção.

**Uma tabela nova**, digamos `route_blockpoints`: prova, quilômetro (offset em
metros ao longo da rota), nome quando houver, origem (`detected` | `manual`),
e um sinalizador de ativo — a direção poda sem apagar, para não perder a lista
detectada.

**Um passo no import do GPX** que consulta o Overpass uma vez e semeia a
tabela. Assíncrono e tolerante a falha: se o Overpass estiver fora do ar, a
importação do percurso **não pode falhar por causa disso** — o percurso é o
essencial, os pontos são acabamento. Semeia depois, ou nunca, e o relatório sai
com quilômetro puro.

**Uma tela de edição** junto do percurso, onde a direção poda, renomeia e
acrescenta. Provavelmente a menor tela do sistema, e a que gera a linha mais
valiosa do relatório.

Nada disso toca na geometria da rota nem na matemática de offset. É tabela
lateral, lida só na hora de gerar o PDF — o caminho quente do produto não fica
sabendo que ela existe.

## Como gerar

**Não usar navegador headless.** Chromium na Vercel é dor de cabeça de tamanho
de bundle e tempo frio, para um documento que precisa ser confiável.

**`@react-pdf/renderer`** roda em Node, sem browser, e são componentes React —
o que significa que o relatório usa o mesmo dicionário i18n dos seis idiomas e
sai no idioma da prova, não no do servidor.

**O mapa e o gráfico como SVG desenhado por nós**, a partir de
`route_tracks.render_points` e da série da janela. Sem chamada externa, sem
expor chave, determinístico — o mesmo relatório gerado duas vezes sai idêntico,
o que importa quando ele é prova.

**Onde:** um route handler na área da direção, com a mesma checagem de
permissão do resto (`can_edit_race`), respondendo o PDF. Fora de `(director)`
não existe.

**Quando o botão aparece:** só com a prova `finished`. Um relatório parcial de
prova em andamento usado como documento é pior que não ter relatório. Depois
de encerrada, fica disponível para sempre na lista de provas.

---

## Sobre ficar bonito

O pedido foi "layout bonito e dados de qualidade", e as duas coisas são a
mesma: a beleza aqui é hierarquia, não enfeite. Um número enorme na capa, um
gráfico que respira, tabelas com fonte de números tabular — já é convenção da
casa, o painel usa `tnum` — e muito branco.

**A regra do vermelho sobrevive, com uma tradução.** Dentro do produto,
`#D92D20` significa uma coisa só: alguém precisa de socorro. O relatório não é
superfície de operação, mas também não é material de marca — é documento. Então
o vermelho continua com significado, só que traduzido para o registro escrito:
**vermelho = incidente ou estouro da janela.** Nunca decoração, nunca título,
nunca a marca no rodapé. Quem operou o sistema no domingo abre o PDF na
segunda e o vermelho quer dizer a mesma coisa. A marca aparece na capa e mais
nada.

---

## O que decidir antes de escrever a primeira linha

~~1. A · gravar no servidor, ou B · recalcular dos pings?~~
**DECIDIDO em 25/08/2026: caminho B.** Ver a seção acima.

~~2. Trecho por nome ou por quilômetro?~~
**DECIDIDO: por ponto de bloqueio** — rotatória, cruzamento, entroncamento —
com nome quando o Overpass der, e só o quilômetro quando não der. Ver a seção 3.

Restam:

1. **Congelar o PDF ou gerar sob demanda?** Recomendo congelar, e o caminho B
   torna isso quase obrigatório: é o congelamento que libera o expurgo dos
   pings sem perder a prova.
2. **Idioma:** o da prova, o de quem pede, ou os dois no mesmo arquivo? A
   autoridade italiana quer italiano; um organizador brasileiro pode querer
   português para o arquivo dele.
~~3. Quem pode gerar?~~
**DECIDIDO: quem encerra a prova.** Ver abaixo.

---

## Quem gera o relatório

**Decidido em 25/08/2026: a mesma pessoa que encerra a prova, e ninguém mais.**

O diretor de prova é quem tem conta no sistema, com login e senha. Ele encerra
a prova e ele gera o relatório. É um gesto só, em duas etapas.

**Não é permissão nova.** A checagem já existe e já é usada pela ação de
encerrar: `can_edit_race` (`supabase/migrations/0002_rls.sql:48`), que é
verdadeira para quem criou a prova ou para quem consta em `race_members` com
papel `owner` ou `director`. O relatório entra atrás do mesmo portão. Nada de
inventar um conceito de permissão só para o PDF — conceito de permissão a mais
é superfície de erro a mais.

Note que `is_race_member` é um conjunto **mais largo** e não serve aqui. Mesmo
sem telefone, o relatório traz nome de motorista, placa e o rastro completo de
cada incidente — quem chamou, onde, quando. Um fiscal com acesso de leitura ao
painel não tem por que receber isso.

### O PDF congelado também é protegido

Congelar o relatório cria um arquivo, e arquivo tende a virar link. **Não pode
virar.** O PDF guardado é servido **só** pela rota autenticada, atrás do mesmo
`can_edit_race`. Nada de URL pública, nada de link assinado de longa duração,
nada de bucket aberto "só para facilitar".

Quem manda o relatório para a federação ou para a prefeitura **é o diretor**,
pelo canal dele, com o nome dele. O sistema entrega o documento a quem é
responsável por ele e para por aí.

## O relatório não leva telefone de motorista

**Decidido em 25/08/2026.** O documento carrega **o que prova, não o que
opera.**

O telefone do motorista existe para uma coisa só: o diretor ligar para ele
durante a prova. Depois que a prova acabou, ele não prova nada — não sustenta
horário, não sustenta posição, não sustenta tempo de resposta. É dado
operacional que perdeu a função, e dado sem função num documento que circula é
só risco.

E este documento **circula por definição**: vai para a prefeitura, para a
federação, eventualmente para uma seguradora. Cada cópia é uma cópia a mais da
agenda telefônica do comboio, em mãos que nunca pediram por ela e não têm
obrigação nenhuma de guardá-la.

**Nome e placa ficam**, e por um motivo diferente: eles respondem "quem estava
no carro de fechamento", que é exatamente o tipo de pergunta que uma
investigação faz. Têm valor probatório; o telefone não tem.

O critério, para as próximas seções que alguém quiser acrescentar: **se o dado
não sustenta uma afirmação do relatório, ele não entra.** Completude não é
virtude num documento de prova — é superfície.
