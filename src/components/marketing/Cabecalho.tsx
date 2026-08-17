import Link from "next/link";

import { SeletorIdioma } from "@/components/SeletorIdioma";
import { Assinatura } from "@/components/marketing/marca";
import type { Translator } from "@/lib/i18n/translate";

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
export function Cabecalho({ t }: { t: Translator }) {
  return (
    <>
      <div className="fr-progresso" data-progresso aria-hidden="true" />

      <header className="fr-topo">
        <div className="fr-shell fr-topo__inner">
          <Link
            href="/"
            className="fr-assinatura"
            aria-label={t("landing.nav.home")}
          >
            <Assinatura size={22} linha />
          </Link>

          <nav className="fr-topo__nav" aria-label={t("landing.nav.aria")}>
            <a className="fr-topo__link" href="#problema">
              {t("landing.nav.problem")}
            </a>
            <a className="fr-topo__link" href="#diferenciais">
              {t("landing.nav.measures")}
            </a>
            <a className="fr-topo__link" href="#telas">
              {t("landing.nav.screens")}
            </a>
          </nav>

          <div className="fr-topo__acoes">
            {/* A landing é a primeira porta: quem chega de fora e não lê
                português precisa poder trocar antes de decidir se entra. */}
            <SeletorIdioma rotulo={t("common.language")} />
            <Link href="/login" className="fr-btn fr-btn--rouge fr-btn--sm">
              {t("landing.footer.enter")}
            </Link>
          </div>
        </div>
      </header>

      {/* Decorativa: o mesmo rótulo já está no marco de cada seção, e um leitor
          de tela que anunciasse a troca a cada rolagem seria insuportável. */}
      <div className="fr-placa" data-placa data-visivel="nao" aria-hidden="true">
        <span className="fr-placa__ponto" />
        <span className="fr-placa__texto" data-placa-texto>
          {t("landing.nav.markerStart")}
        </span>
      </div>
    </>
  );
}
