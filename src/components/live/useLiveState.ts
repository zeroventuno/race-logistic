"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabaseBrowser } from "@/lib/supabase/client";
import type { DriverAlertStatus } from "@/lib/driver/protocol";
import type { AlertCategory, AlertPriority } from "@/lib/types";

import {
  panelHealth,
  POLL_INTERVAL_MS,
  POLL_TIMEOUT_MS,
  type ConnectionState,
  type LiveAlertView,
  type LiveSnapshot,
  type LiveVehicleView,
  type PanelHealth,
} from "./protocol";

/**
 * O estado ao vivo da prova, com duas fontes que se corrigem.
 *
 * REALTIME dá a reação instantânea: um alerta aparece na tela no mesmo segundo
 * em que o motorista aperta o botão, e os marcadores andam sozinhos.
 *
 * RECONCILIAÇÃO POR POLLING dá a verdade. A cada 10 s o painel busca o estado
 * inteiro do servidor e SUBSTITUI o que tem. Não é redundância defensiva: é a
 * única defesa contra o modo de falha que importa aqui — o WebSocket que
 * continua aberto e para de entregar eventos. Do lado do browser, "nada
 * aconteceu na prova" e "parei de receber" são a mesma coisa. Só uma leitura
 * completa, com resposta datada, distingue as duas.
 *
 * Daí a assimetria de `panelHealth`: o polling sozinho é suficiente para o
 * painel estar CORRETO (só mais lento); o Realtime sozinho NUNCA é suficiente
 * para declarar saúde, porque ele não sabe dizer que parou.
 *
 * O RELÓGIO É O DO SERVIDOR. Toda idade exibida ("há 4 s", "sem sinal há
 * 3 min") é calculada contra `serverTime` da última leitura, corrigido pelo
 * tempo local decorrido. O relógio do computador do diretor não entra na conta:
 * um laptop 5 minutos adiantado transformaria todo veículo ao vivo em veículo
 * sem sinal.
 */

export interface UseLiveStateOptions {
  raceId: string;
  inicial: LiveSnapshot;
  /** Grava `gap_snapshots` periodicamente. Só quem pode editar a prova. */
  gravarHistorico: boolean;
}

export interface UseLiveState {
  snapshot: LiveSnapshot;
  connection: ConnectionState;
  health: PanelHealth;
  /** Epoch ms estimado do SERVIDOR. Use este para qualquer idade. */
  nowMs: number;
  atualizando: boolean;
  /** Força uma reconciliação agora. */
  recarregar: () => void;
}

/** Intervalo do snapshot histórico da janela. */
const GAP_SNAPSHOT_INTERVAL_MS = 60_000;

/** Espera antes de reconciliar depois de um evento de Realtime. */
const REALTIME_DEBOUNCE_MS = 400;

