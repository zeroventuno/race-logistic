/**
 * O problema, dito com as frases que se ouvem no rádio.
 *
 * A tentação aqui é descrever a dor em abstrato ("falta de visibilidade
 * operacional"). Quem organiza prova reconhece marketing vazio na hora. As
 * falas abaixo são as perguntas literais que circulam num canal de rádio, e o
 * que a página faz é apontar a consequência de cada uma continuar sem resposta.
 */

import { SlotImagemView } from "@/components/marketing/SlotMidia";
import { Secao } from "@/components/marketing/Secao";
import { SLOTS } from "@/components/marketing/midia";

const FALHAS = [
  {
    fala: "“Onde está o fechamento?”",
    consequencia:
      "A resposta vem por estimativa, e é em cima dela que se libera a via — e que se cumpre, ou não, o tempo de interdição combinado com a autoridade de trânsito. Errar dez minutos para mais é quebrar o acordo; para menos, é reabrir a rua antes da hora.",
  },
  {
    fala: "“Caiu alguém no km 60.”",
    consequencia:
      "Quem ouviu? Quem foi? Enquanto ninguém responde no rádio, não há como distinguir “o chamado não chegou” de “o chamado chegou e estão a caminho”.",
  },
  {
    fala: "“Manda o apoio mais próximo.”",
    consequencia:
      "Mais próximo medido como? No mapa do papel a distância é a do olho — e o olho não sabe que aquele trecho é a perna de volta e que a estrada só se reencontra 30 km adiante.",
  },
  {
    fala: "“O motorista não entendeu.”",
    consequencia:
      "Numa prova internacional a equipe de apoio fala quatro idiomas. O rádio fala um, e o briefing de meia hora antes da largada já acabou.",
  },
  {
    fala: "“Encerrou a prova.”",
    consequencia:
      "E não sobra registro de quem estava onde, a que horas, quando o alerta foi aberto e quanto tempo o socorro levou. A federação pergunta depois; a memória da equipe responde.",
  },
];

export function Problema() {
  return (
    <Secao id="problema" km="12" rotulo="O que acontece hoje">
      <div className="fr-duas-colunas">
        <div>
          <h2 className="fr-h2" id="problema-titulo">
            A prova acontece no rádio.
            <br />E o rádio não pega no vale.
          </h2>
          <p className="fr-lead" style={{ marginTop: "1.25rem" }}>
            Nada disto é falha de quem organiza. É o que sobra quando a única
            fonte de posição é alguém dizendo, de memória, onde acha que está.
          </p>
        </div>
        <div data-reveal>
          <SlotImagemView slot={SLOTS.pave} rotulo="Foto · pelotão esticado" />
        </div>
      </div>

      <ul className="fr-falhas" style={{ marginTop: "3rem" }}>
        {FALHAS.map((f) => (
          <li className="fr-falhas__item" key={f.fala}>
            <p className="fr-falhas__fala">{f.fala}</p>
            <p className="fr-body">{f.consequencia}</p>
          </li>
        ))}
      </ul>
    </Secao>
  );
}
