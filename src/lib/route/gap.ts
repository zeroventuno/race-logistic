/**
 * Janela de tempo entre carro de abertura e carro de fechamento.
 *
 * Existem duas maneiras honestas de responder "quanto tempo separa a abertura
 * do fechamento", e elas dão respostas diferentes:
 *
 *  1. MEDIDO (preferido). O vassoura está agora no km 42. A que horas o carro
 *     de abertura passou pelo km 42? A diferença é o gap real, observado, sem
 *     nenhuma suposição sobre velocidade futura. É a mesma lógica de um tempo
 *     intermediário de cronometragem.
 *
 *  2. PROJETADO (recurso secundário). Distância entre os dois pela estrada
 *     dividida pela velocidade do vassoura. Só serve enquanto ainda não há
 *     histórico suficiente do abertura — no começo da prova, ou se o abertura
 *     ficou sem sinal justo no trecho onde o vassoura está agora.
 *
 * O método usado sempre acompanha o resultado, porque um diretor decidindo
 * fechar ou não uma rua precisa saber se está olhando um dado medido ou uma
 * extrapolação.
 */

export interface OffsetSample {
  /** Metros percorridos de prova. */
  offsetM: number;
  /** Epoch em ms. */
  atMs: number;
}

export type GapMethod =
  | "measured"
  | "projected"
  | "insufficient_data";

export interface VehicleGapInput {
  offsetM: number;
  /** Relógio do DISPOSITIVO. Serve para ordenar, não para medir idade. */
  atMs: number;
  /**
   * Relógio do SERVIDOR quando o ping chegou. É o único que serve para decidir
   * se o dado está velho.
   *
   * Sem isto, um celular com relógio adiantado neutraliza completamente a
   * detecção de dado velho: um aparelho 14 minutos adiantado carimba o ping de
   * agora com hora do futuro, e a partir daí o veículo pode PARAR de transmitir
   * por 14 minutos que o painel continua mostrando "idade: 0 s, dado fresco".
   * Quatorze minutos a 40 km/h são 9 km de estrada em que o vassoura pode estar
   * em qualquer lugar — exibidos como posição atual.
   */
  receivedAtMs?: number;
  /** Histórico ordenado por tempo crescente. */
  history: OffsetSample[];
}

export interface GapInput {
  lead: VehicleGapInput | null;
  sweep: VehicleGapInput | null;
  totalDistanceM: number;
  nowMs: number;
  /** Acima disto o dado do veículo é considerado velho demais para confiar. */
  staleThresholdMs?: number;
}

export interface GapResult {
  /** Distância pela estrada entre os dois veículos, em metros. */
  gapM: number | null;
  /** Separação temporal, em segundos. */
  gapSeconds: number | null;
  method: GapMethod;
  /** Explicação em português do que foi usado, para exibir no dashboard. */
  explanation: string;
  leadOffsetM: number | null;
  sweepOffsetM: number | null;
  sweepSpeedMps: number | null;
  /**
   * Idade do dado mais velho entre os dois veículos, em segundos, medida
   * contra o relógio do servidor. Pode ser negativa se o dispositivo carimbou
   * o ping no futuro — e nesse caso `clockSuspect` fica verdadeiro.
   */
  dataAgeSeconds: number | null;
  stale: boolean;
  /** Relógio de algum dispositivo está claramente errado. */
  clockSuspect: boolean;
  /** Vassoura ultrapassou o abertura — sempre um erro operacional. */
  sweepAheadOfLead: boolean;
}

const DEFAULT_STALE_MS = 90_000;
const ROLLING_WINDOW_MS = 180_000;
const MIN_MEANINGFUL_SPEED_MPS = 1.0;

