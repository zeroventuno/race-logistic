/**
 * Seção com marco quilométrico.
 *
 * A página é lida como um road book: cada seção abre com uma placa de
 * quilometragem, e os números crescem do topo até a chegada. Não é ornamento
 * emprestado de outro setor — é a única sinalização que todo mundo que
 * organiza prova de estrada lê o dia inteiro, e ela responde "onde eu estou
 * nesta página" com a mesma convenção que responde "onde eu estou nesta
 * etapa". O último marco é o do flamme rouge, a 1 km da chegada, que é onde
 * fica o convite para entrar.
 */

import type { ReactNode } from "react";

import { Bandeirola } from "@/components/marketing/marca";

interface Props {
  id?: string;
  /** Quilômetro exibido na placa. */
  km: string;
  /** Nome da seção, em caixa alta pequena. */
  rotulo: string;
  /** Marco do flamme rouge: placa em rouge, com a bandeirola. */
  flamme?: boolean;
  escura?: boolean;
  children: ReactNode;
}

export function Secao({ id, km, rotulo, flamme, escura, children }: Props) {
  return (
    <section
      id={id}
      className={`fr-section${escura ? " fr-section--dark" : ""}`}
      aria-labelledby={id ? `${id}-titulo` : undefined}
      // O que a placa fixa no canto mostra quando esta seção é a que está
      // sendo lida. Mesmo texto do marco, para não haver duas verdades.
      data-capitulo={`KM ${km} — ${rotulo.toUpperCase()}`}
    >
      <div className="fr-shell">
        <div className="fr-marco">
          <span
            className={`fr-marco__km${flamme ? " fr-marco__km--rouge" : ""}`}
          >
            {flamme ? (
              <Bandeirola size={12} tremular className="fr-marco__flag" />
            ) : null}
            KM {km}
          </span>
          <span className="fr-marco__label">{rotulo}</span>
          <span className="fr-marco__rule" aria-hidden="true" />
        </div>
        {children}
      </div>
    </section>
  );
}
