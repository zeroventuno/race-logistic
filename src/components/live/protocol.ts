/**
 * Contrato do painel ao vivo da direção — e a lógica pura que ele precisa.
 *
 * Módulo puro de propósito: sem React, sem `server-only`, sem banco. É
 * importado pelo Route Handler que monta o estado (servidor), pelos componentes
 * do painel (browser) e pelos testes (Node). Ter as regras de "quem sobe na
 * lista", "a janela esticou?" e "em que volta este veículo está" num só lugar,
 * testável com números conhecidos, é o que impede as três respostas divergirem
 * entre a lista, o mapa e o número grande do topo.
 *
 * UNIDADES: as mesmas do resto do sistema — metros, m/s, segundos. Formatação
 * acontece na camada de exibição, com `useFormat()`.
 *
 * DOIS RELÓGIOS, E ELES NÃO SÃO INTERCAMBIÁVEIS:
 *   `recordedAt` é o relógio do CELULAR do motorista. Serve para ordenar os
 *   pings dele e para o cálculo medido da janela, que compara dois instantes da
 *   mesma origem.
 *   `receivedAt` é o relógio do SERVIDOR. É o ÚNICO que serve para responder
 *   "este dado está velho?". Um celular 14 min adiantado carimba o ping de
 *   agora com hora do futuro; se a idade saísse de `recordedAt`, o veículo
 *   poderia parar de transmitir por 14 minutos com o painel exibindo
 *   "há 0 s, dado fresco".
 */

