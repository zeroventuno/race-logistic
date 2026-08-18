import { LOCALES, LOCALE_META } from "@/lib/i18n/config";
import { CONTATO_EMAIL } from "@/brand/contato";
import { Assinatura } from "@/components/marketing/marca";
import { Contato } from "@/components/marketing/Contato";
import type { Translator } from "@/lib/i18n/translate";

/**
 * O rodapé, que aqui é o fecho comercial e não uma lista de links.
 *
 * O QUE SAIU, E POR QUÊ. Havia uma coluna "Entrar" com três links — direção,
 * criar conta, motorista com código. Os três repetiam, palavra por palavra, as
 * duas portas da seção logo acima. Link repetido não é navegação redundante por
 * segurança: é uma segunda chance de a pessoa clicar no lugar errado, e um
 * rodapé mais alto para rolar.
 *
 * Saiu também o selo do TRAKR. Um diretor de prova lendo "ciclo de venda e
 * regras próprias" sobre um produto que ainda não existe publicamente não ganha
 * informação nenhuma — ganha a dúvida de estar comprando o subproduto de outra
 * coisa. A marca volta quando houver o que ela endosse.
 *
 * O QUE ENTROU. O contato, que é a única ponte entre "gostei" e "falo com
 * quem": não há preço nesta página, não há pagamento, e o ciclo de venda deste
 * produto começa numa conversa. Sem isto a página termina num beco.
 *
 * OS IDIOMAS FICARAM, com outra moldura. Antes diziam "o app do motorista
 * fala", o que deixou de ser verdade quando o site inteiro passou a falar as
 * seis. Agora são a PROVA do argumento 06 — os nomes escritos na própria
 * língua, no pé da página que acabou de afirmar isso.
 */
export function Rodape({ t }: { t: Translator }) {
  return (
    <footer className="fr-rodape">
      <div className="fr-shell fr-rodape__grade">
        <div className="fr-rodape__contato">
          <span className="fr-eyebrow">{t("landing.contact.eyebrow")}</span>
          <h2 className="fr-h3 fr-rodape__titulo">
            {t("landing.contact.title")}
          </h2>
          <p className="fr-body" style={{ maxWidth: "44ch" }}>
            {t("landing.contact.body")}
          </p>

          <Contato email={CONTATO_EMAIL} />

          {/* O endereço fica VISÍVEL ao lado do formulário, e não escondido
              atrás dele. Metade de quem organiza prova responde do próprio
              cliente de e-mail e desconfia de caixa de texto que engole a
              mensagem — para essa pessoa, ver o endereço é ver que existe
              alguém do outro lado. */}
          <p className="fr-rodape__ou">
            {t("landing.contact.orWrite")}{" "}
            <a href={`mailto:${CONTATO_EMAIL}`} className="fr-rodape__email">
              {CONTATO_EMAIL}
            </a>
          </p>
        </div>

        <div className="fr-rodape__marca">
          {/* O rodapé é noite: sem a cor explícita, o letreiro herdaria o
              cinza de 62% do corpo e viraria uma mancha. */}
          <Assinatura size={34} color="#f6f5f2" />
          <p className="fr-body" style={{ maxWidth: "30ch" }}>
            {t("landing.footer.tagline")}
          </p>

          <div className="fr-rodape__idiomas">
            <span className="fr-eyebrow">{t("landing.footer.languages")}</span>
            <ul className="fr-idiomas">
              {LOCALES.map((l) => (
                <li className="fr-idioma" key={l}>
                  {LOCALE_META[l].nativeName}
                </li>
              ))}
            </ul>
            <p className="fr-rodape__nota">{t("landing.footer.languagesNote")}</p>
          </div>
        </div>
      </div>

      {/* Numa linha própria, abaixo da grade: crédito de autoria não é uma
          terceira coluna. Ele fecha a página. */}
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
