/**
 * As duas telas.
 *
 * As capturas entram emolduradas e sobre fundo escuro dentro da moldura,
 * porque é assim que o produto é: o painel fica seis horas ligado numa sala de
 * direção, muitas vezes projetado, e ali o escuro é ergonomia. Clarear a
 * captura para "combinar" com a landing seria mostrar um produto que não
 * existe.
 *
 * E o vermelho que aparecer nessas imagens não é decoração da página. Dentro
 * do produto vermelho quer dizer uma coisa só — alguém precisa de socorro. Se
 * uma captura for retocada para o vermelho ficar mais bonito no site, ela
 * passa a mentir sobre a única cor que não pode mentir.
 */

import { SlotImagemView } from "@/components/marketing/SlotMidia";
import { Secao } from "@/components/marketing/Secao";
import { SLOTS } from "@/components/marketing/midia";
import type { TranslationKey, Translator } from "@/lib/i18n/translate";

const PAINEL: TranslationKey[] = [
  "landing.screens.p1",
  "landing.screens.p2",
  "landing.screens.p3",
  "landing.screens.p4",
];

const APP: TranslationKey[] = [
  "landing.screens.a1",
  "landing.screens.a2",
  "landing.screens.a3",
  "landing.screens.a4",
];

export function DuasTelas({ t }: { t: Translator }) {
  return (
    <Secao id="telas" km="124" rotulo={t("landing.screens.marker")}>
      <h2 className="fr-h2" id="telas-titulo">
        {t("landing.screens.title")}
        <br />
        <span className="fr-forte">{t("landing.screens.titleStrong")}</span>
      </h2>

      <div className="fr-telas" style={{ marginTop: "2.5rem" }}>
        <article className="fr-tela" data-reveal>
          <SlotImagemView
            slot={SLOTS.painel}
            rotulo={t("landing.screens.panelCapture")}
          />
          <div className="fr-tela__texto">
            <span className="fr-eyebrow">
              {t("landing.screens.panelEyebrow")}
            </span>
            <h3 className="fr-h3">{t("landing.screens.panelTitle")}</h3>
            <ul className="fr-marcadores">
              {PAINEL.map((item) => (
                <li key={item}>{t(item)}</li>
              ))}
            </ul>
          </div>
        </article>

        <article className="fr-tela fr-tela--app" data-reveal>
          <SlotImagemView
            slot={SLOTS.app}
            rotulo={t("landing.screens.appCapture")}
            className="fr-slot--telefone"
          />
          <div className="fr-tela__texto">
            <span className="fr-eyebrow">{t("landing.screens.appEyebrow")}</span>
            <h3 className="fr-h3">{t("landing.screens.appTitle")}</h3>
            <ul className="fr-marcadores">
              {APP.map((item) => (
                <li key={item}>{t(item)}</li>
              ))}
            </ul>
          </div>
        </article>
      </div>
    </Secao>
  );
}
