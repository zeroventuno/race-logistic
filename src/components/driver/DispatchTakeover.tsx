"use client";

import { useState } from "react";

import { useFormat, useT } from "@/lib/i18n/client";
import type { DriverAlertView } from "@/lib/driver/protocol";
import { ALERT_CATEGORY_META } from "@/lib/types";

/**
 * "Você foi acionado".
 *
 * É o estado mais importante que este app pode mostrar, e por isso ele NÃO é um
 * banner, nem um cartão, nem uma notificação: ele toma a tela inteira. Um
 * motorista dirigindo olha para o celular por menos de um segundo, e nesse
 * segundo tem que ser impossível confundir isto com qualquer outra coisa.
 *
 * Dois botões, ambos enormes, ambos irreversíveis por natureza — e nenhum
 * "depois". "Não posso" existe e é grande de propósito: a alternativa a recusar
 * de forma clara é o motorista ignorar a tela, e um acionamento ignorado é um
 * alerta que continua parecendo atendido enquanto ninguém vai.
 *
 * A recusa REACIONA o próximo automaticamente no servidor. Por isso ela pode
 * ser um toque só: recusar não deixa a vítima sem ninguém, deixa o próximo mais
 * próximo a caminho.
 *
 * A tela cheia SAI assim que o motorista responde — inclusive quando a resposta
 * ainda está na fila offline. Manter o bloqueio depois disso seria esconder o
 * mapa de alguém que acabou de aceitar dirigir até um acidente, que é
 * exatamente quando ele precisa do mapa. O acionamento continua visível na
 * faixa `DispatchBanner`, com o botão de "cheguei".
 */

export interface DispatchTakeoverProps {
  alert: DriverAlertView;
  /** Distância pela rota até o alerta, se calculável. */
  distanceM: number | null;
  /** A resposta já está na fila esperando confirmação do servidor? */
  pendingAnswer: boolean;
  onRespond: (action: "on_my_way" | "arrived" | "decline", reason: string | null) => void;
}

export function DispatchTakeover({
  alert,
  distanceM,
  pendingAnswer,
  onRespond,
}: DispatchTakeoverProps) {
  const t = useT();
  const fmt = useFormat();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  const category = ALERT_CATEGORY_META[alert.category];
  const accepted = Boolean(alert.dispatch?.acknowledgedAt);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-surface-0/98 p-5 backdrop-blur">
      <header className="pt-6">
        <p
          className={`font-mono text-center text-sm font-bold uppercase tracking-[0.2em] ${
            alert.category === "medical" ? "text-critical" : "text-warn"
          }`}
        >
          {t("alerts.dispatch.youWereCalled")}
        </p>

        <p className="mt-6 text-center text-6xl" aria-hidden="true">
          {category.icon}
        </p>

        <h2 className="titulo mt-4 text-center font-bold text-ink text-4xl">
          {t(`alerts.categories.${alert.category}.label`)}
        </h2>

        {/* Sentido junto com a distância: "1,2 km" sozinho não diz se o
            motorista segue em frente ou dá meia-volta, e essa é a primeira
            decisão que ele precisa tomar. */}
        <p className="medido tnum mt-3 text-center text-2xl text-ink">
          {distanceM == null
            ? t("common.unknown")
            : `${fmt.distance(Math.abs(distanceM))} ${
                distanceM >= 0
                  ? t("alerts.dispatch.ahead")
                  : t("alerts.dispatch.behind")
              }`}
        </p>

        {alert.raisedBy ? (
          <p className="mt-2 text-center text-sm text-ink-muted">
            {t("alerts.raisedBy", { position: alert.raisedBy.label })}
          </p>
        ) : null}

        {alert.note ? (
          <p className="mt-4 border border-border bg-surface-2 px-4 py-3 text-center text-base text-ink">
            {alert.note}
          </p>
        ) : null}

        {pendingAnswer ? (
          <p className="mt-4 text-center text-sm font-medium text-warn">
            {t("alerts.queued")}
          </p>
        ) : null}
      </header>

      {declining ? (
        <section className="flex flex-col gap-3 pb-6">
          <label
            className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-muted"
            htmlFor="decline-reason"
          >
            {t("alerts.dispatch.declineReason")}
          </label>
          <input
            id="decline-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="font-mono uppercase tracking-[0.12em] touch-target border border-border-strong bg-surface-1 px-4 text-base text-ink"
          />
          <button
            type="button"
            onClick={() => onRespond("decline", reason.trim() || null)}
            className="font-mono uppercase tracking-[0.12em] touch-target bg-warn px-6 py-4 text-lg font-bold text-surface-0"
          >
            {t("alerts.dispatch.cantGo")}
          </button>
          <button
            type="button"
            onClick={() => setDeclining(false)}
            className="font-mono uppercase tracking-[0.12em] touch-target border border-border bg-surface-2 px-6 text-base text-ink-muted"
          >
            {t("common.cancel")}
          </button>
        </section>
      ) : (
        <section className="flex flex-col gap-3 pb-6">
          <button
            type="button"
            onClick={() => onRespond(accepted ? "arrived" : "on_my_way", null)}
            className="font-mono uppercase tracking-[0.12em] touch-target bg-ok px-6 py-6 text-2xl font-bold text-surface-0"
          >
            {accepted ? t("alerts.dispatch.arrived") : t("alerts.dispatch.onMyWay")}
          </button>

          <button
            type="button"
            onClick={() => setDeclining(true)}
            className="font-mono uppercase tracking-[0.12em] touch-target border-2 border-border-strong bg-surface-2 px-6 py-4 text-lg font-semibold text-ink"
          >
            {t("alerts.dispatch.cantGo")}
          </button>
        </section>
      )}
    </div>
  );
}

export interface DispatchBannerProps {
  alert: DriverAlertView;
  distanceM: number | null;
  /** A resposta ainda está na fila, sem confirmação do servidor. */
  pendingAnswer: boolean;
  onRespond: (action: "arrived" | "decline", reason: string | null) => void;
}

/**
 * Faixa do acionamento já aceito.
 *
 * Ocupa pouco espaço porque o motorista está DIRIGINDO até o local — o mapa
 * volta a ser a informação principal. Mas continua na tela o tempo todo: um
 * acionamento aceito que some da interface é um acionamento que o motorista
 * esquece no meio do caminho.
 */
export function DispatchBanner({
  alert,
  distanceM,
  pendingAnswer,
  onRespond,
}: DispatchBannerProps) {
  const t = useT();
  const fmt = useFormat();

  return (
    <div className="flex items-center gap-3 border-b border-ok/50 bg-ok-dim/30 px-3 py-2">
      <span aria-hidden="true" className="text-xl">
        {ALERT_CATEGORY_META[alert.category].icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">
          {t("alerts.dispatch.youWereCalled")}
          {distanceM != null
            ? ` · ${fmt.distance(Math.abs(distanceM))} ${
                distanceM >= 0 ? t("alerts.dispatch.ahead") : t("alerts.dispatch.behind")
              }`
            : ""}
        </p>
        {pendingAnswer ? (
          <p className="text-xs text-warn">{t("alerts.queued")}</p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onRespond("arrived", null)}
        className="font-mono uppercase tracking-[0.12em] touch-target shrink-0 bg-ok px-4 text-sm font-bold text-surface-0"
      >
        {t("alerts.dispatch.arrived")}
      </button>
    </div>
  );
}
