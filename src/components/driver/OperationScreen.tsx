"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { AlertPad } from "@/components/driver/AlertPad";
import { DispatchBanner, DispatchTakeover } from "@/components/driver/DispatchTakeover";
import { DriverMap } from "@/components/driver/DriverMap";
import { ProximityBanner } from "@/components/driver/ProximityBanner";
import { useFormat, useT } from "@/lib/i18n/client";
import type { CachedRoute, DriverAlertView } from "@/lib/driver/protocol";
import type { DriverRuntime } from "@/lib/driver/runtime";
import { initialSnapshot } from "@/lib/driver/runtime";
import { loadRoute, type StoredSession } from "@/lib/driver/storage";
import type { GapResult } from "@/lib/route/gap";
import type { AlertCategory } from "@/lib/types";

/**
 * Tela operacional.
 *
 * Hierarquia de atenção, de cima para baixo e por tamanho: ACIONAMENTO (toma a
 * tela), ALERTA À FRENTE (faixa), ESTADO DA CONEXÃO (sempre visível), mapa,
 * botões de alerta. Nada além disso — cada elemento a mais é um elemento que
 * compete com a estrada.
 *
 * O mapa só é montado DEPOIS da hidratação, por um `useEffect` que liga uma
 * bandeira. O MapLibre precisa de `window` e de um canvas WebGL — nada disso
 * existe na renderização do servidor, e forçar a montagem lá derruba a rota
 * inteira. Um retângulo vazio por um instante é preço barato.
 */

export interface OperationScreenProps {
  runtime: DriverRuntime;
  session: StoredSession;
  onUnbind: () => void;
}

