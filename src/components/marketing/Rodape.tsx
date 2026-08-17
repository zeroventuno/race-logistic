import Link from "next/link";

import { LOCALES, LOCALE_META } from "@/lib/i18n/config";
import { Assinatura, ChipTrakr } from "@/components/marketing/marca";
import type { Translator } from "@/lib/i18n/translate";

export function Rodape({ t }: { t: Translator }) {
  return (
    <footer className="fr-rodape">
      <div className="fr-shell fr-rodape__grade">
        <div className="fr-pilha">
          {/* O rodapé é noite: sem a cor explícita, o letreiro herdaria o
              cinza de 62% do corpo e viraria uma mancha. */}
          <Assinatura size={34} color="#f6f5f2" />
          <ChipTrakr />
          <p className="fr-body" style={{ maxWidth: "34ch" }}>
            {t("landing.footer.tagline")}
          </p>
        </div>

        <div className="fr-pilha">
          <span className="fr-eyebrow">{t("landing.footer.languages")}</span>
          <ul
            className="fr-idiomas"
            style={{ listStyle: "none", padding: 0, margin: 0 }}
          >
            {LOCALES.map((l) => (
              <li className="fr-idioma" key={l}>
                {LOCALE_META[l].nativeName}
              </li>
            ))}
          </ul>
        </div>

        <div className="fr-pilha">
          <span className="fr-eyebrow">{t("landing.footer.enter")}</span>
          <Link className="fr-topo__link" href="/login">
            {t("landing.footer.director")}
          </Link>
          <Link className="fr-topo__link" href="/signup">
            {t("landing.footer.signup")}
          </Link>
          <Link className="fr-topo__link" href="/driver">
            {t("landing.footer.driver")}
          </Link>
        </div>
      </div>

      {/* Numa linha própria, abaixo da grade: crédito de autoria não é uma
          quarta coluna de navegação. Ele fecha a página. */}
      <div className="fr-shell fr-rodape__creditos">
        <p>
          {t("meta.appName")} · {t("landing.footer.credits")}{" "}
          <a href="https://zeroventuno.com" target="_blank" rel="noopener noreferrer">
            Ventuno
          </a>{" "}
          · 2026
        </p>
      </div>
    </footer>
  );
}
