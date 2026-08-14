import Link from "next/link";

import { Assinatura } from "@/components/marketing/marca";

/**
 * O cabeçalho, a barra de progresso e a placa de quilometragem.
 *
 * Os três são a mesma ideia em três lugares: dizer onde o leitor está no
 * percurso. A barra dá a fração, a placa dá o trecho, o cabeçalho dá a saída.
 * Ficam juntos aqui porque são a única camada fixa da página — se um dia
 * alguém precisar tirar o rodapé flutuante de cima de um modal, é um arquivo
 * só.
 *
 * A barra e a placa nascem inertes: sem JS a barra fica em `scaleX(0)` e a
 * placa em `opacity: 0`, ambas `pointer-events: none`. Nenhuma das duas
 * carrega informação que não esteja também no corpo da página.
 */
export function Cabecalho() {
  return (
    <>
      <div className="fr-progresso" data-progresso aria-hidden="true" />

      <header className="fr-topo">
        <div className="fr-shell fr-topo__inner">
          <Link
            href="/"
            className="fr-assinatura"
            aria-label="Flamme Rouge, início"
          >
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

          <Link href="/login" className="fr-btn fr-btn--rouge fr-btn--sm">
            Entrar
          </Link>
        </div>
      </header>

      {/* Decorativa: o mesmo rótulo já está no marco de cada seção, e um leitor
          de tela que anunciasse a troca a cada rolagem seria insuportável. */}
      <div className="fr-placa" data-placa data-visivel="nao" aria-hidden="true">
        <span className="fr-placa__ponto" />
        <span className="fr-placa__texto" data-placa-texto>
          KM 000 — LARGADA
        </span>
      </div>
    </>
  );
}
