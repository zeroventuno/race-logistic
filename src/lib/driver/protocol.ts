/**
 * Contrato do app do motorista com o servidor, na parte que `src/lib/types.ts`
 * não cobre: códigos de erro, acionamento automático e a resposta de
 * `/api/driver/state`.
 *
 * Vive aqui, e não em `types.ts`, porque `types.ts` é território compartilhado
 * com o dashboard. Módulo puro: é importado tanto pelos Route Handlers quanto
 * pelo bundle do celular, então nada de `server-only` nem de acesso a banco.
 */

import type { GapResult } from "@/lib/route/gap";
import type {
  AlertAckResponse,
  AlertCategory,
  AlertStatus,
  BindResponse,
  PositionRole,
  RaceStatus,
} from "@/lib/types";

/**
 * Identidade da prova como o app precisa dela.
 *
 * `timeZone` não está em `BindResponse` porque o contrato original foi escrito
 * antes de o sistema ser multi-idioma. Ele é obrigatório aqui: todo horário
 * mostrado ao motorista é no fuso DA PROVA, e o celular dele pode estar em
 * outro fuso — ou com o fuso errado, que é mais comum do que parece.
 */
export interface DriverRace {
  id: string;
  name: string;
  status: RaceStatus;
  targetGapMinutes: number;
  timeZone: string;
  /**
   * Mapa de fundo da prova.
   *
   * Vai no payload do motorista pelo mesmo motivo que o fuso: o app dele não
   * tem sessão de usuário e não pode consultar preferência de conta. E tem
   * que ser o MESMO fundo da direção — os dois olham o mesmo evento, e fundo
   * diferente em cada lado faz duas pessoas descreverem a mesma curva de
   * jeitos diferentes no rádio.
   */
  basemap: string | null;
}

/** `BindResponse` com o fuso da prova junto. Superconjunto do contrato. */
export interface DriverBindResponse extends Omit<BindResponse, "race"> {
  race: DriverRace;
}

/**
 * Estados de alerta incluindo os dois que a migração 0003 acrescentou ao
 * enum do banco (`en_route`, `on_scene`) e que `types.ts` ainda não conhece.
 * Alargar aqui evita editar um arquivo compartilhado no meio do trabalho de
 * outra pessoa; quando `types.ts` incorporar os valores, este alias vira um
 * sinônimo e some sem quebrar nada.
 */
export type DriverAlertStatus = AlertStatus | "en_route" | "on_scene";

/** Estados em que o alerta ainda pede atenção de alguém. */
export const ACTIVE_ALERT_STATUSES: readonly DriverAlertStatus[] = [
  "open",
  "acknowledged",
  "dispatched",
  "en_route",
  "on_scene",
];

/**
 * Códigos de erro da API do motorista.
 *
 * São contrato: o app decide entre "tentar de novo para sempre" e "desvincular
 * e avisar o motorista" olhando para este campo, nunca para a mensagem — que é
 * texto para humano e pode mudar.
 */
export type DriverErrorCode =
  /** Token não corresponde a nenhuma sessão. Desvincular. */
  | "session_unknown"
  /** A direção derrubou este vínculo (outro celular assumiu). Desvincular. */
  | "session_revoked"
  /** Código de vínculo não reconhecido, expirado ou revogado. */
  | "invalid_code"
  /** Muitas tentativas de vínculo desta origem. */
  | "rate_limited"
  /** Corpo da requisição malformado — reenviar igual não vai adiantar. */
  | "bad_request"
  /** Alerta inexistente ou de outra prova. */
  | "not_found"
  /** A prova já acabou. */
  | "race_over"
  /** Falha do servidor. O app DEVE tentar de novo. */
  | "server_error";

export interface DriverErrorBody {
  error: {
    code: DriverErrorCode;
    message: string;
    /** Presente em `rate_limited`. */
    retryAfterSeconds?: number;
  };
}

/** Códigos que significam "este vínculo morreu, peça o código de novo". */
export const UNBIND_ERROR_CODES: readonly DriverErrorCode[] = [
  "session_unknown",
  "session_revoked",
];

