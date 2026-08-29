# Cronometragem de downhill — estudo

Escrito em 29/08/2026. **Nada disto existe.** É um estudo de um produto
ADJACENTE ao Flamme Rouge, registrado aqui porque é aqui que o assunto nasceu.
Se o projeto for em frente, muda para repositório próprio: é outro produto,
com outro comprador e outro modelo de negócio.

Origem: um amigo que organiza provas de downhill viu o Flamme Rouge e disse que
não servia para MTB de montanha, porque ali não vão carros. Serve para outra
coisa, e é disso que trata este documento.

---

## O que é

Um kit de duas caixas — uma na largada, uma na chegada — que cronometra
descidas de downhill com precisão abaixo do milissegundo, sem que o atleta
carregue nada, por algo entre **€150 e €350 o sistema inteiro**.

Leve o bastante para subir a montanha numa mochila. Barato o bastante para um
clube ou um grupo de amigos comprar.

---

## Por que agora: o Strava não serve, e o número explica

Hoje o pessoal compara tempo de descida por **segmento de Strava**. Isso erra
de **1 a 3 segundos**, por três motivos que se somam:

- amostragem de 1 Hz — o GPS marca uma vez por segundo, e a passagem pela
  linha cai no meio de duas amostras;
- o segmento casa por PROXIMIDADE, não por cruzamento de uma linha física;
- copa de árvore e vale degradam o sinal, e é exatamente onde o downhill
  acontece.

Numa descida de dois minutos, os pilotos disputam **três décimos**. O erro é
cinco a dez vezes maior que a coisa medida. Não é impreciso — é irrelevante.

**A régua para vencer é baixíssima: 10 ms já destrói o que existe hoje.** A
proposta chega abaixo de 1 ms porque custa quase nada chegar lá.

---

## A restrição que barateia tudo

**Um atleta desce por vez.** Essa é a única razão de o projeto ser viável no
preço proposto, e vale entender por quê.

Cronometragem cara existe para resolver identificação simultânea: cem atletas
cruzando a linha juntos, e o sistema precisa saber quem é cada um. É isso que
exige RFID — leitor, antenas, e uma etiqueta POR ATLETA, que é custo por prova.

Em descida individual esse problema não existe. **O feixe não precisa saber
quem passou: a ordem de largada já diz.** O sistema conta cruzamentos; a lista
dá os nomes.

Consequências, e são o produto inteiro:

- **O custo não escala com atletas.** Cinco amigos ou duzentos inscritos, o
  hardware é o mesmo.
- **Nada para carregar, perder ou esquecer.** Ninguém chega na pista e descobre
  que o chip ficou no carro.
- **Nada preso na bike** para se soltar numa descida — que é onde tudo se solta.
- **Quem chegou de última hora entra na hora.** Basta o nome na lista.

---

## O hardware

### Duas unidades idênticas

Decisão de projeto, não economia: a mesma peça serve de largada ou de chegada,
e o papel é escolhido no app. Um modelo só para fabricar, estocar e substituir
quando cair no barranco. E abre a expansão de graça — ver *parciais de setor*
mais abaixo.

| peça | papel | ~custo |
|---|---|---|
| ESP32-S3 | cérebro, BLE e WiFi | €6 |
| módulo GPS com saída **PPS** (u-blox) | o relógio | €12 |
| LoRa SX1276 (868/915 MHz) | manda o tempo morro acima | €6 |
| OLED pequeno | satélites, bateria, último tempo | €3 |
| caixa IP65, tripé, bateria USB-C | corpo | €40 |

Preços de referência, a confirmar antes de qualquer decisão.

### O relógio é o coração, e a solução é NÃO ligar as duas pontas

Largada e chegada ficam a um ou dois quilômetros, montanha abaixo. Puxar cabo é
inviável. Mandar "agora" por rádio é pior: a latência varia e não se sabe de
quanto — e um erro que varia é pior que um erro fixo, porque não dá para
corrigir.

Cada unidade carrega o próprio GPS com **PPS**: um pulso por segundo alinhado
ao tempo atômico, com erro de dezenas de nanossegundos. Os dois aparelhos, **sem
enlace nenhum entre eles**, ficam presos ao mesmo relógio no céu.

O tempo da descida é `chegada − largada`, e o erro total fica abaixo de 1 ms.

Sem o PPS a conta não fecha: o cristal do ESP32 desvia uns 20 ppm, o que dá
**3 a 4 ms de deriva numa descida de três minutos** entre duas unidades
independentes. Mais que a diferença entre primeiro e segundo. O PPS elimina
isso e custa €12 — é o item mais barato e o mais indispensável da lista.

Detalhe de firmware que decide a precisão: **a marca de tempo é capturada por
interrupção de hardware**, não lida num laço. O PPS entra na mesma contagem e
serve para corrigir a deriva do oscilador entre um segundo e o seguinte.

