/**
 * Idiomas.
 *
 * Seis idiomas cobrem praticamente todo o ciclismo de estrada organizado:
 * português (Brasil e Portugal), italiano, inglês, francês, espanhol e alemão.
 *
 * DECISÃO DE ARQUITETURA: o idioma NÃO vai na URL.
 *
 * A escolha usual em Next.js é `/it/dashboard`, `/fr/dashboard`. Aqui isso
 * seria pior, por causa de quem usa o app. O diretor manda um único link (ou um
 * QR impresso) para todos os motoristas da prova — e numa prova internacional
 * esses motoristas são italianos, franceses e alemães ao mesmo tempo. Um link
 * com idioma fixo entrega a língua errada para a maioria deles. Detectar pelo
 * `Accept-Language` do aparelho entrega a língua certa para cada um a partir
 * do MESMO link, que é o que a operação precisa.
 *
 * A preferência explícita, quando existe, vence a detecção e é guardada em
 * cookie. `?lang=xx` na URL força e persiste — serve para o diretor testar como
 * o motorista alemão vê a tela, e para suporte por telefone.
 */

export const LOCALES = ["pt-BR", "it", "en", "fr", "es", "de"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "race_locale";

export interface LocaleMeta {
  /** Nome do idioma NA PRÓPRIA LÍNGUA — é assim que se monta um seletor. */
  nativeName: string;
  /** Tag BCP-47 completa, para as APIs de Intl. */
  intlTag: string;
  flag: string;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  "pt-BR": { nativeName: "Português", intlTag: "pt-BR", flag: "🇧🇷" },
  it: { nativeName: "Italiano", intlTag: "it-IT", flag: "🇮🇹" },
  en: { nativeName: "English", intlTag: "en-GB", flag: "🇬🇧" },
  fr: { nativeName: "Français", intlTag: "fr-FR", flag: "🇫🇷" },
  es: { nativeName: "Español", intlTag: "es-ES", flag: "🇪🇸" },
  de: { nativeName: "Deutsch", intlTag: "de-DE", flag: "🇩🇪" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Escolhe o melhor idioma a partir do cabeçalho `Accept-Language`.
 *
 * Implementa a negociação de verdade — com peso `q` e com correspondência por
 * idioma-base. Isso importa: um celular configurado em `pt-PT` tem que cair em
 * `pt-BR` (a mesma língua) em vez de despencar para o inglês, e um aparelho
 * pedindo `de-AT,de;q=0.9,en;q=0.5` tem que receber alemão.
 */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const entries = acceptLanguage
    .split(",")
    .map((part) => {
      const [tagRaw, ...params] = part.trim().split(";");
      const tag = tagRaw?.trim().toLowerCase();
      if (!tag) return null;

      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.split("=")[1] ?? "1") : 1;

      return { tag, q: Number.isFinite(q) ? q : 0 };
    })
    .filter((e): e is { tag: string; q: number } => e !== null && e.q > 0)
    .sort((a, b) => b.q - a.q);

  const supported = LOCALES.map((l) => ({ locale: l, lower: l.toLowerCase() }));

  for (const entry of entries) {
    if (entry.tag === "*") return DEFAULT_LOCALE;

    // Correspondência exata: "pt-br" → "pt-BR".
    const exact = supported.find((s) => s.lower === entry.tag);
    if (exact) return exact.locale;

    // Correspondência pela língua base: "pt-pt" e "pt" → "pt-BR";
    // "de-at" → "de".
    const base = entry.tag.split("-")[0];
    const byBase = supported.find((s) => s.lower.split("-")[0] === base);
    if (byBase) return byBase.locale;
  }

  return DEFAULT_LOCALE;
}
