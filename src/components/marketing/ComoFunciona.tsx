import { Secao } from "@/components/marketing/Secao";

const PASSOS = [
  {
    n: "Passo 1",
    titulo: "Carregue o percurso.",
    corpo:
      "O GPX da prova, ou o traçado desenhado na tela. O percurso é indexado uma vez, e é dele que sai toda distância medida depois — a posição de cada veículo, a janela e a escolha do socorro.",
  },
  {
    n: "Passo 2",
    titulo: "Gere a folha de códigos.",
    corpo:
      "Um código de 6 caracteres por veículo, com o papel de cada um: abertura, fechamento, vassoura, ambulância, mecânico, moto, fiscal. A folha sai pronta para imprimir e entregar no briefing.",
  },
  {
    n: "Passo 3",
    titulo: "Abra o painel no dia.",
    corpo:
      "Cada motorista abre o link, digita o código e aparece no mapa no idioma do próprio aparelho. Durante a prova não há mais nada para configurar.",
  },
];

export function ComoFunciona() {
  return (
    <Secao id="como-funciona" km="96" rotulo="Como funciona">
      <h2 className="fr-h2" id="como-funciona-titulo">
        Três passos antes da largada.
        <br />
        <span className="fr-forte">Nenhum durante.</span>
      </h2>

      <ol className="fr-passos" style={{ marginTop: "2.5rem" }}>
        {PASSOS.map((p) => (
          <li className="fr-passo" key={p.n} data-reveal>
            <span className="fr-passo__n">{p.n}</span>
            <h3 className="fr-h3">{p.titulo}</h3>
            <p className="fr-body">{p.corpo}</p>
          </li>
        ))}
      </ol>
    </Secao>
  );
}
