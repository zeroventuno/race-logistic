"use client";

import { useEffect, useRef } from "react";

import { useI18n } from "@/lib/i18n/client";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/config";

/**
 * Troca o idioma da interface.
 *
 * POR QUE ELE PRECISA EXISTIR, se o sistema já negocia sozinho pelo aparelho:
 * porque a negociação acerta o caso comum e erra o caso da pessoa. O motorista
 * italiano com o celular em italiano recebe italiano — perfeito, é o motivo de
 * o mesmo QR servir para a equipe inteira. Mas o brasileiro que mora na Itália
 * e tem o iPhone configurado em inglês recebe inglês, e não há nada de errado
 * com o aparelho dele: há uma suposição errada nossa de que língua do sistema
 * é língua de preferência.
 *
 * Apareceu em teste de campo exatamente assim: o site em português e o app do
 * motorista em inglês, no mesmo celular.
 *
 * É UM `<select>` NATIVO, de propósito. No celular ele abre a roda do sistema,
 * que é grande, tem busca por letra e funciona com luva — três coisas que um
 * menu desenhado por nós teria que reconstruir para ficar pior. E os nomes vêm
 * na PRÓPRIA língua ("Deutsch", não "Alemão"): quem procura a língua dele não
 * sabe como ela se escreve na nossa.
 *
 * O `autoComplete="off"` e o efeito abaixo não são paranoia: trocar de idioma
 * recarrega a página, e ao RECARREGAR (não ao navegar) o navegador restaura
 * sozinho o que estava escolhido em cada campo de formulário. O resultado é a
 * tela inteira num idioma e o seletor mostrando outro — o valor antigo,
 * ressuscitado pelo navegador por cima do que o React escreveu. Foi exatamente
 * isso que apareceu em teste. O atributo pede ao navegador que não restaure;
 * o efeito conserta o caso em que ele restaura assim mesmo, depois da
 * hidratação, quando o React já não vai reescrever nada por conta própria.
 */

export function SeletorIdioma({
  className,
  /** Rótulo acessível. A tela decide se mostra texto ao lado. */
  rotulo = "Idioma",
}: {
  className?: string;
  rotulo?: string;
}) {
  const { locale, setLocale } = useI18n();
  const ref = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && el.value !== locale) el.value = locale;
  }, [locale]);

  return (
    <label className={`inline-flex items-center ${className ?? ""}`}>
      <span className="sr-only">{rotulo}</span>
      <select
        ref={ref}
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={rotulo}
        autoComplete="off"
        className="min-h-9 border border-border bg-transparent px-2 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-muted transition hover:border-border-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-info"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_META[l].flag} {LOCALE_META[l].nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
