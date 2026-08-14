import { describe, expect, it } from "vitest";

import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_META,
  isLocale,
  negotiateLocale,
} from "@/lib/i18n/config";
import {
  formatAge,
  formatClock,
  formatDistance,
  formatDuration,
  formatSpeed,
} from "@/lib/i18n/format";
import { DICTIONARIES, createTranslator, translate } from "@/lib/i18n/translate";

describe("negociação de idioma", () => {
  it("respeita correspondência exata", () => {
    expect(negotiateLocale("pt-BR")).toBe("pt-BR");
    expect(negotiateLocale("de")).toBe("de");
  });

  it("cai na língua base quando a região não é suportada", () => {
    // Um celular português tem que receber português, não inglês.
    expect(negotiateLocale("pt-PT")).toBe("pt-BR");
    // Alemão da Áustria e da Suíça.
    expect(negotiateLocale("de-AT")).toBe("de");
    expect(negotiateLocale("de-CH")).toBe("de");
    // Inglês americano.
    expect(negotiateLocale("en-US")).toBe("en");
    // Espanhol da Argentina.
    expect(negotiateLocale("es-AR")).toBe("es");
    // Francês do Canadá.
    expect(negotiateLocale("fr-CA")).toBe("fr");
  });

  it("respeita os pesos q", () => {
    // Sueco não é suportado; apesar de vir primeiro, alemão ganha.
    expect(negotiateLocale("sv-SE,sv;q=0.9,de;q=0.8,en;q=0.5")).toBe("de");
    // Aqui o inglês tem peso maior que o italiano.
    expect(negotiateLocale("it;q=0.3,en;q=0.9")).toBe("en");
  });

  it("cai no padrão para idioma desconhecido, curinga ou entrada vazia", () => {
    expect(negotiateLocale("ja-JP,ja;q=0.9")).toBe(DEFAULT_LOCALE);
    expect(negotiateLocale("*")).toBe(DEFAULT_LOCALE);
    expect(negotiateLocale("")).toBe(DEFAULT_LOCALE);
    expect(negotiateLocale(null)).toBe(DEFAULT_LOCALE);
  });

  it("não quebra com cabeçalho malformado", () => {
    expect(() => negotiateLocale(";;;q=")).not.toThrow();
    expect(() => negotiateLocale("en;q=abc")).not.toThrow();
    expect(() => negotiateLocale(",,,")).not.toThrow();
    expect(negotiateLocale("en;q=abc")).toBe("en");
  });

  it("isLocale rejeita lixo", () => {
    expect(isLocale("pt-BR")).toBe(true);
    expect(isLocale("pt")).toBe(false);
    expect(isLocale("")).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(42)).toBe(false);
  });
});

