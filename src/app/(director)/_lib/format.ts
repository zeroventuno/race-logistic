import { LOCALE_META, type Locale } from "@/lib/i18n/config";
import type { RaceStatus } from "@/lib/types";

/**
 * Formatação específica das telas de preparação.
 *
 * Distância, duração, velocidade e horário NÃO estão aqui: eles vivem em
 * `src/lib/i18n/format.ts`, sensíveis ao idioma, e é de lá que toda tela pega.
 * Ter duas implementações de "quantos quilômetros" foi exatamente o que este
 * arquivo deixou de fazer.
 *
 * O que sobrou são as coisas que só existem no cadastro: ganho de elevação
 * (que é uma altura, não uma distância percorrida — formatá-lo como distância
 * viraria "1,16 km de subida"), contagens e normalização de entrada.
 */

function tag(locale: Locale): string {
  return LOCALE_META[locale].intlTag;
}

/**
 * Ganho de elevação. O sinal de mais é o que evita confundir com a altitude do
 * ponto mais alto — são dois números diferentes que a mesma unidade esconde.
 */
export function formatElevationGain(
  meters: number | null | undefined,
  locale: Locale,
): string {
  if (meters == null || !Number.isFinite(meters)) return "—";
  return `+${new Intl.NumberFormat(tag(locale), {
    maximumFractionDigits: 0,
  }).format(meters)} m`;
}

export function formatInteger(value: number, locale: Locale): string {
  return new Intl.NumberFormat(tag(locale)).format(value);
}

/** Só a data, para listas onde a hora não cabe. */
export function formatRaceDate(
  iso: string | null,
  locale: Locale,
  timeZone: string,
): string {
  if (!iso) return "—";
  const instante = new Date(iso);
  if (!Number.isFinite(instante.getTime())) return "—";

  return new Intl.DateTimeFormat(tag(locale), {
    timeZone,
    dateStyle: "medium",
  }).format(instante);
}

/**
 * Data e hora no fuso da PROVA.
 *
 * O relatório congelado carrega "gerado em"; se esse instante sair no fuso do
 * servidor, ele não bate com nada que quem estava lá lembra.
 */
export function formatRaceDateTime(
  iso: string | null,
  locale: Locale,
  timeZone: string,
): string {
  if (!iso) return "—";
  const instante = new Date(iso);
  if (!Number.isFinite(instante.getTime())) return "—";

  return new Intl.DateTimeFormat(tag(locale), {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(instante);
}

/** Tom visual de cada status. O rótulo vem do dicionário. */
export const RACE_STATUS_TONE: Record<
  RaceStatus,
  "neutral" | "ok" | "warn" | "info"
> = {
  draft: "neutral",
  armed: "ok",
  live: "ok",
  finished: "neutral",
  archived: "neutral",
};

/** Telefone digitado de qualquer jeito → só os dígitos e o "+" inicial. */
export function normalizePhone(input: string): string {
  const limpo = input.trim().replace(/[^\d+]/g, "");
  // O "+" só faz sentido na primeira posição; no meio é lixo de digitação.
  return limpo.replace(/(?!^)\+/g, "");
}

/** Placa: maiúscula, sem separadores, para bater com o que está no vidro. */
export function normalizePlate(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
