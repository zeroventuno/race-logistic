/**
 * Os diferenciais, com os números medidos.
 *
 * Cada cartão abre com um número e não com um adjetivo. É deliberado: quem
 * decide a compra de um sistema de segurança já leu "robusto", "confiável" e
 * "em tempo real" em todo folheto que passou pela mesa dele, e nenhuma dessas
 * palavras se verifica. "37,3 km" e "40 pontos" se verificam — e, se um dia
 * não se sustentarem, é melhor descobrir isso numa reunião do que numa prova.
 *
 * O primeiro argumento ocupa a largura inteira porque é o único que precisa de
 * desenho: a diferença entre 0,05 km e 37,3 km não se explica em prosa tão
 * rápido quanto se enxerga em quinze segundos de figura.
 */

import { DesvioDiagrama } from "@/components/marketing/DesvioDiagrama";
import { Enfase } from "@/components/marketing/Enfase";
import { Secao } from "@/components/marketing/Secao";
import type { TranslationKey, Translator } from "@/lib/i18n/translate";

const CARTOES: Array<{
  indice: string;
  titulo: TranslationKey;
  numero: TranslationKey;
  corpo: TranslationKey;
}> = [
  {
    indice: "02",
    titulo: "landing.measures.c2Title",
    numero: "landing.measures.c2Tag",
    corpo: "landing.measures.c2Body",
  },
  {
    indice: "03",
    titulo: "landing.measures.c3Title",
    numero: "landing.measures.c3Tag",
    corpo: "landing.measures.c3Body",
  },
  {
    indice: "04",
    titulo: "landing.measures.c4Title",
    numero: "landing.measures.c4Tag",
    corpo: "landing.measures.c4Body",
  },
  {
    indice: "05",
    titulo: "landing.measures.c5Title",
    numero: "landing.measures.c5Tag",
    corpo: "landing.measures.c5Body",
  },
  {
    indice: "06",
    titulo: "landing.measures.c6Title",
    numero: "landing.measures.c6Tag",
    corpo: "landing.measures.c6Body",
  },
];

export function Argumentos({ t }: { t: Translator }) {
  return (
    <Secao id="diferenciais" km="34" rotulo={t("landing.measures.marker")}>
      <h2 className="fr-h2" id="diferenciais-titulo">
        {t("landing.measures.title")}
        <br />
        <span className="fr-forte">{t("landing.measures.titleStrong")}</span>
      </h2>

      <div className="fr-destaque" style={{ marginTop: "2.5rem" }} data-reveal>
        <div className="fr-pilha">
          <span className="fr-card__indice">01</span>
          <h3 className="fr-h2" style={{ fontSize: "clamp(1.5rem,3.4vw,2rem)" }}>
            {t("landing.measures.leadTitle")}
          </h3>
          <p className="fr-body">
            <Enfase texto={t("landing.measures.leadBody1")} />
          </p>
          <p className="fr-body">{t("landing.measures.leadBody2")}</p>
        </div>
        <DesvioDiagrama />
      </div>

      <div className="fr-grade fr-grade--2" style={{ marginTop: "2rem" }}>
        {CARTOES.map((c, i) => (
          <article
            className="fr-card"
            key={c.indice}
            data-reveal
            data-delay={(i % 2) * 60}
          >
            <span className="fr-card__indice">{c.indice}</span>
            <h3 className="fr-h3">{t(c.titulo)}</h3>
            <p className="fr-chave fr-num">{t(c.numero)}</p>
            <p className="fr-body">{t(c.corpo)}</p>
          </article>
        ))}

        {/* São cinco cartões numa grade de duas colunas, então sobra uma
            célula. Deixá-la vazia é um buraco cinza no meio do argumento;
            preenchê-la com um sexto cartão diluiria a lista. O resumo resolve
            os dois: fecha a seção com a frase que o leitor levaria daqui de
            qualquer jeito, e ocupa o vão. */}
        <aside className="fr-card fr-card--resumo" data-reveal data-delay="120">
          <span className="fr-eyebrow">
            {t("landing.measures.summaryLabel")}
          </span>
          <p className="fr-resumo__frase">{t("landing.measures.summary")}</p>
        </aside>
      </div>
    </Secao>
  );
}
