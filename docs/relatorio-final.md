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

### 3 · A rua, trecho a trecho

**A tabela que ninguém consegue produzir hoje**, e provavelmente a seção que a
polícia mais quer:

| trecho | fechou | reabriu | duração |
|---|---|---|---|
| Via Roma, Cuneo | 09:14 | 09:51 | 37 min |
| SP 422, km 8–14 | 09:22 | 10:03 | 41 min |

"Fechou" é a passagem da abertura. "Reabriu" é a passagem do último veículo —
**a vassoura, não o fechamento**. Essa distinção é do domínio e o relatório não
pode errar: atrás do carro de fechamento ainda vem prova.

Esta é a única seção que **precisa de dado que o sistema ainda não tem** — ver
abaixo.

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

Os veículos, papéis, motoristas, telefones, placas. Quando cada um vinculou o
aparelho. E a **cobertura de sinal de cada um**: quanto tempo transmitindo,
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

## O problema sério: o histórico depende de um navegador aberto

`gap_snapshots` é escrito pelo **navegador do diretor**. `useLiveState` chama o
endpoint periodicamente, com `gravarHistorico`. O endpoint faz a coisa certa —
recalcula no servidor em vez de confiar no número que o browser mandou, e o
comentário lá explica exatamente por quê: *"se alguém questionar depois por que
a rua foi liberada às 14h32, a resposta não pode ter passado pelo browser de
ninguém."*

Só que o **disparo** ainda passa. Se a direção fechar o notebook, se a aba
dormir no tablet, se o celular bloquear a tela, se a bateria acabar às 14h —
o histórico simplesmente para. E o buraco não fica marcado como
`insufficient_data`: ele fica **sem linha nenhuma**, indistinguível de um
período que não existiu.

Para um painel ao vivo isso é aceitável. Para um documento de prova, é o ponto
exato onde ele quebra — e é a pergunta que uma federação faria primeiro.

Isso não dá para consertar depois. **Histórico não medido não se recupera.**

Dois caminhos, e eu recomendaria o segundo:

**A · gravar no servidor.** Uma tarefa agendada escreve `gap_snapshots` a cada
30 s enquanto a prova estiver `live`, independente de quem está olhando. Custa
uma rotina agendada e um pouco de escrita.

**B · recalcular no relatório.** O relatório reconstrói a série inteira a
partir de `location_pings`, com a mesma matemática de offset da rota. Aí o
documento não depende de aba nenhuma jamais ter existido, e `gap_snapshots`
volta a ser o que deveria ser: conveniência do painel ao vivo, não o registro
oficial.

B é mais honesto e mais barato — mas amarra o relatório à retenção dos pings.

### A retenção e o relatório são o mesmo assunto

Já estava na lista apagar `location_pings` antigos. Se o relatório for
calculado a partir deles (caminho B), **apagar os pings destrói a capacidade de
gerar o relatório**.

A saída é fazer os dois na ordem certa: ao encerrar a prova, o sistema gera o
relatório, **congela** (PDF guardado, com hash), e só então os pings daquela
prova ficam elegíveis para expurgo. O documento vira o registro; os pings viram
descartáveis.

Congelar tem outro motivo, independente: um documento de prova que pode ser
regenerado diferente amanhã não é prova de nada.

---

## O que falta de dado: a rua tem nome

A tabela da seção 3 precisa saber que o quilômetro 8 ao 14 é a SP 422 e que o
trecho tal fica em Cuneo. Hoje o percurso é só geometria — `route_tracks` tem
pontos, não topônimos.

Três saídas, em ordem de esforço:

1. **A direção declara os trechos** ao cadastrar a prova: nome e quilometragem
   inicial. Trabalhoso, mas é exatamente a lista que o organizador já entregou
   à prefeitura para pedir a autorização — ele já tem esse documento na mão.
2. **Geocodificação reversa** do traçado, uma vez, no cadastro. O MapTiler já
   está contratado. Erra em estrada rural.
3. **v1 sem nomes**: tabela por quilômetro (`km 0–8`, `km 8–14`). Menos útil
   para a prefeitura, mas honesto e entrega hoje.

Começaria pela 3, com a 1 disponível para quem quiser caprichar.

---

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

1. **A · gravar no servidor, ou B · recalcular dos pings?** Tudo depende disso,
   e A precisa estar de pé antes da primeira prova real — histórico perdido não
   volta.
2. **Congelar o PDF ou gerar sob demanda?** Amarra com a política de retenção.
3. **Trecho por nome ou por quilômetro na v1?**
4. **Idioma:** o da prova, o de quem pede, ou os dois no mesmo arquivo? A
   autoridade italiana quer italiano; um organizador brasileiro pode querer
   português para o arquivo dele.