describe("completude dos dicionários", () => {
  /** Todos os caminhos até folhas string de um objeto aninhado. */
  function paths(obj: unknown, prefix = ""): string[] {
    if (typeof obj === "string") return [prefix];
    if (typeof obj !== "object" || obj === null) return [];

    return Object.entries(obj).flatMap(([k, v]) =>
      paths(v, prefix ? `${prefix}.${k}` : k),
    );
  }

  const reference = paths(DICTIONARIES["pt-BR"]).sort();

  it("tem pelo menos uma centena de chaves — senão o teste não prova nada", () => {
    expect(reference.length).toBeGreaterThan(100);
  });

  for (const locale of LOCALES) {
    it(`${locale} tem exatamente as mesmas chaves da referência`, () => {
      const actual = paths(DICTIONARIES[locale]).sort();

      const missing = reference.filter((k) => !actual.includes(k));
      const extra = actual.filter((k) => !reference.includes(k));

      expect(missing, `faltando em ${locale}`).toEqual([]);
      expect(extra, `sobrando em ${locale}`).toEqual([]);
    });

    it(`${locale} não tem string vazia nem sobra de português`, () => {
      const dict = DICTIONARIES[locale];

      for (const key of reference) {
        const value = key
          .split(".")
          .reduce<unknown>((n, p) => (n as Record<string, unknown>)?.[p], dict);

        expect(typeof value, `${locale}:${key}`).toBe("string");
        expect((value as string).trim().length, `${locale}:${key}`).toBeGreaterThan(0);
      }
    });

    it(`${locale} preserva todos os marcadores de interpolação`, () => {
      // Um marcador perdido na tradução vira informação faltando na tela: o
      // alemão que lê "Fahrzeug(e) ohne Gerät" sem o número não sabe quantos.
      const dict = DICTIONARIES[locale];

      for (const key of reference) {
        const ref = key
          .split(".")
          .reduce<unknown>(
            (n, p) => (n as Record<string, unknown>)?.[p],
            DICTIONARIES["pt-BR"],
          ) as string;

        const translated = key
          .split(".")
          .reduce<unknown>((n, p) => (n as Record<string, unknown>)?.[p], dict) as string;

        const placeholders = (s: string) =>
          [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

        expect(placeholders(translated), `${locale}:${key}`).toEqual(
          placeholders(ref),
        );
      }
    });
  }

  it("todo idioma tem metadados de exibição", () => {
    for (const locale of LOCALES) {
      expect(LOCALE_META[locale].nativeName.length).toBeGreaterThan(0);
      expect(LOCALE_META[locale].intlTag).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    }
  });
});

describe("interpolação", () => {
  const t = createTranslator("pt-BR");

  it("substitui as variáveis", () => {
    expect(t("driver.boundAs", { position: "Moto 3", race: "Giro" })).toBe(
      "Você é Moto 3 em Giro",
    );
  });

  it("deixa marcador sem valor visível em vez de virar undefined", () => {
    const out = t("driver.boundAs", { position: "Moto 3" });
    expect(out).toContain("{race}");
    expect(out).not.toContain("undefined");
  });

  it("aceita número", () => {
    expect(t("positions.title")).toBeTruthy();
    expect(t("director.needsBinding", { count: 3 })).toContain("3");
  });

  it("lança em desenvolvimento se a chave não existe", () => {
    expect(() =>
      // @ts-expect-error chave inexistente de propósito
      translate(DICTIONARIES["pt-BR"], "nao.existe"),
    ).toThrow(/inexistente/);
  });
});

describe("formatação por idioma", () => {
  it("distância muda de separador conforme o idioma", () => {
    // Alemão usa vírgula decimal, inglês usa ponto.
    expect(formatDistance(1234, "de")).toContain("1,23");
    expect(formatDistance(1234, "en")).toContain("1.23");
  });

  it("distância abaixo de 1 km sai em metros arredondados", () => {
    expect(formatDistance(847, "pt-BR")).toBe("850 m");
    expect(formatDistance(0, "pt-BR")).toBe("0 m");
  });

  it("distância reduz casas conforme cresce", () => {
    expect(formatDistance(5_000, "en")).toBe("5.00 km");
    expect(formatDistance(54_900, "en")).toBe("54.9 km");
    expect(formatDistance(154_900, "en")).toBe("155 km");
  });

  it("nulo e não-finito viram travessão em vez de NaN", () => {
    for (const locale of LOCALES) {
      expect(formatDistance(null, locale)).toBe("—");
      expect(formatDuration(null, locale)).toBe("—");
      expect(formatSpeed(null, locale)).toBe("—");
      expect(formatDistance(NaN, locale)).toBe("—");
      expect(formatDuration(Infinity, locale)).toBe("—");
      expect(formatAge(null, locale)).toBe("—");
      expect(formatClock(null, locale, "Europe/Rome")).toBe("—");
      expect(formatClock("data-invalida", locale, "Europe/Rome")).toBe("—");
    }
  });

  it("duração escolhe a unidade certa em todos os idiomas", () => {
    for (const locale of LOCALES) {
      expect(formatDuration(45, locale)).toMatch(/45/);
      expect(formatDuration(23 * 60, locale)).toMatch(/23/);
      expect(formatDuration(64 * 60, locale)).toMatch(/1/);
      // 1 h 04 → o "04" com zero à esquerda tem que aparecer.
      expect(formatDuration(64 * 60, locale)).toContain("04");
    }
  });

  it("velocidade negativa é tratada como zero, não como número negativo", () => {
    expect(formatSpeed(-5, "en")).toMatch(/^0/);
  });

  it("hora usa o fuso DA PROVA, não o do processo", () => {
    // 12:00 UTC é 14:00 em Roma no horário de verão.
    const noonUtc = "2026-08-14T12:00:00Z";
    expect(formatClock(noonUtc, "it", "Europe/Rome")).toBe("14:00");
    expect(formatClock(noonUtc, "pt-BR", "America/Sao_Paulo")).toBe("09:00");
    expect(formatClock(noonUtc, "en", "UTC")).toBe("12:00");
  });

  it("hora sempre em 24 h, inclusive em inglês", () => {
    // Direção de prova fala em 24 h. "2 PM" no rádio é ambíguo e perigoso.
    const evening = "2026-08-14T18:30:00Z";
    expect(formatClock(evening, "en", "UTC")).toBe("18:30");
    expect(formatClock(evening, "en", "UTC")).not.toMatch(/PM/i);
  });
});
