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

import { Secao } from "@/components/marketing/Secao";
import type { Translator } from "@/lib/i18n/translate";

export function Fecho({ t }: { t: Translator }) {
  return (
    <Secao
      id="entrar"
      km="148"
      rotulo={t("landing.close.marker")}
      flamme
      escura
    >
      <div className="fr-fecho">
        <div>
          <h2 className="fr-h2" id="entrar-titulo">
            {t("landing.close.title")}
            <br />
            <span className="fr-forte">{t("landing.close.titleStrong")}</span>
          </h2>
          <p className="fr-lead" style={{ marginTop: "1rem" }}>
            {t("landing.close.lead")}
          </p>
        </div>

        <nav className="fr-portas" aria-label={t("landing.close.aria")}>
          <Link href="/dashboard" className="fr-porta fr-porta--principal">
            <h3 className="fr-h3">{t("landing.close.directorTitle")}</h3>
            <p className="fr-body" style={{ color: "inherit", opacity: 0.75 }}>
              {t("landing.close.directorBody")}
            </p>
            <span className="fr-porta__seta" aria-hidden="true">
              {t("landing.close.directorCta")}
            </span>
          </Link>

          <Link href="/driver" className="fr-porta">
            <h3 className="fr-h3" style={{ color: "#e8ecf2" }}>
              {t("landing.close.driverTitle")}
            </h3>
            <p className="fr-body">{t("landing.close.driverBody")}</p>
            <span className="fr-porta__seta" style={{ color: "#9aa5b5" }} aria-hidden="true">
              {t("landing.close.driverCta")}
            </span>
          </Link>
        </nav>
      </div>
    </Secao>
  );
}
