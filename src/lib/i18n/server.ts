import "server-only";

import { cookies, headers } from "next/headers";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  negotiateLocale,
  type Locale,
} from "@/lib/i18n/config";
import { createTranslator, type Translator } from "@/lib/i18n/translate";

/**
 * Idioma da requisição atual, em ordem de precedência:
 *
 *   1. cookie — escolha explícita já feita pela pessoa
 *   2. Accept-Language — o que o aparelho dela declara
 *   3. padrão
 *
 * A ordem importa: uma vez que alguém escolheu, a escolha manda, mesmo que o
 * aparelho diga outra coisa. É comum um motorista usar o celular configurado em
 * inglês e preferir a interface na própria língua.
 */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;

  if (isLocale(fromCookie)) return fromCookie;

  try {
    const headerStore = await headers();
    return negotiateLocale(headerStore.get("accept-language"));
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** Tradutor pronto para uso em Server Components. */
export async function getTranslator(): Promise<{
  locale: Locale;
  t: Translator;
}> {
  const locale = await getLocale();
  return { locale, t: createTranslator(locale) };
}
