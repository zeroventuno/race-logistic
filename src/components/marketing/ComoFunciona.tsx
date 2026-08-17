import { Secao } from "@/components/marketing/Secao";
import type { Translator } from "@/lib/i18n/translate";

const PASSOS = [
  { n: 1, titulo: "landing.how.s1Title", corpo: "landing.how.s1Body" },
  { n: 2, titulo: "landing.how.s2Title", corpo: "landing.how.s2Body" },
  { n: 3, titulo: "landing.how.s3Title", corpo: "landing.how.s3Body" },
] as const;

export function ComoFunciona({ t }: { t: Translator }) {
  return (
    <Secao id="como-funciona" km="96" rotulo={t("landing.how.marker")}>
      <h2 className="fr-h2" id="como-funciona-titulo">
        {t("landing.how.title")}
        <br />
        <span className="fr-forte">{t("landing.how.titleStrong")}</span>
      </h2>

      <ol className="fr-passos" style={{ marginTop: "2.5rem" }}>
        {PASSOS.map((p) => (
          <li className="fr-passo" key={p.n} data-reveal>
            <span className="fr-passo__n">
              {t("landing.how.step", { n: p.n })}
            </span>
            <h3 className="fr-h3">{t(p.titulo)}</h3>
            <p className="fr-body">{t(p.corpo)}</p>
          </li>
        ))}
      </ol>
    </Secao>
  );
}
