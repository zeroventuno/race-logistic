import { de } from "@/lib/i18n/dictionaries/de";
import { en } from "@/lib/i18n/dictionaries/en";
import { es } from "@/lib/i18n/dictionaries/es";
import { fr } from "@/lib/i18n/dictionaries/fr";
import { it } from "@/lib/i18n/dictionaries/it";
import { ptBR, type Dictionary } from "@/lib/i18n/dictionaries/pt-BR";
import type { Locale } from "@/lib/i18n/config";

export const DICTIONARIES: Record<Locale, Dictionary> = {
  "pt-BR": ptBR,
  it,
  en,
  fr,
  es,
  de,
};

/**
 * Todos os caminhos de chave que terminam numa string.
 *
 * É isto que faz `t("alerts.dispatch.onMyWy")` virar erro de compilação em vez
 * de aparecer como texto cru na tela do motorista. Vale a complexidade do tipo:
 * o modo de falha que ele elimina — string faltando descoberta em produção, num
 * idioma que ninguém da equipe fala — é exatamente o que torna software
 * multi-idioma frágil.
 */
type LeafPaths<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string
        ? K
        : `${K}.${LeafPaths<T[K]>}`;
    }[keyof T & string];

export type TranslationKey = LeafPaths<Dictionary>;

export type TranslationVars = Record<string, string | number>;

/**
 * Resolve uma chave e interpola as variáveis.
 *
 * Falha de forma barulhenta em desenvolvimento e silenciosa em produção: uma
 * chave faltando não pode derrubar o painel no meio de uma prova, mas também
 * não pode passar despercebida enquanto se está construindo.
 */
export function translate(
  dict: Dictionary,
  key: TranslationKey,
  vars?: TranslationVars,
): string {
  const raw = resolve(dict, key);

  if (raw === null) {
    if (process.env.NODE_ENV !== "production") {
      throw new Error(`Chave de tradução inexistente: ${key}`);
    }
    return key;
  }

  return vars ? interpolate(raw, vars) : raw;
}

function resolve(dict: Dictionary, key: string): string | null {
  let node: unknown = dict;

  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return null;
    node = (node as Record<string, unknown>)[part];
  }

  return typeof node === "string" ? node : null;
}

/**
 * Substitui `{nome}` pelos valores fornecidos.
 *
 * Um marcador sem valor correspondente permanece visível como `{nome}` em vez
 * de virar "undefined" ou string vazia. Numa tela operacional, um buraco óbvio
 * é melhor que uma frase que parece completa e está errada.
 */
function interpolate(template: string, vars: TranslationVars): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

/** Cria uma função `t` já presa a um idioma. */
export function createTranslator(locale: Locale) {
  const dict = DICTIONARIES[locale];
  return (key: TranslationKey, vars?: TranslationVars) =>
    translate(dict, key, vars);
}

export type Translator = ReturnType<typeof createTranslator>;
