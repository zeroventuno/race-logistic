/**
 * Tipos de domínio — o contrato entre banco, servidor e as duas interfaces.
 *
 * Espelham as tabelas de `supabase/migrations`. Mantidos à mão em vez de
 * gerados porque também carregam os rótulos em português e os agrupamentos
 * que a interface usa, e porque um tipo que ninguém lê não pega o erro que
 * importa: usar `route_offset_m` achando que é quilômetro.
 *
 * CONVENÇÃO DE UNIDADES, válida em todo o sistema:
 *   - distância        → metros (sufixo `M`)
 *   - velocidade       → metros por segundo (sufixo `Mps`)
 *   - duração          → segundos (sufixo `Seconds`) ou ms (sufixo `Ms`)
 *   - instantes        → ISO 8601 em UTC quando string, epoch ms quando número
 * Conversão para km/h e km acontece só na camada de exibição.
 */

// ---------------------------------------------------------------------------
// Enums (espelham os tipos do Postgres)
// ---------------------------------------------------------------------------

export type RaceStatus = "draft" | "armed" | "live" | "finished" | "archived";

/**
 * Papéis na estrada, na ORDEM em que aparecem.
 *
 *   abertura … pelotão … FECHAMENTO … retardatários … VASSOURA
 *                            ↑
 *                    a via reabre aqui
 *
 * Entre a abertura e o fechamento circulam, sem posição fixa, as motos, as
 * ambulâncias e os carros de apoio mecânico.
 *
 * `sweep_car` é o CARRO DE FECHAMENTO, não a vassoura — o identificador é
 * legado e está em 29 arquivos; o significado é este. São veículos distintos:
 *
 *   - o FECHAMENTO (`sweep_car`) encerra a INTERDIÇÃO. Quando ele passa, a
 *     via reabre ao trânsito normal.
 *
 *   - os ciclistas que ficaram atrás dele seguem pedalando entre carros, sem
 *     a proteção do fechamento de via. É penalização de fato para quem anda
 *     devagar, e é a realidade aceita das provas amadoras — o sistema relata
 *     isso com precisão, não tenta corrigi-lo.
 *
 *   - a VASSOURA (`broom_wagon`) é o ÚLTIMO veículo, recolhendo quem abandona.
 *     Ela NÃO interdita nada; vem depois da via já reaberta.
 *
 * Daí a natureza da janela abertura ↔ fechamento: ela é antes de tudo um
 * COMPROMISSO ADMINISTRATIVO com a autoridade de trânsito — quanto tempo a
 * organização combinou manter a via fechada — e não uma medida interna da
 * prova. Estourá-la é quebrar acordo com quem autorizou o evento.
 */
export type PositionRole =
  | "lead_car"
  | "sweep_car"
  | "broom_wagon"
  | "moto"
  | "ambulance"
  | "mechanic"
  | "support_car"
  | "marshal"
  | "other";

export type AlertCategory = "mechanical" | "medical" | "other";

export type AlertStatus =
  | "open"
  | "acknowledged"
  | "dispatched"
  | "resolved"
  | "cancelled";

export type AlertPriority = "critical" | "high" | "normal";

export type TrackSource = "gpx" | "drawn";

// ---------------------------------------------------------------------------
// Rótulos e metadados de apresentação
// ---------------------------------------------------------------------------

export interface RoleMeta {
  label: string;
  shortLabel: string;
  /**
   * Nome do pictograma em `src/components/icons/vehicle.tsx`.
   *
   * Era emoji. Emoji desenha diferente em cada sistema operacional, não aceita
   * cor, fica minúsculo dentro de um marcador de mapa e some em impressão
   * monocromática — as quatro coisas que este produto precisa que funcionem.
   */
  icon: VehicleIconName;
  /** Cor do marcador. Definidas em `globals.css` como tokens. */
  color: string;
  /** Este papel pode ser despachado para atender um alerta? */
  dispatchable: boolean;
  /** Categorias de alerta que este papel resolve melhor. */
  handles: AlertCategory[];
  /**
   * Ordem no comboio, do primeiro ao último veículo da estrada.
   * Usada para ordenar listas e para o cadastro sugerir a sequência real.
   */
  convoyOrder: number;
}

export type VehicleIconName =
  | "lead"
  | "closing"
  | "broom"
  | "moto"
  | "ambulance"
  | "mechanic"
  | "support"
  | "marshal"
  | "other";