### Dois feixes na chegada, não um

Sensores retrorreflexivos **modulados** — que rejeitam luz do sol — separados
por 40 cm. Sensor simples de LED e fotorresistor cega ao sol direto e não serve.

Dois feixes em vez de um resolvem duas coisas:

**Rejeitam disparo falso.** O feixe não distingue roda de galho, de fiscal
atravessando ou de espectador. Uma bike a 30 km/h cobre 40 cm em 48 ms; uma
pessoa a pé leva 400 ms. A ordem e o intervalo separam os dois. Sem isso, um
galho apaga a descida de alguém — e em downhill isso vira protesto.

**Dão a velocidade na linha de graça.** 40 cm dividido pelo intervalo entre os
feixes. Piloto adora esse número, e o Strava não tem.

Na largada, o portão de downhill já é mecânico: um microinterruptor no braço
resolve.

### Backup, sempre

Um celular filmando a chegada com relógio visível no quadro. Custa nada e é a
única coisa que resolve contestação quando o eletrônico falhou. Cronometrista
profissional nunca vai sem redundância, e não é excesso de zelo.

---

## O software

### Firmware

Disciplina o oscilador pelo PPS. Captura a borda do gatilho por interrupção.
Valida a sequência dos dois feixes. **Grava em memória flash** e só então
publica por BLE e LoRa.

Gravar antes de publicar não é detalhe: se o celular do operador morrer ou o
rádio falhar, os tempos não morrem junto.

### O problema difícil não é cronometrar

Com intervalo de largada de 30 s e descida de 3 minutos, há **até seis atletas
na pista ao mesmo tempo**. O sistema mantém uma fila: quem sai primeiro chega
primeiro.

Até alguém cair.

**Um abandono no meio desalinha a fila inteira, e a partir dali todos os tempos
vão para a pessoa errada — silenciosamente.** Este é o defeito que estraga uma
prova, e não tem nada a ver com precisão de relógio.

O desenho tem que ser: fila como PALPITE, nunca como afirmação. O operador está
na chegada vendo o atleta cruzar, e a tela mostra

> chegando: **#14 João** — confirmar · é outro · abandono

com um toque para resolver. É o mesmo princípio do relatório final do Flamme
Rouge: o sistema propõe o que sabe e deixa visível o que pode estar errado, em
vez de afirmar com confiança.

**Cronometrar é fácil. Casar tempo com pessoa é o produto.**

### O app

Lista de largada, quem está na pista, tempo ao vivo, classificação por
categoria, histórico do atleta descida a descida.

---

## A camada opcional: o celular do atleta

Três minutos de descida não têm problema de bateria nem de dados — a ressalva
que valeria para uma maratona de quatro horas não se aplica aqui.

O motivo mais forte para usar o celular **não é transmissão ao vivo**. É que
ele resolve o problema que o feixe não consegue:

- **o feixe dá o QUANDO**, ao milissegundo; GPS jamais chega perto disso;
- **o celular dá o QUEM e o ONDE**, com alguns metros de erro; o feixe não sabe
  nem uma coisa nem outra.

Com o atleta transmitindo, a chegada deixa de ser adivinhada por ordem: o
sistema vê quem estava ali. **O abandono para de contaminar a fila**, porque o
sistema enxerga o cara parado no meio da pista.

E vira rede de segurança do cronômetro: se um feixe falhar, o rastro dá um
tempo aproximado. Não vale para pódio, mas a descida não se perde inteira.

### Mas em downhill o prêmio maior é segurança

Pista de downhill é dentro do mato, fiscal não enxerga fiscal, e a queda é
violenta. Hoje, localizar alguém é "caiu entre o posto 4 e o 5". Com rastro, é
um ponto no mapa e o instante em que ele parou de se mover.

É exatamente o que o Flamme Rouge já faz com veículo.

### Três ressalvas honestas

**Sinal.** Pista de downhill costuma estar em vale e sob mata. O envio offline
enfileira e sobe quando reconecta, então o rastro nunca se perde — mas AO VIVO
depende de sinal ao vivo, e em muita pista não vai ter. Para segurança,
atrasado vale bem menos.

**Onde o celular fica, e isto é sério.** Celular no bolso traseiro numa queda de
downhill é aparelho quebrado e risco de lesão. Tem que ser mochila de hidratação
ou faixa peitoral — e isso muda o que o atleta veste, não só o que ele instala.
É uma exigência real, não um detalhe de configuração.

**Copa de árvore degrada o GPS.** O rastro vai ser tosco em trecho fechado. Não
atrapalha o tempo, que é do feixe, mas não prometa mapa bonito.

---

## Parciais de setor: a expansão que sai de graça

Como as unidades são idênticas, **uma terceira no meio da pista vira parcial de
setor**. Mesma peça, mesmo firmware, configurada como "setor 1".