export interface DriverVehicle {
  positionId: string;
  label: string;
  role: PositionRole;
  ordinal: number;
  isReferenceLead: boolean;
  isReferenceSweep: boolean;
  isSelf: boolean;
  lat: number | null;
  lng: number | null;
  /** ISO 8601. `null` se o veículo nunca transmitiu. */
  recordedAt: string | null;
  routeOffsetM: number | null;
  offRoute: boolean;
  rollingSpeedMps: number | null;
  batteryPct: number | null;
}

/** Quem foi acionado para um alerta, e o que ele já respondeu. */
export interface AlertDispatchView {
  positionId: string;
  label: string;
  role: PositionRole;
  mode: "auto" | "manual" | null;
  reason: string | null;
  dispatchedAt: string | null;
  acknowledgedAt: string | null;
  declinedAt: string | null;
  onSceneAt: string | null;
}

/** Um alerta como qualquer veículo da prova o vê no mapa. */
export interface DriverAlertView {
  alertId: string;
  clientAlertId: string;
  category: AlertCategory;
  status: DriverAlertStatus;
  createdAt: string;
  receivedAt: string;
  note: string | null;
  lat: number | null;
  lng: number | null;
  routeOffsetM: number | null;
  /** Quem disparou. `null` se veio do dashboard. */
  raisedBy: { positionId: string; label: string; role: PositionRole } | null;
  raisedBySelf: boolean;
  dispatch: AlertDispatchView | null;
  /** Este alerta foi acionado para MIM? É o estado mais importante da tela. */
  dispatchedToSelf: boolean;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  confirmations: { stillThere: number; cleared: number; notFound: number };
}

/** Alerta ativo à frente do veículo, dentro do raio de proximidade. */
export interface AlertProximity {
  alertId: string;
  category: AlertCategory;
  /** Metros à frente ao longo do percurso. Negativo = já passou. */
  distanceAheadM: number;
  /** `true` só na primeira vez que este veículo é avisado deste alerta. */
  firstNotice: boolean;
}

export interface DriverStateResponse {
  serverTime: string;
  race: DriverRace;
  self: {
    positionId: string;
    label: string;
    role: PositionRole;
    routeOffsetM: number | null;
  };
  vehicles: DriverVehicle[];
  gap: GapResult;
  /** Todos os alertas ativos da prova — o mapa é coletivo. */
  alerts: DriverAlertView[];
  /** Alertas à frente no percurso, dentro do raio de cada um. */
  proximity: AlertProximity[];
}

/**
 * Ack de alerta. Superconjunto de `AlertAckResponse` (o contrato original) com
 * o que o modelo de acionamento automático acrescentou.
 */
export interface DriverAlertAck extends Omit<AlertAckResponse, "status"> {
  status: DriverAlertStatus;
  /** Quem o sistema acionou automaticamente. `null` = ninguém foi acionado. */
  dispatch: {
    positionId: string;
    label: string;
    role: PositionRole;
    reason: string;
    etaSeconds: number | null;
  } | null;
  /**
   * `true` quando o alerta foi gravado mas o acionamento não aconteceu. A
   * interface TEM que gritar isso: significa que ninguém está a caminho.
   */
  dispatchFailed: boolean;
  /**
   * Consertos que o servidor precisou fazer no que o app mandou (categoria
   * desconhecida, horário inválido). Vazio no caminho normal. Existe para o
   * app poder dizer que o alerta chegou DIFERENTE do que foi enviado.
   */
  repairs: string[];
}

export type DispatchResponseAction = "on_my_way" | "arrived" | "decline";

export interface DispatchResponseRequest {
  action: DispatchResponseAction;
  reason?: string | null;
}

export interface DispatchResponseResult {
  alertId: string;
  status: DriverAlertStatus;
  /** Depois de uma recusa: quem assumiu no lugar. */
  reassignedTo: { positionId: string; label: string; role: PositionRole } | null;
  /** Recusa sem ninguém para reacionar — a direção precisa agir na mão. */
  orphaned: boolean;
}

export type AlertConfirmationKind = "still_there" | "cleared" | "not_found";

export interface AlertConfirmationRequest {
  clientConfirmationId: string;
  kind: AlertConfirmationKind;
  note?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface AlertConfirmationResult {
  alertId: string;
  kind: AlertConfirmationKind;
  deduplicated: boolean;
}

/** Percurso guardado no aparelho para o mapa funcionar sem rede. */
export interface CachedRoute {
  totalDistanceM: number;
  renderPoints: [number, number][];
}
