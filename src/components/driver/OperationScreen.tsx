"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

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
  const fmt = useFormat();

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

  /**
   * O que ESTE APARELHO já respondeu, guardado até o servidor confirmar.
   *
   * Sem isto a tela cheia de acionamento VOLTAVA sozinha, e voltava no pior
   * momento possível. A sequência: o motorista toca "Estou indo", a resposta
   * entra na fila local, a fila é enviada e esvazia — e o `acknowledgedAt` do
   * servidor só chega na próxima leitura de estado, que é 10 s depois com a
   * tela à frente e 30 s com ela atrás. Nessa janela o alerta volta a parecer
   * não respondido, a tela cheia reaparece, e o motorista responde de novo.
   *
   * Foi exatamente o que apareceu no teste de campo como "essa ação repetiu
   * algumas vezes". Não era lag: era a fila esvaziando antes de a confirmação
   * chegar.
   *
   * É `ref` e não estado porque isto não desenha nada sozinho — quem
   * redesenha é a leitura de estado que chega logo em seguida. E é por
   * APARELHO, não persistido: se o motorista recarregar a página antes de o
   * servidor registrar, ver a tela de novo é o certo, porque aí ninguém sabe
   * que ele respondeu.
   */
  const respondidosLocalmente = useRef<Set<string>>(new Set());
  for (const id of answeredIds) respondidosLocalmente.current.add(id);

  const isAnswered = (alert: DriverAlertView) =>
    Boolean(alert.dispatch?.acknowledgedAt) ||
    answeredIds.has(alert.alertId) ||
    respondidosLocalmente.current.has(alert.alertId);

  // A tela cheia é só até o motorista responder, e só para UM acionamento por
  // vez — o mais antigo, que é o que está esperando há mais tempo. Depois disso
  // ele está dirigindo até lá e precisa do mapa; os acionamentos aceitos
  // continuam visíveis nas faixas. Uma resposta ainda na fila conta como
  // respondida: ele já decidiu, e prendê-lo numa tela cheia porque a rede caiu
  // seria punir o sinal ruim.
  const takeover = dispatchedToMe.find((a) => !isAnswered(a)) ?? null;
  const enRoute = dispatchedToMe.filter((a) => isAnswered(a));

  // Alerta encerrado sai do conjunto. Sem isto ele cresceria a prova inteira,
  // e um alerta reacionado para o mesmo veículo nunca mais mostraria a tela.
  const idsVivos = new Set(dispatchedToMe.map((a) => a.alertId));
  for (const id of respondidosLocalmente.current) {
    if (!idsVivos.has(id)) respondidosLocalmente.current.delete(id);
  }

  const distanceToAlert = (alert: DriverAlertView | null) =>
    alert && alert.routeOffsetM != null && selfOffsetM != null
      ? alert.routeOffsetM - selfOffsetM
      : null;

  const serverTimeMs = state ? Date.parse(state.serverTime) : null;

  return (
    <div className="flex h-dvh flex-col bg-surface-0">
      <StatusBar snapshot={snapshot} session={session} onUnbind={onUnbind} />

      {/* VOCÊ FICOU INVISÍVEL PARA A DIREÇÃO.
          O navegador congela a aba que sai da frente, e com ela o GPS. O
          motorista volta, vê o ponto verde de "transmitindo" e não tem como
          saber que ficou minutos fora do mapa — a barra de estado mostra o
          AGORA, e agora está tudo bem. Este é o único lugar que conta o
          passado.

          Âmbar e não vermelho: não é socorro, é o sistema admitindo o que
          deixou de saber. E fica até o motorista tocar, porque um aviso que
          some sozinho é um aviso que ele pode nunca ter visto. */}
      {snapshot.gapSemTransmitirS !== null ? (
        <button
          type="button"
          onClick={() => runtime.reconhecerLacuna()}
          className="border-b border-warn-line bg-warn-dim px-4 py-3 text-left text-sm text-warn-ink"
        >
          <span className="font-semibold">
            {t("driver.gapWarning", {
              age: fmt.age(snapshot.gapSemTransmitirS),
            })}
          </span>{" "}
          {t("driver.gapWarningBody")}
          <span className="mt-1 block font-mono text-[0.65rem] uppercase tracking-[0.16em] opacity-70">
            {t("driver.tapToDismiss")}
          </span>
        </button>
      ) : null}

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
          basemap={state?.race.basemap ?? null}
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
            className="font-mono uppercase tracking-[0.12em] touch-target bg-ink px-6 py-4 text-lg font-semibold text-surface-0 transition hover:bg-ink/85"
          >
            {t("driver.bindAction")}
          </button>
          {snapshot.queuedAlerts > 0 ? (
            <p className="text-sm font-medium text-warn">
              {t("driver.queuedAlerts", { count: snapshot.queuedAlerts })}
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
    ? t("driver.pingRejected")
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
        <p
          role="alert"
          className="border-t border-critical bg-critical-dim/50 px-3 py-2 text-xs font-semibold text-ink"
        >
          {t("driver.pingRejectedDetail", {
            count: snapshot.rejectedPings.count,
          })}
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
              {/* A instrução por sistema operacional é a parte ACIONÁVEL da
                  mensagem: sem ela o motorista sabe que está bloqueado e não
                  sabe o que fazer. */}
              {snapshot.gps === "denied" && snapshot.gpsMessageKey ? (
                <span className="block text-ink-muted">
                  {t(snapshot.gpsMessageKey)}
                </span>
              ) : null}
            </span>
          ) : null}
          {!snapshot.durableQueue ? (
            <span className="text-warn">{t("driver.queueNotDurable")}</span>
          ) : null}
          {/* O último erro de comunicação vem do servidor ou da rede, já em
              texto livre — não há chave possível para ele, e escondê-lo seria
              pior: sem isto o motorista não sabe que o app está falando
              sozinho. */}
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
            className="font-mono uppercase tracking-[0.12em] touch-target w-full border border-border-strong px-4 text-sm text-ink-muted"
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
    /*
     * QUEM ENCOLHE É A GLOSA, NUNCA O NÚMERO.
     *
     * A intenção sempre foi essa — só o detalhe tinha `truncate`. Mas sem
     * `shrink-0` o flex apertava os números primeiro, e "45 mins" e "21,1 km"
     * quebravam no meio numa tela de celular. A janela é o dado mais
     * importante desta tela; vê-la partida em duas linhas enquanto sobra uma
     * frase explicativa cortada é a troca errada.
     *
     * `min-w-0` no detalhe porque `truncate` não faz nada num filho de flex
     * que se recusa a encolher abaixo do próprio conteúdo.
     */
    <div className="flex items-baseline gap-2 border-b border-border bg-surface-1 px-3 py-1.5">
      <span className="shrink-0 whitespace-nowrap font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-faint">
        {t("gap.short")}
      </span>
      <span className="tnum shrink-0 whitespace-nowrap text-lg font-semibold text-ink">
        {fmt.duration(gap.gapSeconds)}
      </span>
      <span className="tnum shrink-0 whitespace-nowrap text-xs text-ink-muted">
        {fmt.distance(gap.gapM)}
      </span>
      {gap.stale ? (
        // O aviso de dado velho NÃO trunca: é a única coisa aqui que muda o
        // que o motorista deve fazer, e meia frase de alerta não serve.
        <span className="ml-auto shrink-0 whitespace-nowrap text-xs text-warn">
          {t("gap.stale", { age: fmt.age(gap.dataAgeSeconds) })}
        </span>
      ) : (
        <span className="ml-auto min-w-0 truncate text-xs text-ink-faint">
          {detail}
        </span>
      )}
    </div>
  );
}
