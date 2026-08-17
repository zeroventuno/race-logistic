import Link from "next/link";

import { Creditos } from "@/components/Creditos";
import { I18nProvider } from "@/lib/i18n/client";
import { createTranslator } from "@/lib/i18n/translate";
import { DEFAULT_TIMEZONE } from "@/app/(director)/_lib/timezone";
import type { Locale } from "@/lib/i18n/config";
import { Letreiro } from "@/components/Letreiro";
import { SeletorIdioma } from "@/components/SeletorIdioma";
import { TemaBotao } from "@/components/TemaBotao";
import type { Tema } from "@/lib/tema";

/**
 * A porta da direção: a casca de duas colunas do login e do cadastro.
 *
 * A COLUNA DA ESQUERDA É A ÚNICA IMAGEM DO PRODUTO. Passada esta tela, o
 * sistema é tipografia e mapa — nenhuma fotografia, porque nenhuma
 * acrescentaria informação a quem está operando. Aqui ela acrescenta: quem
 * chega no login às seis da manhã do dia da prova, ou na véspera montando
 * tudo, é a mesma pessoa que vai estar naquela estrada. A foto diz de que
 * mundo é este software antes de qualquer palavra.
 *
 * Ela é DESSATURADA e a 42% de opacidade de propósito. Uma foto colorida em
 * meia tela ao lado de um formulário compete com o formulário; em cinza ela
 * vira textura e o olho vai direto para o campo de e-mail — que é a única
 * coisa que a pessoa veio fazer aqui.
 *
 * ESTA É A ÚNICA TELA DO PRODUTO COM O ROUGE DA MARCA (no botão, via
 * `variant="marca"` do formulário). Passada a porta, vermelho é uma pessoa no
 * chão e nada mais.
 */

export interface PortaDaDirecaoProps {
  /** Entrar ou criar conta. Decide o título e a frase de apoio. */
  modo: "login" | "cadastro";
  tema: Tema;
  /**
   * Idioma negociado no servidor.
   *
   * Entrar e criar conta estão FORA do grupo `(director)`, então não herdam o
   * provedor de i18n dele — e sem provedor o seletor de idioma derruba a tela.
   * A porta monta o seu próprio.
   *
   * O fuso é o padrão: aqui ainda não existe prova, e portanto não existe fuso
   * de prova. Quem tem fuso próprio é cada evento, lá dentro.
   */
  locale: Locale;
  children: React.ReactNode;
}

export function PortaDaDirecao({
  modo,
  tema,
  locale,
  children,
}: PortaDaDirecaoProps) {
  // A casca é componente de servidor mas não recebe o tradutor de fora: ela é
  // montada por duas páginas diferentes e já precisa do idioma para o provedor.
  // Construir o tradutor a partir dele evita passar a mesma coisa duas vezes.
  const t = createTranslator(locale);
  const ehCadastro = modo === "cadastro";

  return (
    <I18nProvider locale={locale} timeZone={DEFAULT_TIMEZONE}>
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_0.95fr]">
      {/* A coluna da foto some no celular: metade de uma tela de 375 px é
          espaço que o formulário precisa mais do que a atmosfera. */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0c0f12] p-11 lg:flex lg:p-12">
        <picture>
          <source
            type="image/avif"
            sizes="(min-width: 1024px) 55vw, 100vw"
            srcSet="/marketing/heroi-900.avif 900w, /marketing/heroi-1536.avif 1536w"
          />
          <img
            src="/marketing/heroi-1536.webp"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-[center_44%] opacity-[0.42] [filter:grayscale(1)_contrast(1.06)]"
          />
        </picture>

        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgb(12 15 18 / 0.72), rgb(12 15 18 / 0.94))",
          }}
        />

        {/* A bandeirinha em rouge aparece AQUI e na porta ao lado, e em
            lugar nenhum depois. Do outro lado do login vermelho é uma pessoa
            no chão — e uma marca vermelha no topo de toda tela ensinaria o
            olho a filtrar exatamente a cor que não pode ser filtrada. */}
        <div className="relative text-[rgb(246_245_242/0.9)]">
          <Letreiro tom="rouge" size={15} />
        </div>

        <div className="relative max-w-[29rem]">
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.26em] text-[rgb(246_245_242/0.5)]">
            {t("director.areaOverline")}
          </p>
          <p className="mt-4 font-[family-name:var(--font-wordmark)] text-[2.75rem] font-light leading-[1.04] text-[#f6f5f2]">
            {t("auth.gateTitle")}
            <br />
            <span className="font-bold">{t("auth.gateTitleStrong")}</span>
          </p>
        </div>

        <p className="relative flex flex-wrap gap-x-7 gap-y-2 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-[rgb(246_245_242/0.44)]">
          <span>{t("race.route")}</span>
          <span>{t("race.positions")}</span>
          <span>{t("auth.gateCodes")}</span>
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-[24.5rem]">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="text-ink-faint transition hover:text-ink"
              aria-label={t("landing.nav.home")}
            >
              <Letreiro tom="rouge" size={13} />
            </Link>
            <div className="flex items-center gap-2">
              <SeletorIdioma />
              <TemaBotao inicial={tema} />
            </div>
          </div>

          <h1 className="titulo mt-7 text-[2.75rem] font-bold leading-[1.02] text-ink">
            {ehCadastro ? t("auth.signUpLink") : t("auth.loginTitle")}
          </h1>
          <p className="mt-3 max-w-[21rem] text-[0.96875rem] leading-relaxed text-ink-muted">
            {ehCadastro ? t("auth.signupSubtitle") : t("auth.loginSubtitle")}
          </p>

          <div className="mt-8">{children}</div>

          <Creditos className="mt-10" />
        </div>
      </div>
    </main>
    </I18nProvider>
  );
}
