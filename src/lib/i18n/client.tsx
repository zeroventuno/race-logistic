"use client";

import { createContext, useCallback, useContext, useMemo } from "react";

import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import {
  createTranslator,
  type TranslationKey,
  type TranslationVars,
} from "@/lib/i18n/translate";
import {
  formatAge,
  formatClock,
  formatDateTime,
  formatDistance,
  formatDuration,
  formatSpeed,
} from "@/lib/i18n/format";

interface I18nValue {
  locale: Locale;
  /** Fuso da prova — toda hora exibida usa este fuso, não o do aparelho. */
  timeZone: string;
  t: (key: TranslationKey, vars?: TranslationVars) => string;
  fmt: {
    distance: (meters: number | null) => string;
    duration: (seconds: number | null) => string;
    speed: (mps: number | null) => string;
    clock: (value: string | number | Date | null, withSeconds?: boolean) => string;
    dateTime: (value: string | number | Date | null) => string;
    age: (ageSeconds: number | null) => string;
  };
  setLocale: (next: Locale) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  timeZone,
  children,
}: {
  locale: Locale;
  timeZone: string;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nValue>(() => {
    const t = createTranslator(locale);

    return {
      locale,
      timeZone,
      t,
      fmt: {
        distance: (m) => formatDistance(m, locale),
        duration: (s) => formatDuration(s, locale),
        speed: (v) => formatSpeed(v, locale),
        clock: (v, withSeconds) =>
          formatClock(v, locale, timeZone, { withSeconds }),
        dateTime: (v) => formatDateTime(v, locale, timeZone),
        age: (s) => formatAge(s, locale),
      },
      setLocale: (next) => {
        // Um ano de validade: a escolha de idioma não deve evaporar entre uma
        // prova e a próxima.
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
        window.location.reload();
      },
    };
  }, [locale, timeZone]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n precisa estar dentro de <I18nProvider>.");
  }
  return ctx;
}

/** Atalho para quem só precisa traduzir. */
export function useT() {
  return useI18n().t;
}

/**
 * Formatadores memoizados.
 *
 * Criar um `Intl.NumberFormat` é caro, e estes formatadores rodam por veículo,
 * por linha, a cada atualização de posição. Num painel com 15 veículos
 * atualizando a cada 3 s isso é muita alocação desnecessária.
 */
export function useFormat() {
  const { fmt } = useI18n();
  return fmt;
}

/** Persiste a escolha de idioma. */
export function useLocaleSwitcher() {
  const { locale, setLocale } = useI18n();
  return { locale, setLocale: useCallback(setLocale, [setLocale]) };
}
