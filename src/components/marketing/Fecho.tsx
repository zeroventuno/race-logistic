/**
 * Último quilômetro.
 *
 * Aqui a página vira produto: as duas portas são as mesmas que existiam na
 * antiga raiz do app — o motorista entra pelo código, a direção entra pela
 * conta. O que mudou é que agora elas chegam depois do argumento, e não antes.
 *
 * A faixa é escura de propósito, e é a única da página. É a transição para o
 * produto: quem clica daqui já está olhando a paleta em que vai trabalhar.
 */

import Link from "next/link";

import { ChipTrakr } from "@/components/marketing/marca";
import { Secao } from "@/components/marketing/Secao";

export function Fecho() {
  return (
    <Secao id="entrar" km="148" rotulo="Flamme rouge" flamme escura>
      <div className="fr-fecho">
        <div>
          <h2 className="fr-h2" id="entrar-titulo">
            Duas portas.
            <br />
            <span className="fr-forte">Nenhuma decisão no meio.</span>
          </h2>
          <p className="fr-lead" style={{ marginTop: "1rem" }}>
            A direção entra pela conta e monta a prova. O motorista entra pelo
            código e não precisa decidir mais nada.
          </p>
          <p className="fr-body" style={{ marginTop: "1.5rem" }}>
            <ChipTrakr />
            <br />
            <span style={{ display: "inline-block", marginTop: "0.75rem" }}>
              Mesma casa do TRAKR, público diferente. O atleta e o treinador têm
              o produto deles; este é o de quem organiza — e por isso tem nome,
              ciclo de venda e regras próprias.
            </span>
          </p>
        </div>

        <nav className="fr-portas" aria-label="Entrar no sistema">
          <Link href="/dashboard" className="fr-porta fr-porta--principal">
            <h3 className="fr-h3">Sou da direção</h3>
            <p className="fr-body" style={{ color: "inherit", opacity: 0.75 }}>
              Cadastrar a prova, carregar o percurso, gerar os códigos e
              acompanhar a operação ao vivo.
            </p>
            <span className="fr-porta__seta" aria-hidden="true">
              Abrir o painel →
            </span>
          </Link>

          <Link href="/motorista" className="fr-porta">
            <h3 className="fr-h3" style={{ color: "#e8ecf2" }}>
              Sou motorista
            </h3>
            <p className="fr-body">
              Digite o código de 6 caracteres que a direção passou e o celular
              vira o GPS da sua posição.
            </p>
            <span className="fr-porta__seta" style={{ color: "#9aa5b5" }} aria-hidden="true">
              Entrar com código →
            </span>
          </Link>
        </nav>
      </div>
    </Secao>
  );
}
