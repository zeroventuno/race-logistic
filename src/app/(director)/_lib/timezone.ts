/**
 * Conversão entre a hora local da prova e o instante UTC gravado no banco.
 *
 * O diretor pensa em "largada às 9h30", no fuso do evento. O banco guarda
 * `timestamptz`. Fazer a ponte com `new Date("2026-07-12T09:30")` usaria o fuso
 * do SERVIDOR — que numa função serverless é UTC — e a largada de uma prova
 * italiana no verão entraria no banco duas horas adiantada. Ninguém notaria até
 * o dia da prova, quando o cronômetro de janela abre errado.
 *
 * Nenhuma biblioteca de data envolvida: `Intl` já sabe todas as regras de
 * horário de verão, e o que falta é só inverter a conta.
 */

/** Fusos oferecidos no formulário. Curados: a lista completa da IANA tem ~600
 *  entradas e transformaria um campo trivial numa caça ao tesouro. */
export const TIMEZONE_OPTIONS: ReadonlyArray<{ value: string; label: string }> =
  [
    { value: "Europe/Rome", label: "Itália — Roma (Europe/Rome)" },
    { value: "Europe/Lisbon", label: "Portugal — Lisboa (Europe/Lisbon)" },
    { value: "Europe/Madrid", label: "Espanha — Madri (Europe/Madrid)" },
    { value: "Europe/Paris", label: "França — Paris (Europe/Paris)" },
    { value: "Europe/Brussels", label: "Bélgica — Bruxelas (Europe/Brussels)" },
    { value: "Europe/Zurich", label: "Suíça — Zurique (Europe/Zurich)" },
    { value: "Europe/Berlin", label: "Alemanha — Berlim (Europe/Berlin)" },
    { value: "Europe/Vienna", label: "Áustria — Viena (Europe/Vienna)" },
    { value: "Europe/Amsterdam", label: "Países Baixos (Europe/Amsterdam)" },
    { value: "Europe/London", label: "Reino Unido — Londres (Europe/London)" },
    { value: "Europe/Warsaw", label: "Polônia — Varsóvia (Europe/Warsaw)" },
    { value: "Europe/Athens", label: "Grécia — Atenas (Europe/Athens)" },
    { value: "UTC", label: "UTC (sem horário de verão)" },
    { value: "America/Sao_Paulo", label: "Brasil — São Paulo" },
    { value: "America/Bahia", label: "Brasil — Salvador" },
    { value: "America/Manaus", label: "Brasil — Manaus" },
    {
      value: "America/Argentina/Buenos_Aires",
      label: "Argentina — Buenos Aires",
    },
    { value: "America/Bogota", label: "Colômbia — Bogotá" },
    { value: "America/New_York", label: "EUA — Nova York" },
    { value: "America/Los_Angeles", label: "EUA — Los Angeles" },
  ];

export const DEFAULT_TIMEZONE = "Europe/Rome";

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone || typeof timeZone !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Deslocamento do fuso, em ms, no instante dado. Positivo a leste de Greenwich.
 *
 * O truque: formatar o instante no fuso alvo e reinterpretar os campos como se
 * fossem UTC. A diferença entre os dois é exatamente o offset naquele instante,
 * horário de verão incluído.
 */
export function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const field = (type: Intl.DateTimeFormatPartTypes): number => {
    const found = parts.find((p) => p.type === type);
    return found ? Number(found.value) : 0;
  };

  // `hour12: false` em algumas engines devolve "24" para a meia-noite.
  const hour = field("hour") % 24;

  const asIfUtc = Date.UTC(
    field("year"),
    field("month") - 1,
    field("day"),
    hour,
    field("minute"),
    field("second"),
  );

  return asIfUtc - instant.getTime();
}

/**
 * `2026-07-12` + `09:30` no fuso da prova → instante UTC.
 *
 * Duas passadas de propósito. A primeira estima o offset usando o instante
 * errado (o horário local lido como se fosse UTC); a segunda corrige usando o
 * instante já quase certo. Só diverge nas madrugadas em que o relógio muda, e é
 * justamente nelas que uma passada só erraria por uma hora inteira.
 */
export function zonedToUtc(
  dateISO: string,
  timeHHMM: string,
  timeZone: string,
): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
  const t = /^(\d{1,2}):(\d{2})$/.exec(timeHHMM);
  if (!d || !t || !isValidTimeZone(timeZone)) return null;

  const year = Number(d[1]);
  const month = Number(d[2]);
  const day = Number(d[3]);
  const hour = Number(t[1]);
  const minute = Number(t[2]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hour > 23 || minute > 59) return null;

  const naive = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  let instantMs = naive - timeZoneOffsetMs(new Date(naive), timeZone);
  instantMs = naive - timeZoneOffsetMs(new Date(instantMs), timeZone);

  const result = new Date(instantMs);
  return Number.isFinite(result.getTime()) ? result : null;
}

/** Instante UTC → campos `date` e `time` prontos para os inputs do formulário. */
export function utcToZonedInputs(
  iso: string | null,
  timeZone: string,
): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };

  const instant = new Date(iso);
  if (!Number.isFinite(instant.getTime())) return { date: "", time: "" };

  const zone = isValidTimeZone(timeZone) ? timeZone : "UTC";
  const shifted = new Date(instant.getTime() + timeZoneOffsetMs(instant, zone));

  const pad = (n: number) => String(n).padStart(2, "0");

  return {
    date: `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    time: `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`,
  };
}

/**
 * Exibição de data e hora fica em `src/lib/i18n/format.ts` (`formatDateTime`) e
 * em `_lib/format.ts` (`formatRaceDate`). Aqui só mora a conversão entre o que
 * o formulário coleta e o instante que o banco guarda.
 */
