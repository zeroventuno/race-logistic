/**
 * O problema, dito com as frases que se ouvem no rádio.
 *
 * A tentação aqui é descrever a dor em abstrato ("falta de visibilidade
 * operacional"). Quem organiza prova reconhece marketing vazio na hora. As
 * falas abaixo são as perguntas literais que circulam num canal de rádio, e o
 * que a página faz é apontar a consequência de cada uma continuar sem resposta.
 */

import { SlotImagemView } from "@/components/marketing/SlotMidia";
import { Secao } from "@/components/marketing/Secao";
import { SLOTS } from "@/components/marketing/midia";
import type { TranslationKey, Translator } from "@/lib/i18n/translate";

const FALHAS: Array<{ fala: TranslationKey; consequencia: TranslationKey }> = [
  { fala: "landing.problem.q1", consequencia: "landing.problem.a1" },
  { fala: "landing.problem.q2", consequencia: "landing.problem.a2" },
  { fala: "landing.problem.q3", consequencia: "landing.problem.a3" },
  { fala: "landing.problem.q4", consequencia: "landing.problem.a4" },
  { fala: "landing.problem.q5", consequencia: "landing.problem.a5" },
];

export function Problema({ t }: { t: Translator }) {
  return (
    <Secao id="problema" km="12" rotulo={t("landing.problem.marker")}>
      <div className="fr-duas-colunas">
        <div>
          <h2 className="fr-h2" id="problema-titulo">
            {t("landing.problem.title")}
            <br />
            <span className="fr-forte">{t("landing.problem.titleStrong")}</span>
          </h2>
          <p className="fr-lead" style={{ marginTop: "1.25rem" }}>
            {t("landing.problem.lead")}
          </p>
        </div>
        <div data-reveal>
          <SlotImagemView
            slot={SLOTS.pave}
            rotulo={t("landing.problem.photo")}
            parallax={0.14}
          />
        </div>
      </div>

      <ul className="fr-falhas" style={{ marginTop: "3rem" }}>
        {FALHAS.map((f) => (
          <li className="fr-falhas__item" key={f.fala}>
            <p className="fr-falhas__fala">{t(f.fala)}</p>
            <p className="fr-body">{t(f.consequencia)}</p>
          </li>
        ))}
      </ul>
    </Secao>
  );
}
