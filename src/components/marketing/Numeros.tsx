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

import { LOCALE_META, type Locale } from "@/lib/i18n/config";
import type { TranslationKey, Translator } from "@/lib/i18n/translate";

interface Numero {
  bruto: number;
  casas: number;
  unidade: TranslationKey;
  rotulo: TranslationKey;
  corpo: TranslationKey;
  /** O primeiro é o número da tese — só ele vai em rouge. */
  destaque?: boolean;
}

const NUMEROS: Numero[] = [
  {
    bruto: 37.3,
    casas: 1,
    unidade: "landing.numbers.unitKm",
    rotulo: "landing.numbers.roadLabel",
    corpo: "landing.numbers.roadBody",
    destaque: true,
  },
  {
    bruto: 40,
    casas: 0,
    unidade: "landing.numbers.unitPoints",
    rotulo: "landing.numbers.offlineLabel",
    corpo: "landing.numbers.offlineBody",
  },
  {
    bruto: 6,
    casas: 0,
    unidade: "landing.numbers.unitChars",
    rotulo: "landing.numbers.codeLabel",
    corpo: "landing.numbers.codeBody",
  },
];

export function Numeros({ t, locale }: { t: Translator; locale: Locale }) {
  // O separador decimal é do idioma, não do português: "37.3" em inglês e
  // alemão, "37,3" em francês. O `data-conta` continua sendo o número cru — a
  // contagem animada refaz a formatação a cada quadro.
  const formatar = (n: Numero) =>
    new Intl.NumberFormat(LOCALE_META[locale]?.intlTag ?? "pt-BR", {
      minimumFractionDigits: n.casas,
      maximumFractionDigits: n.casas,
    }).format(n.bruto);

  return (
    <section className="fr-numeros" aria-label={t("landing.numbers.aria")}>
      <div className="fr-shell fr-numeros__grade">
        {NUMEROS.map((n, i) => (
          <div
            className="fr-numeros__item"
            key={n.rotulo}
            data-idioma={locale}
            data-reveal
            style={{ transitionDelay: `${i * 120}ms` }}
          >
            <span className="fr-eyebrow fr-numeros__rotulo">
              {t(n.rotulo)}
            </span>

            <p className="fr-numeros__valor">
              <span
                className={`fr-num fr-num--xl${n.destaque ? " fr-num--rouge" : ""}`}
                data-conta={n.bruto}
                data-casas={n.casas}
              >
                {formatar(n)}
              </span>
              <span className="fr-unit">{t(n.unidade)}</span>
            </p>

            <p className="fr-numeros__corpo">{t(n.corpo)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