export const ROLE_META: Record<PositionRole, RoleMeta> = {
  lead_car: {
    label: "Carro de abertura",
    shortLabel: "Abertura",
    icon: "lead",
    color: "var(--role-lead)",
    dispatchable: false,
    handles: [],
    convoyOrder: 0,
  },
  moto: {
    label: "Moto de apoio",
    shortLabel: "Moto",
    icon: "moto",
    color: "var(--role-moto)",
    dispatchable: true,
    handles: ["other", "mechanical"],
    convoyOrder: 10,
  },
  ambulance: {
    label: "Ambulância",
    shortLabel: "Ambulância",
    icon: "ambulance",
    color: "var(--role-ambulance)",
    dispatchable: true,
    handles: ["medical"],
    convoyOrder: 20,
  },
  mechanic: {
    label: "Apoio mecânico",
    shortLabel: "Mecânico",
    icon: "mechanic",
    color: "var(--role-mechanic)",
    dispatchable: true,
    handles: ["mechanical"],
    convoyOrder: 30,
  },
  support_car: {
    label: "Carro de apoio",
    shortLabel: "Apoio",
    icon: "support",
    color: "var(--role-support)",
    dispatchable: true,
    handles: ["mechanical", "other"],
    convoyOrder: 40,
  },
  marshal: {
    label: "Fiscal de percurso",
    shortLabel: "Fiscal",
    icon: "marshal",
    color: "var(--role-marshal)",
    dispatchable: true,
    handles: ["other"],
    convoyOrder: 50,
  },
  other: {
    label: "Outro",
    shortLabel: "Outro",
    icon: "other",
    color: "var(--role-other)",
    dispatchable: true,
    handles: ["other"],
    convoyOrder: 60,
  },
  // Encerra o grupo oficial. Atrás dele ainda há ciclistas na estrada.
  sweep_car: {
    label: "Carro de fechamento",
    shortLabel: "Fechamento",
    icon: "closing",
    color: "var(--role-sweep)",
    dispatchable: false,
    handles: [],
    convoyOrder: 90,
  },
  // O ÚLTIMO veículo da estrada. É a passagem dele que libera a via.
  broom_wagon: {
    label: "Vassoura",
    shortLabel: "Vassoura",
    icon: "broom",
    color: "var(--role-broom)",
    dispatchable: true,
    handles: ["mechanical", "other"],
    convoyOrder: 100,
  },
};

/**
 * O nome do pictograma da categoria, resolvido em
 * `@/components/icons/alerta`. Pelo mesmo motivo dos veículos: emoji muda de
 * desenho em cada sistema, não aceita cor, e some dentro de um marcador de
 * 30 px — e aqui ele estava no botão de acidente do app do motorista, que é o
 * pior lugar possível para um símbolo que o Android e o iOS desenham
 * diferente.
 */
export type AlertIconName = "medical" | "mechanical" | "other";

export const ALERT_CATEGORY_META: Record<
  AlertCategory,
  { label: string; icon: AlertIconName; defaultPriority: AlertPriority }
> = {
  medical: {
    label: "Acidente / ambulância",
    icon: "medical",
    defaultPriority: "critical",
  },
  mechanical: { label: "Mecânico", icon: "mechanical", defaultPriority: "normal" },
  other: { label: "Outro", icon: "other", defaultPriority: "high" },
};

// ---------------------------------------------------------------------------
// Linhas das tabelas
// ---------------------------------------------------------------------------

