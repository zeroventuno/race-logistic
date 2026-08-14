"use client";

/**
 * Camada de rede do app do motorista.
 *
 * Existe para transformar as três coisas que um `fetch` pode fazer — responder,
 * responder erro, ou não responder — em um tipo que o chamador é OBRIGADO a
 * distinguir. A distinção não é acadêmica: "servidor disse não" e "servidor não
 * disse nada" pedem reações opostas. A primeira pode significar descartar o
 * item; a segunda significa SEMPRE manter e tentar de novo, e é a única coisa
 * que separa um alerta entregue de um alerta perdido num túnel.
 */

import type {
  AlertConfirmationRequest,
  AlertConfirmationResult,
  DispatchResponseAction,
  DispatchResponseResult,
  DriverAlertAck,
  DriverBindResponse,
  DriverErrorBody,
  DriverErrorCode,
  DriverStateResponse,
} from "@/lib/driver/protocol";
import type { ClientAlert, ClientPing, PingBatchResponse } from "@/lib/types";

export type ApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; kind: "http"; status: number; code: DriverErrorCode; message: string; retryAfterSeconds: number | null }
  | { ok: false; kind: "network"; message: string };

/** Timeout do lado do cliente: um `fetch` pendurado trava a fila inteira. */
const REQUEST_TIMEOUT_MS = 20_000;

async function call<T>(
  input: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return await httpFailure(response);
    }

    return { ok: true, value: (await response.json()) as T };
  } catch (error) {
    // Rede caída, DNS, servidor inalcançável, timeout, aba suspensa no meio.
    // Tudo isso é o mesmo caso: NÃO SABEMOS se o servidor recebeu.
    return { ok: false, kind: "network", message: describeNetworkError(error) };
  } finally {
    clearTimeout(timer);
  }
}

async function httpFailure<T>(response: Response): Promise<ApiResult<T>> {
  let code: DriverErrorCode = response.status >= 500 ? "server_error" : "bad_request";
  let message = `Servidor respondeu ${response.status}.`;
  let retryAfterSeconds: number | null = null;

  try {
    const body = (await response.json()) as DriverErrorBody;
    if (body?.error?.code) {
      code = body.error.code;
      message = body.error.message ?? message;
      retryAfterSeconds = body.error.retryAfterSeconds ?? null;
    }
  } catch {
    // Resposta de erro sem JSON (proxy, página de erro de operadora). O status
    // já basta para decidir entre repetir e desistir.
  }

  return { ok: false, kind: "http", status: response.status, code, message, retryAfterSeconds };
}

function describeNetworkError(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Servidor não respondeu a tempo.";
  }
  return "Sem conexão com o servidor.";
}

export function bindDevice(
  code: string,
  deviceLabel: string,
): Promise<ApiResult<DriverBindResponse>> {
  return call<DriverBindResponse>("/api/driver/bind", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, deviceLabel }),
  });
}

export function sendPings(token: string, pings: ClientPing[]): Promise<ApiResult<PingBatchResponse>> {
  return call<PingBatchResponse>("/api/driver/ping", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ pings }),
  });
}

export function sendAlert(token: string, alert: ClientAlert): Promise<ApiResult<DriverAlertAck>> {
  // Timeout mais generoso: o servidor aciona o socorro antes de responder, e
  // desistir cedo demais aqui geraria um reenvio desnecessário de um alerta
  // que já está gravado e já mobilizou um veículo.
  return call<DriverAlertAck>(
    "/api/driver/alert",
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(alert),
    },
    30_000,
  );
}

export function respondToDispatch(
  token: string,
  alertId: string,
  action: DispatchResponseAction,
  reason: string | null,
): Promise<ApiResult<DispatchResponseResult>> {
  return call<DispatchResponseResult>(`/api/driver/alert/${alertId}/respond`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, reason }),
  });
}

export function confirmAlert(
  token: string,
  alertId: string,
  confirmation: AlertConfirmationRequest,
): Promise<ApiResult<AlertConfirmationResult>> {
  return call<AlertConfirmationResult>(`/api/driver/alert/${alertId}/confirm`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(confirmation),
  });
}

export type StateResult =
  | { ok: true; notModified: true }
  | { ok: true; notModified: false; value: DriverStateResponse; etag: string | null }
  | { ok: false; kind: "http"; status: number; code: DriverErrorCode; message: string }
  | { ok: false; kind: "network"; message: string };

export async function fetchState(token: string, etag: string | null): Promise<StateResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = { authorization: `Bearer ${token}` };
    if (etag) headers["if-none-match"] = etag;

    const response = await fetch("/api/driver/state", {
      headers,
      signal: controller.signal,
      cache: "no-store",
    });

    if (response.status === 304) return { ok: true, notModified: true };

    if (!response.ok) {
      const failure = await httpFailure<DriverStateResponse>(response);
      if (failure.ok) return { ok: true, notModified: true };
      return failure.kind === "http"
        ? { ok: false, kind: "http", status: failure.status, code: failure.code, message: failure.message }
        : { ok: false, kind: "network", message: failure.message };
    }

    return {
      ok: true,
      notModified: false,
      value: (await response.json()) as DriverStateResponse,
      etag: response.headers.get("etag"),
    };
  } catch (error) {
    return { ok: false, kind: "network", message: describeNetworkError(error) };
  } finally {
    clearTimeout(timer);
  }
}