export function OperationScreen({ runtime, session, onUnbind }: OperationScreenProps) {
  const t = useT();

  const snapshot = useSyncExternalStore(
    runtime.subscribe,
    runtime.getSnapshot,
    initialSnapshot,
  );

  const [route, setRoute] = useState<CachedRoute | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    void loadRoute().then(setRoute);
    setMapReady(true);
  }, []);

  const state = snapshot.state;
  const selfOffsetM = state?.self.routeOffsetM ?? null;

  /**
   * TODOS os acionamentos meus, não o primeiro que aparecer.
   *
   * A lista vem ordenada por `received_at` decrescente, então um `.find()`
   * devolvia o acionamento mais RECENTE — e o que a motorista já tinha aceitado
   * sumia da tela dela no instante em que um segundo acidente acontecia. Com
   * dois chamados abertos ela via um só, e não sabia qual.
   */
  const dispatchedToMe = useMemo(
    () =>
      (state?.alerts ?? [])
        .filter((a) => a.dispatchedToSelf && isOpenForMe(a))
        .sort((a, b) => Date.parse(a.receivedAt) - Date.parse(b.receivedAt)),
    [state],
  );

  const answeredIds = new Set(
    snapshot.queuedActions
      .filter((a) => a.kind === "dispatch_response")
      .map((a) => a.alertId),
  );

  const isAnswered = (alert: DriverAlertView) =>
    Boolean(alert.dispatch?.acknowledgedAt) || answeredIds.has(alert.alertId);

  // A tela cheia é só até o motorista responder, e só para UM acionamento por
  // vez — o mais antigo, que é o que está esperando há mais tempo. Depois disso
  // ele está dirigindo até lá e precisa do mapa; os acionamentos aceitos
  // continuam visíveis nas faixas. Uma resposta ainda na fila conta como
  // respondida: ele já decidiu, e prendê-lo numa tela cheia porque a rede caiu
  // seria punir o sinal ruim.
  const takeover = dispatchedToMe.find((a) => !isAnswered(a)) ?? null;
  const enRoute = dispatchedToMe.filter((a) => isAnswered(a));

  const distanceToAlert = (alert: DriverAlertView | null) =>
    alert && alert.routeOffsetM != null && selfOffsetM != null
      ? alert.routeOffsetM - selfOffsetM
      : null;

  const serverTimeMs = state ? Date.parse(state.serverTime) : null;

  return (
    <div className="flex h-dvh flex-col bg-surface-0">
      <StatusBar snapshot={snapshot} session={session} onUnbind={onUnbind} />

      {enRoute.map((alert) => (
        <DispatchBanner
          key={alert.alertId}
          alert={alert}
          distanceM={distanceToAlert(alert)}
          pendingAnswer={answeredIds.has(alert.alertId) && !alert.dispatch?.acknowledgedAt}
          onRespond={(action, reason) =>
            void runtime.respondToDispatch(alert.alertId, action, reason)
          }
        />
      ))}

      {state ? <GapStrip gap={state.gap} /> : null}

      <ProximityBanner
        proximity={state?.proximity ?? []}
        alerts={state?.alerts ?? []}
        onConfirm={(alertId, kind) => void runtime.confirmAlert(alertId, kind, null)}
      />

      {mapReady ? (
        <DriverMap
          className="min-h-0 flex-1"
          route={route}
          vehicles={state?.vehicles ?? []}
          alerts={state?.alerts ?? []}
          serverTimeMs={serverTimeMs}
        />
      ) : (
        <div className="min-h-0 flex-1 bg-surface-1" />
      )}

      <AlertPad
        snapshot={snapshot}
        onRaise={(category: AlertCategory) =>
          runtime
            .raiseAlert(category, null)
            .then((result) =>
              result.ok ? ({ ok: true } as const) : ({ ok: false, error: result.error } as const),
            )
        }
      />

      {takeover ? (
        <DispatchTakeover
          alert={takeover}
          distanceM={distanceToAlert(takeover)}
          pendingAnswer={answeredIds.has(takeover.alertId)}
          onRespond={(action, reason) =>
            void runtime.respondToDispatch(takeover.alertId, action, reason)
          }
        />
      ) : null}

      {snapshot.revokedMessage ? (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-surface-0/98 p-6 text-center">
          <p className="text-lg font-semibold text-ink">{t("driver.revoked")}</p>
          <p className="text-sm text-ink-muted">{snapshot.revokedMessage}</p>
          <button
            type="button"
            onClick={onUnbind}
            className="touch-target rounded-xl bg-info px-6 py-4 text-lg font-semibold text-surface-0"
          >
            {t("driver.bindAction")}
          </button>
          {snapshot.queuedAlerts > 0 ? (
            /* i18n: precisa de chave — aviso de alertas presos na fila */
            <p className="text-sm font-medium text-warn">
              {snapshot.queuedAlerts} alerta(s) ainda não entregue(s). Avise pelo
              rádio.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Um acionamento só some da tela quando ele deixa de ser meu problema. */
function isOpenForMe(alert: DriverAlertView): boolean {
  if (alert.status === "resolved" || alert.status === "cancelled") return false;
  return !alert.dispatch?.onSceneAt;
}

function StatusBar({
  snapshot,
  session,
  onUnbind,
}: {
  snapshot: import("@/lib/driver/runtime").DriverSnapshot;
  session: StoredSession;
  onUnbind: () => void;
}) {
  const t = useT();
  const [menu, setMenu] = useState(false);

  // Ping recusado é falha DURA, e mais traiçoeira que ficar sem rede: a
  // conexão está ótima, o servidor responde 200, e nenhuma posição é gravada.
  // Com o relógio do aparelho adiantado isso são seis horas de prova sem um
  // ponto no mapa — e a versão anterior desta barra mostrava verde e
  // "transmitindo" o tempo todo.
  const rejecting = snapshot.rejectedPings !== null;

  const connectionTone = rejecting
    ? "bg-critical"
    : snapshot.connection === "online"
      ? "bg-ok"
      : snapshot.connection === "sending"
        ? "bg-info"
        : "bg-warn";

  const connectionLabel = rejecting
    ? /* i18n: precisa de chave — posição recusada pelo servidor */
      "POSIÇÃO RECUSADA"
    : snapshot.connection === "online"
      ? t("driver.transmitting")
      : snapshot.connection === "sending"
        ? t("alerts.sending")
        : t("common.offline");

  const gpsLabel =
    snapshot.gps === "ok"
      ? null
      : snapshot.gps === "denied"
        ? t("driver.gpsDenied")
        : snapshot.gps === "unavailable"
          ? t("driver.gpsUnavailable")
          : t("driver.gpsSearching");

  return (
    <header className="border-b border-border bg-surface-1">
      <div className="flex items-center gap-3 px-3 py-2">
        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm font-semibold text-ink">
            {t("driver.boundAs", {
              position: session.position.label,
              race: session.race.name,
            })}
          </p>
          <p className="truncate text-xs text-ink-muted">
            {t(`roles.${session.position.role}.label`)}
          </p>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 rounded-full ${connectionTone}`}
          />
          <span className="text-xs font-medium text-ink-muted">{connectionLabel}</span>
        </div>
      </div>

      {snapshot.rejectedPings ? (
        /* i18n: precisa de chave — pings recusados e o motivo do servidor */
        <p
          role="alert"
          className="border-t border-critical bg-critical-dim/50 px-3 py-2 text-xs font-semibold text-ink"
        >
          O servidor recusou {snapshot.rejectedPings.count} posição(ões): sua
          posição NÃO está aparecendo no mapa da direção.
          <span className="mt-0.5 block font-normal text-ink-muted">
            {snapshot.rejectedPings.reason}
          </span>
        </p>
      ) : null}

      {(snapshot.queuedPings > 0 ||
        gpsLabel ||
        !snapshot.durableQueue ||
        snapshot.stateError ||
        snapshot.lastSyncError) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-3 py-1.5 text-xs">
          {snapshot.queuedPings > 0 ? (
            <span className="tnum text-warn">
              {t("driver.queuedPings", { count: snapshot.queuedPings })}
            </span>
          ) : null}
          {gpsLabel ? (
            <span className="text-warn">
              {gpsLabel}
              {/* i18n: precisa de chave — instrução por sistema operacional.
                  Vem de `permissionInstructions()` e hoje só existe em
                  português. É a parte ACIONÁVEL da mensagem: sem ela o
                  motorista sabe que está bloqueado e não sabe o que fazer. */}
              {snapshot.gps === "denied" && snapshot.gpsMessage ? (
                <span className="block text-ink-muted">{snapshot.gpsMessage}</span>
              ) : null}
            </span>
          ) : null}
          {!snapshot.durableQueue ? (
            /* i18n: precisa de chave — fila apenas em memória */
            <span className="text-warn">
              Armazenamento local indisponível: a fila se perde se o app fechar.
            </span>
          ) : null}
          {/* i18n: precisa de chave — último erro de comunicação. Sem isto o
              motorista não tem como saber que o app está falando sozinho. */}
          {snapshot.lastSyncError || snapshot.stateError ? (
            <span className="text-ink-faint">
              {snapshot.lastSyncError ?? snapshot.stateError}
            </span>
          ) : null}
        </div>
      )}

      {menu ? (
        <div className="border-t border-border px-3 py-2">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(t("driver.unbindConfirm"))) onUnbind();
            }}
            className="touch-target w-full rounded-lg border border-border-strong px-4 text-sm text-ink-muted"
          >
            {t("driver.unbind")}
          </button>
        </div>
      ) : null}
    </header>
  );
}

/**
 * Faixa da janela abertura ↔ fechamento.
 *
 * O texto vem de chaves traduzidas montadas a partir do MÉTODO do cálculo, não
 * da frase que o servidor devolveu: `GapResult.explanation` é português fixo, e
 * o motorista pode ser francês. O método é o dado; a frase é apresentação.
 */
function GapStrip({ gap }: { gap: GapResult }) {
  const t = useT();
  const fmt = useFormat();

  const detail =
    gap.method === "measured"
      ? t("gap.measured")
      : gap.method === "projected"
        ? t("gap.projected", {
            distance: fmt.distance(gap.gapM),
            speed: fmt.speed(gap.sweepSpeedMps),
          })
        : gap.leadOffsetM == null
          ? t("gap.noLead")
          : gap.sweepOffsetM == null
            ? t("gap.noSweep")
            : gap.sweepAheadOfLead
              ? t("gap.sweepAhead")
              : t("gap.noHistory", { distance: fmt.distance(gap.gapM) });

  return (
    <div className="flex items-baseline gap-2 border-b border-border bg-surface-1 px-3 py-1.5">
      <span className="text-xs uppercase tracking-wide text-ink-faint">
        {t("gap.short")}
      </span>
      <span className="tnum text-lg font-semibold text-ink">
        {fmt.duration(gap.gapSeconds)}
      </span>
      <span className="tnum text-xs text-ink-muted">{fmt.distance(gap.gapM)}</span>
      {gap.stale ? (
        <span className="ml-auto text-xs text-warn">
          {t("gap.stale", { age: fmt.age(gap.dataAgeSeconds) })}
        </span>
      ) : (
        <span className="ml-auto truncate text-xs text-ink-faint">{detail}</span>
      )}
    </div>
  );
}