export function useLiveState({
  raceId,
  inicial,
  gravarHistorico,
}: UseLiveStateOptions): UseLiveState {
  const [snapshot, setSnapshot] = useState<LiveSnapshot>(inicial);
  const [atualizando, setAtualizando] = useState(false);
  const [tick, setTick] = useState(() => Date.now());

  const [connection, setConnection] = useState<ConnectionState>(() => ({
    realtime: "connecting",
    lastPollOkMs: Date.now(),
    consecutivePollFailures: 0,
    lastError: null,
  }));

  // Diferença entre o relógio do servidor e o local, medida a cada leitura.
  const clockOffsetRef = useRef(Date.parse(inicial.serverTime) - Date.now());
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const emVooRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const montadoRef = useRef(true);

  // --- Reconciliação -------------------------------------------------------

  const recarregar = useCallback(async () => {
    if (emVooRef.current) return;
    emVooRef.current = true;
    setAtualizando(true);

    /**
     * Teto de tempo, menor que o intervalo de polling.
     *
     * Sem ele, uma requisição que PENDURA — 4G ruim, portal cativo de hotel,
     * proxy que engole o pacote — nunca resolve, o `finally` nunca roda,
     * `emVooRef` fica travado em `true` e TODO poll futuro sai na primeira
     * linha. `atualizando` fica travado em `true` e desabilita o botão
     * "atualizar agora", que é o único caminho manual de recuperação.
     *
     * O resultado medido: 25 s de rede pendurada e depois rede 100% saudável →
     * zero tentativas de reconciliação, para sempre. O painel dizia
     * corretamente "PAINEL SEM CONEXÃO — confirme tudo pelo rádio", mas a única
     * saída real era F5, e a tela não dizia isso. O mecanismo que existe para
     * detectar congelamento era o que estava congelado.
     */
    const controle = new AbortController();
    const expirar = setTimeout(() => controle.abort(), POLL_TIMEOUT_MS);

    try {
      const resposta = await fetch(`/api/races/${raceId}/live`, {
        cache: "no-store",
        headers: { accept: "application/json" },
        signal: controle.signal,
      });

      if (!resposta.ok) {
        const corpo = (await resposta.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(corpo?.error ?? `HTTP ${resposta.status}`);
      }

      const novo = (await resposta.json()) as LiveSnapshot;
      if (!montadoRef.current) return;

      clockOffsetRef.current = Date.parse(novo.serverTime) - Date.now();
      setSnapshot(novo);
      setConnection((c) => ({
        ...c,
        lastPollOkMs: Date.now(),
        consecutivePollFailures: 0,
        lastError: null,
      }));
    } catch (error) {
      if (!montadoRef.current) return;
      const abortou = (error as Error).name === "AbortError";
      setConnection((c) => ({
        ...c,
        consecutivePollFailures: c.consecutivePollFailures + 1,
        lastError: abortou
          ? `A leitura passou de ${POLL_TIMEOUT_MS / 1000} s e foi cancelada.`
          : (error as Error).message,
      }));
    } finally {
      clearTimeout(expirar);
      emVooRef.current = false;
      if (montadoRef.current) setAtualizando(false);
    }
  }, [raceId]);

  const recarregarBreve = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void recarregar();
    }, REALTIME_DEBOUNCE_MS);
  }, [recarregar]);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      void recarregar();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [recarregar]);

  // Aba escondida faz o navegador estrangular os temporizadores; ao voltar, o
  // painel pode estar exibindo minutos de atraso sem nenhum sinal disso.
  useEffect(() => {
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void recarregar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("online", aoVoltar);
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("online", aoVoltar);
    };
  }, [recarregar]);

  // --- Relógio de exibição -------------------------------------------------

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const nowMs = tick + clockOffsetRef.current;

  // --- Realtime ------------------------------------------------------------

  useEffect(() => {
    let canal: RealtimeChannel | null = null;

    try {
      const supabase = supabaseBrowser();

      canal = supabase
        .channel(`painel-ao-vivo:${raceId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "position_state",
            filter: `race_id=eq.${raceId}`,
          },
          (payload) => {
            const linha = payload.new as Record<string, unknown> | null;
            if (!linha || typeof linha.position_id !== "string") return;
            setSnapshot((atual) => aplicarEstado(atual, linha));
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "alerts",
            filter: `race_id=eq.${raceId}`,
          },
          (payload) => {
            const linha = payload.new as Record<string, unknown> | null;
            if (linha && typeof linha.id === "string") {
              // Pinta o que dá na hora — categoria, quem disparou, km — e vai
              // buscar o resto. As sugestões de apoio e as confirmações não
              // viajam no evento, e um alerta esperando o próximo polling para
              // aparecer é o oposto do que este painel existe para fazer.
              setSnapshot((atual) => aplicarAlerta(atual, linha));
            }
            recarregarBreve();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "alert_confirmations",
            filter: `race_id=eq.${raceId}`,
          },
          () => recarregarBreve(),
        )
        .subscribe((status) => {
          if (!montadoRef.current) return;

          if (status === "SUBSCRIBED") {
            setConnection((c) => ({ ...c, realtime: "connected" }));
            // Reconectou: pode ter perdido eventos enquanto estava fora.
            void recarregar();
            return;
          }

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setConnection((c) => ({ ...c, realtime: "down" }));
            return;
          }

          if (status === "CLOSED") {
            setConnection((c) => ({ ...c, realtime: "degraded" }));
          }
        });
    } catch (error) {
      setConnection((c) => ({
        ...c,
        realtime: "down",
        lastError: (error as Error).message,
      }));
    }

    return () => {
      if (canal) void supabaseBrowser().removeChannel(canal);
    };
  }, [raceId, recarregar, recarregarBreve]);

  // --- Histórico da janela -------------------------------------------------

  useEffect(() => {
    if (!gravarHistorico) return;

    const gravar = () => {
      if (snapshotRef.current.race.status !== "live") return;
      void fetch(`/api/races/${raceId}/live/gap-snapshot`, {
        method: "POST",
        cache: "no-store",
      }).catch(() => {
        // Falha aqui não muda nada na tela: é registro histórico, não operação.
      });
    };

    gravar();
    const id = setInterval(gravar, GAP_SNAPSHOT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [raceId, gravarHistorico]);

  const health = useMemo(
    () => panelHealth(connection, tick),
    [connection, tick],
  );

  return {
    snapshot,
    connection,
    health,
    nowMs,
    atualizando,
    recarregar: () => void recarregar(),
  };
}

// ---------------------------------------------------------------------------
// Fusão dos eventos de Realtime no estado
// ---------------------------------------------------------------------------

/**
 * Aplica uma linha nova de `position_state`.
 *
 * A volta é a parte delicada. O banco guarda o offset DENTRO da volta, e o
 * evento não traz a contagem — ela é reconstruída no servidor a cada
 * reconciliação. Entre duas reconciliações, a única pista é o recuo: um offset
 * que despenca mais de meia volta é a linha de largada sendo cruzada, não um
 * veículo dando ré por 25 km. A conta é a mesma de
 * `reconstructAbsoluteOffsets`; o polling corrige em no máximo 10 s se errar.
 */
function aplicarEstado(
  atual: LiveSnapshot,
  linha: Record<string, unknown>,
): LiveSnapshot {
  const positionId = String(linha.position_id);
  const indice = atual.vehicles.findIndex((v) => v.positionId === positionId);
  if (indice < 0) return atual;

  const anterior = atual.vehicles[indice];
  if (!anterior) return atual;

  const lapDistanceM = atual.route?.lapDistanceM ?? 0;
  const contaVoltas =
    (atual.route?.isLoop ?? false) && atual.race.laps > 1 && lapDistanceM > 0;

  const offset = numeroOuNulo(linha.route_offset_m);

  let lap = anterior.lap;
  if (
    contaVoltas &&
    anterior.lapKnown &&
    offset !== null &&
    anterior.routeOffsetM !== null &&
    offset - anterior.routeOffsetM < -lapDistanceM / 2
  ) {
    lap = Math.min(lap + 1, atual.race.laps - 1);
  }

  const recordedAt = textoOuNulo(linha.recorded_at);
  const receivedAt = textoOuNulo(linha.received_at);

  const clockSkewSeconds =
    recordedAt && receivedAt
      ? (Date.parse(recordedAt) - Date.parse(receivedAt)) / 1000
      : anterior.clockSkewSeconds;

  const atualizado: LiveVehicleView = {
    ...anterior,
    lat: numeroOuNulo(linha.lat),
    lng: numeroOuNulo(linha.lng),
    recordedAt: recordedAt ?? anterior.recordedAt,
    receivedAt: receivedAt ?? anterior.receivedAt,
    routeOffsetM: offset,
    lap,
    absoluteOffsetM: offset === null ? null : lap * lapDistanceM + offset,
    offRoute: linha.off_route === true,
    snapDistanceM: numeroOuNulo(linha.snap_distance_m),
    speedMps: numeroOuNulo(linha.speed_mps),
    rollingSpeedMps: numeroOuNulo(linha.rolling_speed_mps),
    batteryPct: numeroOuNulo(linha.battery_pct),
    headingDeg: numeroOuNulo(linha.heading_deg),
    totalPings: numeroOuNulo(linha.total_pings) ?? anterior.totalPings,
    clockSkewSeconds: Number.isFinite(clockSkewSeconds ?? NaN)
      ? clockSkewSeconds
      : null,
    // Uma linha de `position_state` chegando prova que existe aparelho falando.
    bound: true,
  };

  const vehicles = [...atual.vehicles];
  vehicles[indice] = atualizado;

  return { ...atual, vehicles };
}

/**
 * Aplica uma linha nova de `alerts`.
 *
 * Mistura conservadora: os campos que o evento traz vencem, e tudo que ele NÃO
 * traz (sugestões de apoio, contagem de confirmações) é preservado do estado
 * anterior em vez de virar lista vazia. Zerar as sugestões aqui faria os botões
 * de acionamento sumirem por meio segundo — justo no cartão que acabou de
 * chegar e que alguém está prestes a clicar.
 */
function aplicarAlerta(
  atual: LiveSnapshot,
  linha: Record<string, unknown>,
): LiveSnapshot {
  const alertId = String(linha.id);
  const existente = atual.alerts.find((a) => a.alertId === alertId) ?? null;

  const raisedById = textoOuNulo(linha.raised_by_position_id);
  const dispatchedId = textoOuNulo(linha.dispatched_position_id);

  const raiser = raisedById
    ? atual.vehicles.find((v) => v.positionId === raisedById)
    : undefined;
  const dispatched = dispatchedId
    ? atual.vehicles.find((v) => v.positionId === dispatchedId)
    : undefined;

  const alerta: LiveAlertView = {
    alertId,
    clientAlertId: textoOuNulo(linha.client_alert_id) ?? existente?.clientAlertId ?? "",
    category: (linha.category as AlertCategory) ?? existente?.category ?? "other",
    priority: (linha.priority as AlertPriority) ?? existente?.priority ?? "high",
    status: (linha.status as DriverAlertStatus) ?? existente?.status ?? "open",
    note: textoOuNulo(linha.note),
    createdAt: textoOuNulo(linha.created_at) ?? existente?.createdAt ?? new Date().toISOString(),
    receivedAt:
      textoOuNulo(linha.received_at) ?? existente?.receivedAt ?? new Date().toISOString(),
    acknowledgedAt: textoOuNulo(linha.acknowledged_at),
    acknowledgedBy: textoOuNulo(linha.acknowledged_by),
    resolvedAt: textoOuNulo(linha.resolved_at),
    resolutionNote: textoOuNulo(linha.resolution_note),
    lat: numeroOuNulo(linha.lat),
    lng: numeroOuNulo(linha.lng),
    routeOffsetM: numeroOuNulo(linha.route_offset_m),
    lap: numeroOuNulo(linha.lap) ?? existente?.lap ?? 0,
    absoluteOffsetM:
      numeroOuNulo(linha.absolute_offset_m) ?? existente?.absoluteOffsetM ?? null,
    routeOffsetAmbiguous:
      linha.route_offset_ambiguous === true ||
      (existente?.routeOffsetAmbiguous ?? false),
    routeOffsetConfidence:
      (linha.route_offset_confidence as "high" | "medium" | "low" | null) ??
      existente?.routeOffsetConfidence ??
      null,
    raisedBy: raiser
      ? { positionId: raiser.positionId, label: raiser.label, role: raiser.role }
      : (existente?.raisedBy ?? null),
    dispatch: dispatchedId
      ? {
          positionId: dispatchedId,
          label: dispatched?.label ?? existente?.dispatch?.label ?? "—",
          role: dispatched?.role ?? existente?.dispatch?.role ?? "other",
          mode: (linha.dispatch_mode as "auto" | "manual" | null) ?? null,
          reason: textoOuNulo(linha.dispatch_reason),
          dispatchedAt: textoOuNulo(linha.dispatched_at),
          acknowledgedAt: textoOuNulo(linha.dispatch_acknowledged_at),
          declinedAt: textoOuNulo(linha.dispatch_declined_at),
          declineReason: textoOuNulo(linha.dispatch_decline_reason),
          onSceneAt: textoOuNulo(linha.on_scene_at),
        }
      : null,
    suggestions: existente?.suggestions ?? [],
    confirmations: existente?.confirmations ?? {
      stillThere: 0,
      cleared: 0,
      notFound: 0,
    },
  };

  const alerts = existente
    ? atual.alerts.map((a) => (a.alertId === alertId ? alerta : a))
    : [alerta, ...atual.alerts];

  return { ...atual, alerts };
}

function numeroOuNulo(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function textoOuNulo(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