export function computeGap(input: GapInput): GapResult {
  const { lead, sweep, nowMs } = input;
  const staleThresholdMs = input.staleThresholdMs ?? DEFAULT_STALE_MS;

  const base: GapResult = {
    gapM: null,
    gapSeconds: null,
    method: "insufficient_data",
    explanation: "Aguardando posição dos dois veículos de referência.",
    leadOffsetM: lead?.offsetM ?? null,
    sweepOffsetM: sweep?.offsetM ?? null,
    sweepSpeedMps: null,
    dataAgeSeconds: null,
    stale: false,
    clockSuspect: false,
    sweepAheadOfLead: false,
  };

  if (!lead && !sweep) {
    return base;
  }

  if (!lead) {
    return {
      ...base,
      explanation: "Carro de abertura sem posição. Vincule o aparelho dele.",
    };
  }

  if (!sweep) {
    return {
      ...base,
      explanation: "Carro de fechamento sem posição. Vincule o aparelho dele.",
    };
  }

  // Idade medida contra o relógio do SERVIDOR. `Math.max(0, …)` foi removido de
  // propósito: ele era exatamente o que escondia o relógio adiantado, virando
  // "idade negativa" em "idade zero" e declarando fresco um dado congelado.
  const leadAtMs = lead.receivedAtMs ?? lead.atMs;
  const sweepAtMs = sweep.receivedAtMs ?? sweep.atMs;
  const oldestMs = Math.min(leadAtMs, sweepAtMs);

  const dataAgeSeconds = (nowMs - oldestMs) / 1000;
  const stale = nowMs - oldestMs > staleThresholdMs;

  // Carimbo no futuro só é possível com relógio errado. Não dá para confiar em
  // nenhuma medida de idade nesse caso, e o painel precisa saber disso.
  const clockSuspect =
    lead.receivedAtMs === undefined || sweep.receivedAtMs === undefined
      ? lead.atMs > nowMs + 60_000 || sweep.atMs > nowMs + 60_000
      : false;

  const gapM = lead.offsetM - sweep.offsetM;
  const sweepAheadOfLead = gapM < -50; // 50 m de folga para ruído de GPS

  const sweepSpeedMps = rollingSpeedMps(sweep.history, nowMs, ROLLING_WINDOW_MS);

  const common = {
    leadOffsetM: lead.offsetM,
    sweepOffsetM: sweep.offsetM,
    sweepSpeedMps,
    dataAgeSeconds,
    stale,
    clockSuspect,
    sweepAheadOfLead,
  };

  if (sweepAheadOfLead) {
    return {
      ...base,
      ...common,
      gapM,
      gapSeconds: null,
      method: "insufficient_data",
      explanation:
        "O carro de fechamento está à frente do de abertura. Confira se os papéis estão trocados no cadastro.",
    };
  }

  // --- Método 1: medido a partir do histórico do carro de abertura ---------
  const leadPassedAt = timeAtOffset(lead.history, sweep.offsetM);

  if (leadPassedAt !== null) {
    const measuredSeconds = (sweep.atMs - leadPassedAt) / 1000;

    if (measuredSeconds >= 0) {
      return {
        ...base,
        ...common,
        gapM,
        gapSeconds: Math.max(0, measuredSeconds),
        method: "measured",
        explanation:
          "Medido: diferença de horário entre a passagem dos dois veículos pelo mesmo ponto do percurso.",
      };
    }
  }

  // --- Método 2: projeção pela velocidade do vassoura ----------------------
  if (sweepSpeedMps !== null && sweepSpeedMps >= MIN_MEANINGFUL_SPEED_MPS) {
    return {
      ...base,
      ...common,
      gapM,
      // Preso em zero. `gapM` pode ser levemente negativo dentro da folga de
      // 50 m que absorve ruído de GPS, e dividir isso pela velocidade produzia
      // "separação de −6 segundos" — que não significa nada e envenena
      // qualquer consumidor que faça conta com o campo.
      gapSeconds: Math.max(0, gapM / sweepSpeedMps),
      method: "projected",
      explanation: `Projetado: ${formatKm(gapM)} pela estrada na velocidade média atual do fechamento (${(sweepSpeedMps * 3.6).toFixed(0)} km/h).`,
    };
  }

  return {
    ...base,
    ...common,
    gapM,
    gapSeconds: null,
    method: "insufficient_data",
    explanation:
      sweepSpeedMps === null
        ? `Distância pela estrada: ${formatKm(gapM)}. Sem histórico suficiente para converter em tempo.`
        : `Distância pela estrada: ${formatKm(gapM)}. Carro de fechamento parado — tempo indefinido.`,
  };
}

/**
 * Velocidade média ao longo do percurso na janela recente.
 *
 * Deliberadamente não usa a velocidade instantânea do GPS: ela oscila demais
 * para projetar qualquer coisa (zera num semáforo, dispara numa descida) e
 * faria a ETA no dashboard pular a cada segundo, que é exatamente o tipo de
 * número que ninguém consegue usar sob pressão.
 */
export function rollingSpeedMps(
  history: OffsetSample[],
  nowMs: number,
  windowMs = ROLLING_WINDOW_MS,
): number | null {
  if (history.length < 2) return null;

  const cutoff = nowMs - windowMs;
  const recent = history.filter((s) => s.atMs >= cutoff);

  const samples = recent.length >= 2 ? recent : history.slice(-2);

  const first = samples[0]!;
  const last = samples[samples.length - 1]!;

  const dt = (last.atMs - first.atMs) / 1000;
  if (dt <= 0) return null;

  const ds = last.offsetM - first.offsetM;

  // Recuo ao longo do percurso não é velocidade negativa para efeito de ETA.
  return Math.max(0, ds / dt);
}

/**
 * Em que instante o veículo passou por `offsetM`, interpolando o histórico.
 *
 * Devolve `null` se o offset estiver fora do intervalo coberto pelo histórico —
 * o que é o caso honesto quando o veículo ainda não chegou lá, ou quando o
 * histórico em memória não vai longe o bastante no passado.
 */
export function timeAtOffset(
  history: OffsetSample[],
  offsetM: number,
): number | null {
  if (history.length < 2) return null;

  const first = history[0]!;
  const last = history[history.length - 1]!;

  if (offsetM < first.offsetM || offsetM > last.offsetM) return null;

  // Busca linear a partir do fim: o offset consultado (posição atual do
  // vassoura) costuma estar na parte antiga do histórico do abertura, mas
  // históricos em memória são curtos e isso não justifica indexação.
  for (let i = 1; i < history.length; i++) {
    const a = history[i - 1]!;
    const b = history[i]!;

    if (offsetM >= a.offsetM && offsetM <= b.offsetM) {
      const span = b.offsetM - a.offsetM;
      if (span <= 0) return a.atMs;
      const t = (offsetM - a.offsetM) / span;
      return a.atMs + (b.atMs - a.atMs) * t;
    }
  }

  return null;
}

function formatKm(meters: number): string {
  const km = meters / 1000;
  return km >= 10 ? `${km.toFixed(1)} km` : `${km.toFixed(2)} km`;
}

/** Formata segundos como "1h 04min" / "23min" / "45s". */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return "—";

  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;

  const minutes = Math.floor(s / 60);
  if (minutes < 60) return `${minutes}min`;

  const hours = Math.floor(minutes / 60);
  return `${hours}h ${String(minutes % 60).padStart(2, "0")}min`;
}