export interface Race {
  id: string;
  name: string;
  location: string | null;
  status: RaceStatus;
  scheduled_start: string | null;
  actual_start: string | null;
  finished_at: string | null;
  timezone: string;
  target_gap_minutes: number;
  min_gap_minutes: number | null;
  max_gap_minutes: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** Formato compacto persistido: [lng, lat, distância cumulativa, elevação]. */
export type RoutePointTuple = [number, number, number, number | null];

export interface RouteTrackRow {
  id: string;
  race_id: string;
  name: string | null;
  source: TrackSource;
  original_filename: string | null;
  total_distance_m: number;
  point_count: number;
  elevation_gain_m: number | null;
  bbox: { minLng: number; minLat: number; maxLng: number; maxLat: number };
  points: RoutePointTuple[];
  render_points: [number, number][];
  is_active: boolean;
  created_at: string;
}

export interface RacePosition {
  id: string;
  race_id: string;
  role: PositionRole;
  label: string;
  ordinal: number;
  driver_name: string | null;
  driver_phone: string | null;
  vehicle_plate: string | null;
  is_reference_lead: boolean;
  is_reference_sweep: boolean;
  is_dispatchable: boolean;
  bind_code: string;
  bind_code_issued_at: string;
  bind_code_expires_at: string | null;
  bind_code_revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PositionSession {
  id: string;
  position_id: string;
  race_id: string;
  device_label: string | null;
  user_agent: string | null;
  bound_at: string;
  last_seen_at: string;
  last_ping_at: string | null;
  pings_received: number;
  revoked_at: string | null;
  revoked_reason: string | null;
}

export interface PositionStateRow {
  position_id: string;
  race_id: string;
  session_id: string | null;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  speed_mps: number | null;
  heading_deg: number | null;
  recorded_at: string;
  received_at: string;
  route_offset_m: number | null;
  snap_distance_m: number | null;
  off_route: boolean;
  rolling_speed_mps: number | null;
  battery_pct: number | null;
  total_pings: number;
  updated_at: string;
}

export interface Alert {
  id: string;
  race_id: string;
  raised_by_position_id: string | null;
  raised_by_user_id: string | null;
  client_alert_id: string;
  category: AlertCategory;
  priority: AlertPriority;
  note: string | null;
  lat: number | null;
  lng: number | null;
  accuracy_m: number | null;
  route_offset_m: number | null;
  status: AlertStatus;
  created_at: string;
  received_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  dispatched_position_id: string | null;
  dispatched_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
}

export interface AlertSuggestion {
  id: string;
  alert_id: string;
  position_id: string;
  rank: number;
  route_distance_m: number | null;
  straight_distance_m: number;
  eta_seconds: number | null;
  is_ahead: boolean | null;
  reason: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Formas compostas usadas pelas interfaces
// ---------------------------------------------------------------------------

/**
 * Um veículo como o mapa e as listas precisam dele: cadastro + último estado
 * + saúde do sinal, já resolvidos numa coisa só.
 */
export interface LiveVehicle {
  position: RacePosition;
  state: PositionStateRow | null;
  /** Segundos desde o último ping. `null` se nunca transmitiu. */
  ageSeconds: number | null;
  /** Classificação da saúde do sinal, derivada de `ageSeconds`. */
  signal: SignalHealth;
  /** Há um celular vinculado agora? */
  bound: boolean;
}

/**
 * Saúde do sinal.
 *
 * Os limiares são operacionais, não técnicos. `stale` aos 45 s porque um
 * veículo que não reporta há quase um minuto pode ter andado 1 km — o
 * marcador no mapa já é ficção. `lost` aos 3 min porque é quando o diretor
 * precisa parar de olhar o mapa e pegar o rádio.
 */
export type SignalHealth = "live" | "delayed" | "stale" | "lost" | "never";

export const SIGNAL_THRESHOLDS_S = {
  delayed: 15,
  stale: 45,
  lost: 180,
} as const;

export function signalHealth(ageSeconds: number | null): SignalHealth {
  if (ageSeconds === null) return "never";
  if (ageSeconds >= SIGNAL_THRESHOLDS_S.lost) return "lost";
  if (ageSeconds >= SIGNAL_THRESHOLDS_S.stale) return "stale";
  if (ageSeconds >= SIGNAL_THRESHOLDS_S.delayed) return "delayed";
  return "live";
}

export const SIGNAL_META: Record<
  SignalHealth,
  { label: string; color: string }
> = {
  live: { label: "Ao vivo", color: "var(--signal-live)" },
  delayed: { label: "Atrasado", color: "var(--signal-delayed)" },
  stale: { label: "Sem atualizar", color: "var(--signal-stale)" },
  lost: { label: "Sem sinal", color: "var(--signal-lost)" },
  never: { label: "Não vinculado", color: "var(--signal-never)" },
};

/** Alerta enriquecido com quem o disparou e as sugestões de apoio. */
export interface AlertWithContext {
  alert: Alert;
  raisedBy: RacePosition | null;
  suggestions: Array<{
    suggestion: AlertSuggestion;
    position: RacePosition;
    state: PositionStateRow | null;
  }>;
}

// ---------------------------------------------------------------------------
// Contratos de API do app do motorista
// ---------------------------------------------------------------------------

export interface BindRequest {
  code: string;
  deviceLabel?: string;
}

export interface BindResponse {
  token: string;
  position: {
    id: string;
    label: string;
    role: PositionRole;
    ordinal: number;
    isReferenceLead: boolean;
    isReferenceSweep: boolean;
  };
  race: {
    id: string;
    name: string;
    status: RaceStatus;
    targetGapMinutes: number;
  };
  route: {
    totalDistanceM: number;
    renderPoints: [number, number][];
  } | null;
}

/** Um ping como o dispositivo o produz, antes de qualquer processamento. */
export interface ClientPing {
  /** UUID gerado no aparelho. É a chave de idempotência. */
  clientPingId: string;
  /** Contador monotônico da sessão, para ordenar e detectar buracos. */
  clientSeq: number;
  lat: number;
  lng: number;
  accuracyM: number | null;
  altitudeM: number | null;
  speedMps: number | null;
  headingDeg: number | null;
  /** ISO 8601. Relógio do aparelho. */
  recordedAt: string;
  batteryPct: number | null;
  /** Este ping ficou na fila offline antes de ser enviado? */
  queuedOffline: boolean;
}

export interface PingBatchRequest {
  pings: ClientPing[];
}

export interface PingBatchResponse {
  /** IDs aceitos (inclui os que já existiam — idempotência não é erro). */
  accepted: string[];
  /** IDs rejeitados com o motivo, para o app parar de reenviar lixo. */
  rejected: Array<{ clientPingId: string; reason: string }>;
  /** Estado da posição depois de processar o lote. */
  state: {
    routeOffsetM: number | null;
    offRoute: boolean;
    totalDistanceM: number | null;
  };
  serverTime: string;
}

export interface ClientAlert {
  clientAlertId: string;
  category: AlertCategory;
  note: string | null;
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  createdAt: string;
}

export interface AlertAckResponse {
  /** ID do alerta no servidor. Presença disto = alerta gravado com certeza. */
  alertId: string;
  status: AlertStatus;
  receivedAt: string;
  /** Já duplicado? O app trata igual a sucesso. */
  deduplicated: boolean;
  suggestions: Array<{
    positionId: string;
    label: string;
    role: PositionRole;
    routeDistanceM: number | null;
    etaSeconds: number | null;
  }>;
}
