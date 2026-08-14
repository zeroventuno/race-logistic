/**
 * Os diferenciais, com os números medidos.
 *
 * Cada cartão abre com um número e não com um adjetivo. É deliberado: quem
 * decide a compra de um sistema de segurança já leu "robusto", "confiável" e
 * "em tempo real" em todo folheto que passou pela mesa dele, e nenhuma dessas
 * palavras se verifica. "37,3 km" e "40 pontos" se verificam — e, se um dia
 * não se sustentarem, é melhor descobrir isso numa reunião do que numa prova.
 *
 * O primeiro argumento ocupa a largura inteira porque é o único que precisa de
 * desenho: a diferença entre 0,05 km e 37,3 km não se explica em prosa tão
 * rápido quanto se enxerga em quinze segundos de figura.
 */

import { DesvioDiagrama } from "@/components/marketing/DesvioDiagrama";
import { Secao } from "@/components/marketing/Secao";

const CARTOES = [
  {
    indice: "02",
    titulo: "A janela abertura↔fechamento é medida, não estimada.",
    numero: "medido",
    corpo:
      "O sistema guarda a que horas o carro de abertura passou por cada ponto do percurso. Quando o carro de fechamento chega ao km 42, a janela é a diferença entre dois horários observados — a mesma conta de um tempo intermediário de cronometragem. É esse número que a organização combinou com a autoridade de trânsito: é a passagem do fechamento que devolve a via ao tráfego. Quando ainda não há histórico suficiente, a tela escreve “projetado” e diz o motivo. O diretor nunca precisa adivinhar qual dos dois está lendo.",
  },
  {
    indice: "03",
    titulo: "Funciona sem sinal.",
    numero: "40 pontos",
    corpo:
      "Nada é enviado antes de ser gravado no aparelho, e nada sai da fila antes do servidor confirmar o recebimento. Num teste de dois minutos sem cobertura, os 40 pontos acumulados chegaram completos, em ordem e sem duplicar assim que o sinal voltou.",
  },
  {
    indice: "04",
    titulo: "O alerta não falha em silêncio.",
    numero: "fila local",
    corpo:
      "O alerta fura a fila na frente de qualquer ping de GPS e é retentado até haver confirmação do servidor — um pedido de socorro nunca é descartado, mesmo que isso signifique uma fila que não esvazia. E o socorro certo é acionado pela categoria, sem ninguém ter que escolher no meio da urgência: acidente aciona ambulância, problema mecânico aciona o mecânico.",
  },
  {
    indice: "05",
    titulo: "Qualquer celular vira o GPS do veículo.",
    numero: "6 caracteres",
    corpo:
      "O motorista abre o link, digita o código de 6 caracteres impresso na folha do briefing e o aparelho dele passa a ser o rastreador daquele veículo. Nenhum aplicativo para instalar, nenhum equipamento para comprar, carregar, distribuir e recolher no fim do dia.",
  },
  {
    indice: "06",
    titulo: "Seis idiomas, um único link.",
    numero: "6 idiomas",
    corpo:
      "O idioma não vai na URL — o aparelho negocia. O mesmo link e o mesmo QR impresso entregam português ao motorista brasileiro, italiano ao italiano e alemão ao austríaco, sem a direção gerenciar nada. Um celular configurado em pt-PT recebe português, não inglês.",
  },
];

export function Argumentos() {
  return (
    <Secao id="diferenciais" km="34" rotulo="O que o sistema mede">
      <h2 className="fr-h2" id="diferenciais-titulo">
        Seis decisões de engenharia
        <br />
        <span className="fr-forte">que mudam o que aparece na tela.</span>
      </h2>

      <div className="fr-destaque" style={{ marginTop: "2.5rem" }} data-reveal>
        <div className="fr-pilha">
          <span className="fr-card__indice">01</span>
          <h3 className="fr-h2" style={{ fontSize: "clamp(1.5rem,3.4vw,2rem)" }}>
            Distância pela estrada, não em linha reta.
          </h3>
          <p className="fr-body">
            Num teste real, uma moto estava a <b>0,05 km</b> em linha reta do
            ponto de um acidente e a <b>37,3 km</b> pela estrada — na perna de
            volta do percurso, com a única ligação entre as duas trinta e sete
            quilômetros adiante. O sistema acionou a ambulância que estava{" "}
            <b>1,5 km atrás</b>, no mesmo sentido do fluxo da prova.
          </p>
          <p className="fr-body">
            Um sistema que compara coordenadas teria mandado a moto, e a moto
            teria levado o tempo da prova inteira para chegar. Quem já passou do
            ponto também paga o preço de achar onde retornar e voltar contra o
            fluxo — e essa assimetria entra na conta.
          </p>
        </div>
        <DesvioDiagrama />
      </div>

      <div className="fr-grade fr-grade--2" style={{ marginTop: "2rem" }}>
        {CARTOES.map((c) => (
          <article className="fr-card" key={c.indice} data-reveal>
            <span className="fr-card__indice">{c.indice}</span>
            <h3 className="fr-h3">{c.titulo}</h3>
            <p className="fr-chave fr-num">{c.numero}</p>
            <p className="fr-body">{c.corpo}</p>
          </article>
        ))}
      </div>
    </Secao>
  );
}
