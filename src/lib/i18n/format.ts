import { LOCALE_META, type Locale } from "@/lib/i18n/config";

/**
 * Formatação sensível ao idioma.
 *
 * Tudo no sistema circula em unidades SI (metros, m/s, segundos) e só vira
 * texto aqui. É o que permite trocar de idioma sem tocar em nenhum cálculo — e
 * o que evita a classe de bug em que alguém soma quilômetros com metros porque
 * a variável já vinha formatada.
 *
 * Só métrico. Ciclismo de estrada é métrico no mundo inteiro, inclusive nos
 * Estados Unidos: as provas são em quilômetros, os cartazes de quilometragem
 * são em quilômetros, e o rádio da direção fala em quilômetros. Oferecer
 * milhas seria criar ambiguidade onde a modalidade já resolveu.
 */

function tag(locale: Locale): string {
  return LOCALE_META[locale].intlTag;
}

/**
 * Distância legível.
 *
 * A precisão muda com a grandeza de propósito. "1,2 km" é o que se fala no
 * rádio; "1,247 km" não ajuda ninguém e ocupa espaço que a tela não tem. Abaixo
 * de 1 km, metros arredondados a 10 — porque a incerteza do próprio GPS é dessa
 * ordem, e mostrar "847 m" finge uma precisão que o dado não tem.
 */
export function formatDistance(meters: number | null, locale: Locale): string {
  if (meters === null || !Number.isFinite(meters)) return "—";

  const abs = Math.abs(meters);

  if (abs < 1000) {
    const rounded = Math.round(abs / 10) * 10;
    return `${new Intl.NumberFormat(tag(locale)).format(rounded)} m`;
  }

  const km = abs / 1000;
  const digits = km >= 100 ? 0 : km >= 10 ? 1 : 2;

  return `${new Intl.NumberFormat(tag(locale), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(km)} km`;
}

/**
 * O comprimento de um PERCURSO, sempre com uma casa decimal.
 *
 * `formatDistance` arredonda para o quilômetro inteiro acima de 100 km, e para
 * uma leitura operacional — "o veículo está no km 42" — está certo: a casa
 * decimal ali é ruído numa tela que se lê de relance.
 *
 * O comprimento do percurso é outra coisa. É o número que o organizador
 * publicou no site da prova, que ele conferiu no computador de bordo e que
 * consta no pedido à prefeitura. Ver "111 km" onde o cartaz diz "110,62" faz
 * ele desconfiar da importação inteira — e foi exatamente o que aconteceu.
 */
export function formatRouteDistance(
  meters: number | null,
  locale: Locale,
): string {
  if (meters === null || !Number.isFinite(meters)) return "—";

  const abs = Math.abs(meters);
  if (abs < 1000) return formatDistance(meters, locale);

  return `${new Intl.NumberFormat(tag(locale), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(abs / 1000)} km`;
}

/**
 * Duração legível: "1 h 04", "23 min", "45 s".
 *
 * Usa as unidades curtas do próprio Intl quando disponíveis, porque "min" em
 * alemão e "min" em francês não são a mesma abreviação em todo contexto, e
 * chutar isso é como acaba aparecendo texto errado numa tela operacional.
 */
export function formatDuration(
  seconds: number | null,
  locale: Locale,
): string {
  if (seconds === null || !Number.isFinite(seconds)) return "—";

  const total = Math.max(0, Math.round(seconds));
  const t = tag(locale);

  if (total < 60) {
    return new Intl.NumberFormat(t, {
      style: "unit",
      unit: "second",
      unitDisplay: "short",
    }).format(total);
  }

  const minutes = Math.floor(total / 60);

  if (minutes < 60) {
    return new Intl.NumberFormat(t, {
      style: "unit",
      unit: "minute",
      unitDisplay: "short",
    }).format(minutes);
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  const h = new Intl.NumberFormat(t, {
    style: "unit",
    unit: "hour",
    unitDisplay: "short",
  }).format(hours);

  return `${h} ${String(rest).padStart(2, "0")}`;
}

/** Velocidade em km/h. */
export function formatSpeed(mps: number | null, locale: Locale): string {
  if (mps === null || !Number.isFinite(mps)) return "—";

  return new Intl.NumberFormat(tag(locale), {
    style: "unit",
    unit: "kilometer-per-hour",
    unitDisplay: "short",
    maximumFractionDigits: 0,
  }).format(Math.max(0, mps) * 3.6);
}

/**
 * Hora do relógio no fuso da PROVA, não no do aparelho.
 *
 * Um diretor pode estar acompanhando de outro país, e o motorista pode estar
 * com o celular em fuso errado. A hora que aparece na tela tem que ser a hora
 * da prova, sempre, senão duas pessoas olham a mesma tela e leem horários
 * diferentes para o mesmo evento.
 */
export function formatClock(
  iso: string | number | Date | null,
  locale: Locale,
  timeZone: string,
  opts: { withSeconds?: boolean } = {},
): string {
  if (iso === null) return "—";

  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(tag(locale), {
    hour: "2-digit",
    minute: "2-digit",
    second: opts.withSeconds ? "2-digit" : undefined,
    timeZone,
    hour12: false,
  }).format(date);
}

export function formatDateTime(
  iso: string | number | Date | null,
  locale: Locale,
  timeZone: string,
): string {
  if (iso === null) return "—";

  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(tag(locale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
    hour12: false,
  }).format(date);
}

/**
 * Tempo relativo curto para "última atualização": "há 4 s", "há 2 min".
 *
 * Este número fica na tela mudando o tempo todo ao lado de cada veículo. É o
 * que diz ao diretor se ele está olhando a realidade ou uma lembrança dela.
 */
export function formatAge(
  ageSeconds: number | null,
  locale: Locale,
): string {
  if (ageSeconds === null || !Number.isFinite(ageSeconds)) return "—";

  const rtf = new Intl.RelativeTimeFormat(tag(locale), {
    numeric: "auto",
    style: "narrow",
  });

  const s = Math.max(0, Math.round(ageSeconds));

  if (s < 60) return rtf.format(-s, "second");
  if (s < 3600) return rtf.format(-Math.round(s / 60), "minute");
  return rtf.format(-Math.round(s / 3600), "hour");
}
