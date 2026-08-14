/**
 * A faixa de números medidos, logo abaixo do herói.
 *
 * É a primeira coisa depois da promessa, e é de propósito: a frase do herói
 * diz "medida pela estrada", e três números medidos vindo em seguida são a
 * diferença entre uma promessa e uma afirmação verificável. Cada um deles saiu
 * de um teste que existe no repositório, não de uma estimativa de marketing.
 *
 * Fundo escuro entre duas seções claras. A faixa não é uma seção do road book
 * — não leva marco de quilometragem — é o resumo da anterior, do mesmo jeito
 * que uma placa de resultado não é um trecho da etapa.
 *
 * A contagem de zero até o valor é feita por `Movimento`, lendo `data-conta`.
 * O número que está no HTML já é o final: sem JS, a página mostra o dado
 * certo, parado.
 */

interface Numero {
  /** Valor final, como aparece no HTML e no `data-conta`. */
  valor: string;
  bruto: number;
  casas: number;
  unidade: string;
  rotulo: string;
  corpo: string;
  /** O primeiro é o número da tese — só ele vai em rouge. */
  destaque?: boolean;
}

const NUMEROS: Numero[] = [
  {
    valor: "37,3",
    bruto: 37.3,
    casas: 1,
    unidade: "km",
    rotulo: "Pela estrada",
    corpo:
      "Separavam a moto do acidente que ela parecia estar vendo. Em linha reta eram 50 metros. O sistema mandou a ambulância que estava 1,5 km atrás.",
    destaque: true,
  },
  {
    valor: "40",
    bruto: 40,
    casas: 0,
    unidade: "pontos",
    rotulo: "Sem sinal",
    corpo:
      "Acumulados em dois minutos sem cobertura chegaram completos, em ordem e sem duplicar quando o sinal voltou.",
  },
  {
    valor: "6",
    bruto: 6,
    casas: 0,
    unidade: "caracteres",
    rotulo: "Para entrar",
    corpo:
      "É tudo que o motorista digita. Sem conta, sem aplicativo, sem equipamento para comprar e recolher.",
  },
];

export function Numeros() {
  return (
    <section className="fr-numeros" aria-label="Números medidos em teste">
      <div className="fr-shell fr-numeros__grade">
        {NUMEROS.map((n, i) => (
          <div
            className="fr-numeros__item"
            key={n.rotulo}
            data-reveal
            style={{ transitionDelay: `${i * 120}ms` }}
          >
            <span className="fr-eyebrow fr-numeros__rotulo">{n.rotulo}</span>

            <p className="fr-numeros__valor">
              <span
                className={`fr-num fr-num--xl${n.destaque ? " fr-num--rouge" : ""}`}
                data-conta={n.bruto}
                data-casas={n.casas}
              >
                {n.valor}
              </span>
              <span className="fr-unit">{n.unidade}</span>
            </p>

            <p className="fr-numeros__corpo">{n.corpo}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