import { ACTIVE_ALERT_STATUSES, type DriverAlertStatus } from "@/lib/driver/protocol";
import type { GapResult, OffsetSample } from "@/lib/route/gap";
import {
  signalHealth,
  type AlertCategory,
  type AlertPriority,
  type PositionRole,
  type RaceStatus,
  type SignalHealth,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Formas transmitidas
// ---------------------------------------------------------------------------

export interface LiveRaceView {
  id: string;
  name: string;
  status: RaceStatus;
  timezone: string;
  laps: number;
  actualStart: string | null;
  finishedAt: string | null;
  scheduledStart: string | null;
  targetGapSeconds: number;
  minGapSeconds: number | null;
  maxGapSeconds: number | null;
}

export interface LiveRouteView {
  /** Comprimento de UMA volta do traçado. */
  lapDistanceM: number;
  /** `lapDistanceM × voltas` — a distância que a prova realmente tem. */
  raceDistanceM: number;
  isLoop: boolean;
}

export interface LiveVehicleView {
  positionId: string;
  label: string;
  role: PositionRole;
  ordinal: number;
  isReferenceLead: boolean;
  isReferenceSweep: boolean;
  isDispatchable: boolean;
  driverName: string | null;
  driverPhone: string | null;
  vehiclePlate: string | null;
  /** Existe um celular vinculado agora (sessão não revogada)? */
  bound: boolean;

  lat: number | null;
  lng: number | null;
  /** Relógio do aparelho. NÃO usar para idade. */
  recordedAt: string | null;
  /** Relógio do servidor. É daqui que sai a idade honesta. */
  receivedAt: string | null;

  /** Posição dentro de UMA volta. */
  routeOffsetM: number | null;
  lap: number;
  /** `lap × volta + offset`. Igual a `routeOffsetM` em prova de volta única. */
  absoluteOffsetM: number | null;
  /**
   * A volta deste veículo foi realmente apurada?
   *
   * A ingestão grava `lap` por ping para TODO veículo, então o caso normal é
   * `true`. Fica `false` só quando não há estado gravado e a reconstrução por
   * histórico — disponível apenas para abertura e fechamento — também não
   * alcança. Nesses casos a tela diz "volta ?" em vez de mostrar "km 3" como
   * se fosse a primeira passagem.
   */
  lapKnown: boolean;

  offRoute: boolean;
  snapDistanceM: number | null;
  /**
   * A âncora deste veículo veio de desempate, não de geometria.
   *
   * O traçado passa por ali em mais de um ponto a distâncias estatisticamente
   * iguais. A distância perpendicular pode ser de poucos metros e a posição na
   * prova estar a quilômetros do certo. Quem for despachado precisa saber, e
   * qualquer sugestão de acionamento ancorada assim tem que ser rebaixada.
   */
  snapAmbiguous: boolean;
  snapConfidence: "high" | "medium" | "low" | null;
  speedMps: number | null;
  rollingSpeedMps: number | null;
  batteryPct: number | null;
  headingDeg: number | null;
  totalPings: number;
  /**
   * `recordedAt − receivedAt` em segundos. Positivo = relógio do aparelho
   * adiantado. Acima de um minuto, nenhuma idade daquele aparelho é confiável.
   */
  clockSkewSeconds: number | null;
}

export type GapBand = "within" | "over" | "under" | "no_limits" | "unknown";

export interface GapEndpointView {
  positionId: string;
  label: string;
  role: PositionRole;
  lap: number;
  routeOffsetM: number | null;
  absoluteOffsetM: number | null;
  receivedAt: string | null;
  clockSkewSeconds: number | null;
}

/**
 * A janela, com tudo que o diretor precisa para decidir se acredita nela.
 *
 * Estende `GapResult` porque os campos de `computeGap` (`method`, `stale`,
 * `clockSuspect`, `sweepAheadOfLead`) são o contrato de honestidade do cálculo
 * e não devem ser reembrulhados — reembrulhar é como um deles some.
 */
export interface LiveGapView extends GapResult {
  computedAt: string;
  lead: GapEndpointView | null;
  sweep: GapEndpointView | null;
  targetSeconds: number;
  minSeconds: number | null;
  maxSeconds: number | null;
  band: GapBand;
  /** `gapSeconds − alvo`. Negativo = comprimido. `null` sem número. */
  deltaToTargetSeconds: number | null;
  /**
   * O histórico carregado alcança a largada?
   *
   * O método medido pergunta "a que horas o abertura passou pelo ponto onde o
   * fechamento está agora". Se a janela de histórico não chega tão para trás, a
   * resposta é `null` e o cálculo cai para a projeção — o que é correto, mas o
   * diretor precisa saber que a queda foi por falta de memória, não por falta
   * de dado.
   */
  historyComplete: boolean;
  /** Voltas reconstruídas a partir do histórico (não persistidas no banco). */
  lapsInferred: boolean;
}

export interface LiveAlertSuggestionView {
  positionId: string;
  label: string;
  role: PositionRole;
  rank: number;
  routeDistanceM: number | null;
  straightDistanceM: number;
  etaSeconds: number | null;
  isAhead: boolean | null;
  /** Por que o sistema colocou este veículo nesta posição da lista. */
  reason: string | null;
  /** Saúde do sinal AGORA — a sugestão é do momento do alerta, o sinal não. */
  signal: SignalHealth;
  ageSeconds: number | null;
}

export interface LiveAlertDispatchView {
  positionId: string;
  label: string;
  role: PositionRole;
  mode: "auto" | "manual" | null;
  reason: string | null;
  dispatchedAt: string | null;
  acknowledgedAt: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  onSceneAt: string | null;
}

export interface LiveAlertView {
  alertId: string;
  clientAlertId: string;
  category: AlertCategory;
  priority: AlertPriority;
  status: DriverAlertStatus;
  note: string | null;
  createdAt: string;
  receivedAt: string;
  acknowledgedAt: string | null;
  /**
   * Quem da direção reconheceu.
   *
   * É ESTE o campo que diz "um humano viu". `acknowledged_at` é preenchido pelo
   * gatilho do banco toda vez que o status sai de `open` — inclusive no
   * acionamento automático, que acontece sem ninguém olhar a tela. Usar a data
   * como prova de leitura apagaria o pulso vermelho de um acidente que nenhum
   * diretor viu ainda.
   */
  acknowledgedBy: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  lat: number | null;
  lng: number | null;
  /** Posição dentro de UMA volta. Não é o km da prova. */
  routeOffsetM: number | null;
  lap: number;
  /**
   * O km DA PROVA onde o alerta foi disparado.
   *
   * É este o número que vai na tela e o que a comparação de proximidade usa.
   * Usar `routeOffsetM` fazia um alerta na volta 3 do km 23 aparecer como
   * "no km 3,0", e a lista de apoio mais próximo — que compara offsets —
   * oferecia como candidato nº 1 uma moto "a 0,5 km" que estava uma volta
   * inteira atrás.
   */
  absoluteOffsetM: number | null;
  /**
   * A posição congelada no alerta veio de âncora ambígua.
   *
   * A diferença entre "a 200 m" e "a 37 km" decide se alguém pega o rádio.
   */
  routeOffsetAmbiguous: boolean;
  routeOffsetConfidence: "high" | "medium" | "low" | null;
  raisedBy: { positionId: string; label: string; role: PositionRole } | null;
  dispatch: LiveAlertDispatchView | null;
  suggestions: LiveAlertSuggestionView[];
  confirmations: { stillThere: number; cleared: number; notFound: number };
}

export interface LiveSnapshot {
  /** Relógio do servidor no instante da leitura. Ancora todas as idades. */
  serverTime: string;
  race: LiveRaceView;
  route: LiveRouteView | null;
  vehicles: LiveVehicleView[];
  gap: LiveGapView;
  alerts: LiveAlertView[];
  /**
   * Trecho de estrada entre o fechamento e a abertura — o que ainda está
   * ocupado pela prova. `null` quando não dá para saber.
   */
  occupiedSegment: [number, number][] | null;
  /** Avisos sobre a própria leitura (consulta parcial, histórico truncado). */
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Idade e saúde do sinal
// ---------------------------------------------------------------------------

/**
 * Idade de um carimbo do SERVIDOR, em segundos.
 *
 * Presa em zero por baixo: `receivedAt` vem de `now()` do Postgres, então idade
 * negativa só existe por deriva entre o relógio do banco e o do processo web —
 * ruído, não informação.
 */
export function serverAgeSeconds(iso: string | null, nowMs: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, (nowMs - t) / 1000);
}

export function vehicleAgeSeconds(v: LiveVehicleView, nowMs: number): number | null {
  return serverAgeSeconds(v.receivedAt, nowMs);
}

export function vehicleSignal(v: LiveVehicleView, nowMs: number): SignalHealth {
  if (!v.bound && v.receivedAt === null) return "never";
  return signalHealth(vehicleAgeSeconds(v, nowMs));
}

/** Acima disto o relógio do aparelho está errado o bastante para importar. */
export const CLOCK_SUSPECT_THRESHOLD_S = 60;

export function vehicleClockSuspect(v: LiveVehicleView): boolean {
  return (
    v.clockSkewSeconds !== null &&
    Math.abs(v.clockSkewSeconds) > CLOCK_SUSPECT_THRESHOLD_S
  );
}

// ---------------------------------------------------------------------------
// Ordenação da lista de veículos
// ---------------------------------------------------------------------------

export type VehicleSort = "prova" | "ordinal" | "papel";

export interface VehicleGroups {
  /**
   * Sem sinal ou nunca vinculado. Sobe para o topo em QUALQUER ordenação — não
   * é preferência de exibição, é a informação que muda a decisão: um marcador
   * parado no mapa há 3 min é ficção, e o diretor precisa pegar o rádio.
   */
  semSinal: LiveVehicleView[];
  emOperacao: LiveVehicleView[];
}

export function groupVehicles(
  vehicles: LiveVehicleView[],
  sort: VehicleSort,
  nowMs: number,
): VehicleGroups {
  const semSinal: LiveVehicleView[] = [];
  const emOperacao: LiveVehicleView[] = [];

  for (const v of vehicles) {
    const signal = vehicleSignal(v, nowMs);
    if (signal === "lost" || signal === "never") semSinal.push(v);
    else emOperacao.push(v);
  }

  // Dentro do grupo sem sinal, o mais antigo primeiro: é o que está pior.
  semSinal.sort((a, b) => {
    const aAge = vehicleAgeSeconds(a, nowMs);
    const bAge = vehicleAgeSeconds(b, nowMs);
    // Nunca vinculado (`null`) vai para o fim do grupo: é um problema de
    // cadastro, não um veículo que sumiu no meio da estrada.
    if (aAge === null && bAge === null) return a.ordinal - b.ordinal;
    if (aAge === null) return 1;
    if (bAge === null) return -1;
    return bAge - aAge;
  });

  emOperacao.sort(comparadorDeVeiculo(sort));

  return { semSinal, emOperacao };
}

function comparadorDeVeiculo(
  sort: VehicleSort,
): (a: LiveVehicleView, b: LiveVehicleView) => number {
  if (sort === "ordinal") {
    return (a, b) => a.ordinal - b.ordinal;
  }

  if (sort === "papel") {
    return (a, b) =>
      a.role === b.role ? a.ordinal - b.ordinal : a.role.localeCompare(b.role);
  }

  // "prova": quem está mais adiante no percurso primeiro. Sem posição na rota
  // não dá para comparar — esses vão para o fim, não para o começo, porque um
  // veículo sem offset no topo da lista sugere liderança que não existe.
  return (a, b) => {
    const ao = a.absoluteOffsetM;
    const bo = b.absoluteOffsetM;
    if (ao === null && bo === null) return a.ordinal - b.ordinal;
    if (ao === null) return 1;
    if (bo === null) return -1;
    if (ao !== bo) return bo - ao;
    return a.ordinal - b.ordinal;
  };
}

// ---------------------------------------------------------------------------
// Janela abertura ↔ fechamento
// ---------------------------------------------------------------------------

export interface GapLimits {
  targetSeconds: number;
  minSeconds: number | null;
  maxSeconds: number | null;
}

/**
 * A janela esticou ou comprimiu demais?
 *
 * Só responde "dentro"/"fora" quando a prova declarou limites. Sem `min`/`max`
 * o resultado é `no_limits`, e a tela mostra apenas a diferença para o alvo —
 * inventar uma tolerância de ±25% aqui seria acender um alarme que ninguém
 * configurou e que, por isso, ninguém sabe interpretar.
 */
export function classifyGapBand(
  gapSeconds: number | null,
  limits: GapLimits,
): GapBand {
  if (gapSeconds === null || !Number.isFinite(gapSeconds)) return "unknown";
  if (limits.minSeconds === null && limits.maxSeconds === null) return "no_limits";
  if (limits.maxSeconds !== null && gapSeconds > limits.maxSeconds) return "over";
  if (limits.minSeconds !== null && gapSeconds < limits.minSeconds) return "under";
  return "within";
}

export function deltaToTarget(
  gapSeconds: number | null,
  targetSeconds: number,
): number | null {
  if (gapSeconds === null || !Number.isFinite(gapSeconds)) return null;
  return gapSeconds - targetSeconds;
}

/**
 * A janela pode ser lida como um número, ou tem ressalva grande demais?
 *
 * Chamado tanto pelo cabeçalho quanto pelo indicador do mapa, para os dois
 * nunca discordarem sobre se o número vale.
 */
export function gapIsTrustworthy(gap: LiveGapView): boolean {
  return (
    gap.gapSeconds !== null &&
    !gap.stale &&
    !gap.clockSuspect &&
    !gap.sweepAheadOfLead
  );
}

// ---------------------------------------------------------------------------
// Voltas
// ---------------------------------------------------------------------------

export interface LapReconstruction {
  /** O mesmo histórico, com os offsets já em escala absoluta de prova. */
  samples: OffsetSample[];
  /** Volta atual (0 = primeira). */
  lap: number;
  /** Quantas passagens pela linha de largada foram detectadas. */
  wraps: number;
}

/**
 * Reconstrói a posição absoluta na prova a partir do histórico de offsets.
 *
 * A ingestão grava `route_offset_m` DENTRO da volta — `snapToRoute` devolve
 * `lap` e `absoluteOffsetM`, mas o banco só guarda o primeiro. Num circuito de
 * 3 voltas isso significa que o fechamento no km 3 da terceira volta e o
 * abertura no km 3 da primeira aparecem no MESMO ponto, e a janela compara
 * coisas incomparáveis: dá zero, e zero é a resposta que faz abrir a rua.
 *
 * A reconstrução é uma varredura: um recuo maior que meia volta entre dois
 * pings consecutivos não é um veículo dando ré por 25 km, é a linha de largada
 * sendo cruzada. Meia volta como limiar é folgado dos dois lados — nenhum
 * veículo de apoio recua tanto, e nenhum ping legítimo salta tanto para frente
 * sem passar pela linha.
 *
 * Em prova ponto-a-ponto ou de volta única a função é identidade, de propósito:
 * é o caso comum e ele não deve pagar nada por um recurso que não usa.
 */
export function reconstructAbsoluteOffsets(
  history: OffsetSample[],
  lapDistanceM: number,
  opts: { isLoop: boolean; laps: number },
): LapReconstruction {
  if (!opts.isLoop || opts.laps <= 1 || !(lapDistanceM > 0)) {
    return { samples: history, lap: 0, wraps: 0 };
  }

  const threshold = lapDistanceM / 2;
  const samples: OffsetSample[] = [];
  let lap = 0;
  let wraps = 0;
  let previous: number | null = null;

  for (const s of history) {
    if (previous !== null && s.offsetM - previous < -threshold) {
      wraps++;
      // Preso no número de voltas da prova: um ruído perto da linha de largada
      // não pode inventar uma quarta volta numa prova de três.
      lap = Math.min(lap + 1, opts.laps - 1);
    }
    previous = s.offsetM;
    samples.push({ offsetM: lap * lapDistanceM + s.offsetM, atMs: s.atMs });
  }

  return { samples, lap, wraps };
}

// ---------------------------------------------------------------------------
// Alertas
// ---------------------------------------------------------------------------

export const ACTIVE_ALERT_STATUS_SET = new Set<string>(ACTIVE_ALERT_STATUSES);

export function alertIsActive(alert: LiveAlertView): boolean {
  return ACTIVE_ALERT_STATUS_SET.has(alert.status);
}

/**
 * Alerta ativo que NENHUM humano da direção reconheceu ainda.
 *
 * É o predicado que liga o pulso e o som. Ver a nota de `acknowledgedBy`: o
 * carimbo de hora sozinho é preenchido pela máquina no acionamento automático,
 * e usá-lo aqui apagaria o alarme de um acidente que ninguém viu.
 */
export function alertNeedsAttention(alert: LiveAlertView): boolean {
  return alertIsActive(alert) && alert.acknowledgedBy === null;
}

/** Nenhum veículo a caminho: o alerta existe e ninguém foi acionado. */
export function alertHasNobodyGoing(alert: LiveAlertView): boolean {
  if (!alertIsActive(alert)) return false;
  if (!alert.dispatch) return true;
  return alert.dispatch.declinedAt !== null;
}

const CATEGORY_WEIGHT: Record<AlertCategory, number> = {
  medical: 0,
  other: 1,
  mechanical: 2,
};

/**
 * Ordem do painel de alertas.
 *
 * Não reconhecido antes de reconhecido; médico antes de mecânico; mais recente
 * antes de mais antigo. O primeiro critério é o que importa: um alerta que
 * ninguém viu não pode ficar abaixo de um que já está sendo tratado só porque
 * chegou antes.
 */
export function sortAlerts(alerts: LiveAlertView[]): LiveAlertView[] {
  return [...alerts].sort((a, b) => {
    const aAtivo = alertIsActive(a) ? 0 : 1;
    const bAtivo = alertIsActive(b) ? 0 : 1;
    if (aAtivo !== bAtivo) return aAtivo - bAtivo;

    const aNovo = alertNeedsAttention(a) ? 0 : 1;
    const bNovo = alertNeedsAttention(b) ? 0 : 1;
    if (aNovo !== bNovo) return aNovo - bNovo;

    const aOrfao = alertHasNobodyGoing(a) ? 0 : 1;
    const bOrfao = alertHasNobodyGoing(b) ? 0 : 1;
    if (aOrfao !== bOrfao) return aOrfao - bOrfao;

    const cat = CATEGORY_WEIGHT[a.category] - CATEGORY_WEIGHT[b.category];
    if (cat !== 0) return cat;

    return Date.parse(b.receivedAt) - Date.parse(a.receivedAt);
  });
}

/** Estado do acionamento, em uma palavra, para o cartão do alerta. */
export type DispatchStage =
  | "none"
  | "declined"
  | "dispatched"
  | "en_route"
  | "on_scene";

export function dispatchStage(alert: LiveAlertView): DispatchStage {
  const d = alert.dispatch;
  if (!d) return "none";
  if (d.declinedAt !== null) return "declined";
  if (d.onSceneAt !== null) return "on_scene";
  if (d.acknowledgedAt !== null) return "en_route";
  return "dispatched";
}

// ---------------------------------------------------------------------------
// Saúde da conexão do próprio painel
// ---------------------------------------------------------------------------

export type RealtimeStage = "connecting" | "connected" | "degraded" | "down";
export type PanelHealth = "ok" | "degraded" | "down";

export interface ConnectionState {
  realtime: RealtimeStage;
  /** Instante (epoch ms do relógio local) da última reconciliação bem-sucedida. */
  lastPollOkMs: number | null;
  consecutivePollFailures: number;
  lastError: string | null;
}

/** Acima disto, a reconciliação está atrasada o bastante para desconfiar. */
export const POLL_INTERVAL_MS = 10_000;
export const POLL_STALE_MS = 30_000;
export const POLL_DEAD_MS = 60_000;

/**
 * Teto de duração de uma leitura, deliberadamente MENOR que o intervalo.
 *
 * Requisição pendurada é rotina num trailer de prova com 4G ou atrás de portal
 * cativo. Sem teto, a leitura nunca resolve e leva junto todo o mecanismo de
 * reconciliação — inclusive o botão manual de recuperação. Cancelar aos 8 s e
 * contar como falha é infinitamente melhor que esperar para sempre: falha o
 * painel admite; espera eterna ele não percebe.
 */
export const POLL_TIMEOUT_MS = 8_000;

/**
 * Saúde do painel.
 *
 * A regra é assimétrica de propósito: o polling sozinho basta para `degraded`
 * (o painel continua correto, só perde a reação instantânea), mas o Realtime
 * sozinho NUNCA basta para `ok`. Um WebSocket que continua aberto e parou de
 * entregar eventos é indistinguível de uma prova sem novidades — e é exatamente
 * esse o modo de falha que faz um painel congelado parecer normal.
 */
export function panelHealth(state: ConnectionState, nowMs: number): PanelHealth {
  const since = state.lastPollOkMs === null ? Infinity : nowMs - state.lastPollOkMs;

  if (since > POLL_DEAD_MS) return "down";
  if (since > POLL_STALE_MS) return "degraded";
  if (state.realtime !== "connected") return "degraded";
  return "ok";
}
