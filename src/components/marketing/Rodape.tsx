import Link from "next/link";

import { BRAND } from "@/brand/mark";
import { LOCALES, LOCALE_META } from "@/lib/i18n/config";
import { Assinatura, ChipTrakr } from "@/components/marketing/marca";

export function Rodape() {
  return (
    <footer className="fr-rodape">
      <div className="fr-shell fr-rodape__grade">
        <div className="fr-pilha">
          {/* O rodapé é noite: sem a cor explícita, o letreiro herdaria o
              cinza de 62% do corpo e viraria uma mancha. */}
          <Assinatura size={34} color="#f6f5f2" />
          <ChipTrakr />
          <p className="fr-body" style={{ maxWidth: "34ch" }}>
            {BRAND.tagline["pt-BR"]} para ciclismo de estrada.
          </p>
        </div>

        <div className="fr-pilha">
          <span className="fr-eyebrow">O app do motorista fala</span>
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
          <span className="fr-eyebrow">Entrar</span>
          <Link className="fr-topo__link" href="/login">
            Direção de prova
          </Link>
          <Link className="fr-topo__link" href="/cadastro">
            Criar conta
          </Link>
          <Link className="fr-topo__link" href="/motorista">
            Motorista com código
          </Link>
        </div>
      </div>

      {/* Numa linha própria, abaixo da grade: crédito de autoria não é uma
          quarta coluna de navegação. Ele fecha a página. */}
      <div className="fr-shell fr-rodape__creditos">
        <p>
          Flamme Rouge · uma ferramenta <strong>Ventuno</strong> · 2026
        </p>
      </div>
    </footer>
  );
}