É o que treinador e piloto mais querem e o que nenhum Strava dá: saber que
ganhou 0,4 s na parte de cima e perdeu 0,7 s no trecho de raiz.

---

## O mercado que pode ser maior: dia de treino

Prova de downhill acontece três vezes por ano. **Treino acontece todo sábado.**

O piloto desce o mesmo trecho vinte vezes e quer saber se melhorou — é
exatamente o que ele hoje tenta arrancar do Strava e não consegue. Nesse modo
não há lista de largada nem operador: liga as duas caixas, desce, e o celular
mostra

> descida 7 · **2:14.331** · melhor do dia −0,412 · velocidade na linha 47,2 km/h

Um clube ou uma pista compra **um** kit e usa toda semana. **A prova é a
vitrine; o treino é o hábito.** É no uso semanal que mora a chance de isto virar
produto em vez de brinquedo.

---

## O que só um organizador de downhill pode responder

São as perguntas cujas respostas MUDAM O PROJETO. Enquanto não vierem, tudo
acima é hipótese informada.

**Sobre a operação**

1. Qual o intervalo de largada em prova, e quantos ficam na pista ao mesmo
   tempo? (Define se a fila é problema pequeno ou central.)
2. Como é o portão de largada hoje — mecânico com braço, ou alguém dando o
   sinal? (Define o gatilho da largada.)
3. Tem sempre alguém na chegada durante a prova inteira? (Define se a
   confirmação de cada chegada é viável ou fantasia.)
4. A pista fica montada, ou monta e desmonta a cada evento? (Define quanto
   importa ser leve e rápido de instalar.)

**Sobre precisão e regra**

5. A precisão exigida é centésimo ou milésimo?
6. A federação dele exige cronometragem homologada em prova oficial? (Para
   treino e prova de clube não muda nada; para prova federada pode inviabilizar
   o uso oficial — e aí o produto vira treino e prova amadora.)
7. Já perdeu o tempo de alguém por falha de cronometragem? Como resolveram?
   (É a história que diz o quanto dói.)

**Sobre o lugar**

8. Qual a distância e o desnível entre largada e chegada, e dá para ver uma da
   outra? (Define se o LoRa alcança ou se os dados só se juntam no fim.)
9. Tem sinal de celular no topo? Na chegada? No meio? (Define se a camada de
   celular é ao vivo ou só rastro.)

**Sobre dinheiro**

10. Quanto se paga hoje por cronometragem numa prova dele, se paga?
11. Um clube compraria um kit de €300 para usar em treino? Quantos treinos por
    mês?

---

## Fases

**Fase 0 — provar o relógio.** Um fim de semana e ~€300. Duas unidades, feixe
único, modo treino, sem app: só uma tela mostrando o tempo.

Isso valida as duas únicas coisas que podem inviabilizar tudo: **a sincronia
dos dois GPS** e **o comportamento do sensor no sol e na poeira**. Se as duas
passarem, o resto é software — que é onde o time já é rápido.

Não construa o produto antes desta fase. Se o relógio não fechar, não há
produto.

**Fase 1 — treino usável.** Segundo feixe, velocidade na linha, app simples com
histórico de descidas e melhor do dia.

**Fase 2 — prova.** Lista de largada, fila com confirmação, categorias,
resultado ao vivo.

**Fase 3 — o celular.** Identidade, segurança, parciais. Aqui entra o que já
existe no app do motorista.

---

## Riscos que podem matar o projeto

**Homologação.** Se prova federada exigir equipamento homologado, o produto
fica restrito a treino e prova amadora. Não mata — mas muda o tamanho.

**Fabricação.** Duas caixas num fim de semana é protótipo. Vinte caixas
confiáveis, à prova de chuva e de queda, com suporte, é uma empresa de hardware
— e é um negócio diferente do que se toca hoje, com estoque, garantia e
logística.

**A responsabilidade.** Cronometragem é domínio onde "funcional" tem régua
altíssima: no dia em que falha, não se teve um defeito — estragou-se a prova de
alguém, e o resultado vira discussão pública. Por isso o modo TREINO vem antes
do modo prova: ele erra sem destruir nada, e é onde se aprende.

---

## O que reaproveita do Flamme Rouge

**Quase inteiro:** o app do motorista — vínculo por código, envio de posição,
fila offline, bateria, acionamento de socorro. Trocar "veículo" por "atleta" é
vocabulário.

**Nada:** o painel ao vivo. Ele é construído sobre abertura, fechamento e
janela, que não existem em downhill. A tela de downhill é outra coisa: quem
está na pista, há quanto tempo, e quem parou de se mexer.

**O princípio, sim:** declarar o que não se sabe em vez de afirmar com
confiança. É o que faz o relatório final valer, e é o que vai fazer uma
cronometragem caseira ser aceita ou recusada.
