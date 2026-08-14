import Link from "next/link";

import { Assinatura } from "@/components/marketing/marca";

export function Cabecalho() {
  return (
    <header className="fr-topo">
      <div className="fr-shell fr-topo__inner">
        <Link href="/" className="fr-assinatura" aria-label="Flamme Rouge, início">
          <Assinatura size={26} />
        </Link>

        <nav className="fr-topo__nav" aria-label="Seções da página">
          <a className="fr-topo__link" href="#problema">
            O problema
          </a>
          <a className="fr-topo__link" href="#diferenciais">
            O que o sistema mede
          </a>
          <a className="fr-topo__link" href="#telas">
            As duas telas
          </a>
        </nav>

        <Link href="/login" className="fr-btn fr-btn--ink">
          Entrar
        </Link>
      </div>
    </header>
  );
}
