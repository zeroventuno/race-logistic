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
    <footer
      className="fr-rodape"
      /*
       * O ÚLTIMO CAPÍTULO DO ROAD BOOK.
       *
       * A placa fixa no canto da tela lê este atributo de qualquer elemento
       * que o declare — não só das seções. Sem ele, quem chega ao rodapé
       * continua vendo "KM 148 — FLAMME ROUGE" no canto, que é onde ele
       * estava um instante atrás.
       */
      data-capitulo={`KM 149 — ${t("landing.footer.marker").toUpperCase()}`}
    >
      {/*
       * A ESTRADA REABRINDO, que é a última coisa que a página mostra.
       *
       * A página abre de dentro da moto de abertura, POV de quem dirige a
       * prova, e fecha atrás do carro de fechamento indo embora. Não é
       * simetria bonita: a passagem do fechamento é o que devolve a via ao
       * trânsito, e é exatamente isso que este sistema existe para medir. O
       * arco visual é o arco do produto.
       *
       * DECORATIVA, e por isso `alt` vazio. Quem usa leitor de tela perde
       * atmosfera, não informação — tudo que a imagem diz já está escrito ao
       * lado. Descrevê-la seria acrescentar um parágrafo de fotografia no
       * meio de um formulário de contato.
       */}
      <div className="fr-rodape__estrada" aria-hidden="true">
        <picture>
          <source
            type="image/avif"
            sizes="(min-width: 60rem) 55vw, 100vw"
            srcSet="/marketing/reabre-900.avif 900w, /marketing/reabre-1536.avif 1536w"
          />
          <source
            type="image/webp"
            sizes="(min-width: 60rem) 55vw, 100vw"
            srcSet="/marketing/reabre-900.webp 900w, /marketing/reabre-1536.webp 1536w"
          />
          <img
            src="/marketing/reabre-1536.webp"
            alt=""
            width={1536}
            height={1024}
            // Está abaixo da dobra por definição: quem chega no rodapé rolou a
            // página inteira, e carregá-la antes disso rouba banda da primeira
            // tela num celular no estacionamento do evento.
            loading="lazy"
            decoding="async"
          />
        </picture>
      </div>

      <div className="fr-shell">
        {/*
         * KM 149. A página é lida como um road book, de KM 000 na largada até
         * o flamme rouge no KM 148 — e faltava a linha depois da chegada.
         *
         * "Via reaberta" não é frase de efeito: é o estado final que este
         * sistema existe para produzir. A prova passou, o carro de fechamento
         * passou, a estrada voltou a ser estrada. É a mesma coisa que a foto
         * atrás diz sem palavra nenhuma.
         *
         * A placa fica NEUTRA, e não em rouge. O rouge é do flamme rouge, uma
         * seção acima; duas placas vermelhas seguidas gastariam a única que
         * precisava ter peso.
         */}
        <div className="fr-marco fr-rodape__marco">
          <span className="fr-marco__km">KM 149</span>
          <span className="fr-marco__label">{t("landing.footer.marker")}</span>
          <span className="fr-marco__rule" aria-hidden="true" />
        </div>
      </div>

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
