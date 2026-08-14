"use client";

import { useEffect, useState } from "react";

import { useT } from "@/lib/i18n/client";
import type { DriverAlertView } from "@/lib/driver/protocol";
import type { DriverSnapshot } from "@/lib/driver/runtime";
import { ALERT_CATEGORY_META, type AlertCategory } from "@/lib/types";

/**
 * Botões de alerta e o retorno do que aconteceu com eles.
 *
 * Três decisões, todas contra o mesmo inimigo: o alerta que não sai, e o alerta
 * que sai sem querer.
 *
 *  - ACIDENTE PEDE CONFIRMAÇÃO, os outros não. Um toque acidental no bolso
 *    mobilizando a ambulância é um custo real; um toque acidental abrindo
 *    "apoio mecânico" é ruído. A confirmação é UM toque a mais, no mesmo lugar
 *    da tela, e expira sozinha em 6 s — quem tocou sem querer não precisa fazer
 *    nada, e quem tocou de propósito não precisa procurar nada.
 *
 *  - O ESTADO É LITERAL. "Na fila, sem sinal" aparece enquanto o servidor não
 *    confirmou, por mais desconfortável que seja de ler. O motorista precisa
 *    saber que a direção AINDA NÃO SABE, porque a decisão dele muda: ele pega
 *    o rádio.
 *
 *  - O LAÇO SE FECHA NA TELA DE QUEM CHAMOU. "Ambulância 1 acionada" → "está a
 *    caminho" → "chegou ao local". Sem isso o motorista fica olhando para um
 *    alerta enviado sem saber se alguém vem, que é quase o mesmo que não ter
 *    avisado.
 */

const CONFIRM_TIMEOUT_MS = 6000;

export interface AlertPadProps {
  snapshot: DriverSnapshot;
  onRaise: (category: AlertCategory) => Promise<void>;
}

export function AlertPad({ snapshot, onRaise }: AlertPadProps) {
  const t = useT();
  const [confirming, setConfirming] = useState<AlertCategory | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(null), CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

  async function fire(category: AlertCategory) {
    setBusy(true);
    setConfirming(null);
    try {
      await onRaise(category);
    } finally {
      setBusy(false);
    }
  }

  function handlePress(category: AlertCategory) {
    // Só a categoria crítica passa pela confirmação.
    if (ALERT_CATEGORY_META[category].defaultPriority === "critical" && confirming !== category) {
      setConfirming(category);
      return;
    }
    void fire(category);
  }

  return (
    <section aria-label={t("alerts.title")} className="flex flex-col gap-2 p-3">
      <MyAlerts snapshot={snapshot} />

      <div className="grid gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => handlePress("medical")}
          className={`touch-target flex items-center justify-center gap-3 rounded-xl px-4 py-4 text-lg font-bold transition ${
            confirming === "medical"
              ? "alert-pulse bg-critical text-white"
              : "border-2 border-critical bg-critical-dim/40 text-ink"
          }`}
        >
          <span aria-hidden="true" className="text-2xl">
            {ALERT_CATEGORY_META.medical.icon}
          </span>
          {confirming === "medical"
            ? t("alerts.confirmMedical")
            : t("alerts.categories.medical.label")}
        </button>

        {confirming === "medical" ? (
          <>
            <p className="px-1 text-xs text-ink-muted">{t("alerts.confirmMedicalBody")}</p>
            <button
              type="button"
              onClick={() => setConfirming(null)}
              className="touch-target rounded-xl border border-border bg-surface-2 px-4 text-sm font-medium text-ink-muted"
            >
              {t("common.cancel")}
            </button>
          </>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => handlePress("mechanical")}
            className="touch-target flex items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface-2 px-3 py-3 font-semibold text-ink"
          >
            <span aria-hidden="true">{ALERT_CATEGORY_META.mechanical.icon}</span>
            {t("alerts.categories.mechanical.short")}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => handlePress("other")}
            className="touch-target flex items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface-2 px-3 py-3 font-semibold text-ink"
          >
            <span aria-hidden="true">{ALERT_CATEGORY_META.other.icon}</span>
            {t("alerts.categories.other.short")}
          </button>
        </div>
      </div>
    </section>
  );
}

interface Line {
  key: string;
  category: AlertCategory;
  createdAt: string;
  label: string;
  detail: string | null;
  tone: "pending" | "delivered" | "handled";
}

function MyAlerts({ snapshot }: { snapshot: DriverSnapshot }) {
  const t = useT();
  const lines = buildLines(snapshot, t);

  if (lines.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1">
      {lines.map((line) => (
        <li
          key={line.key}
          className={`rounded-lg border px-3 py-2 text-sm ${
            line.tone === "pending"
              ? "border-warn/60 bg-warn-dim/25 text-ink"
              : line.tone === "delivered"
                ? "border-ok/50 bg-ok-dim/25 text-ink"
                : "border-border bg-surface-2 text-ink-muted"
          }`}
        >
          <span aria-hidden="true">{ALERT_CATEGORY_META[line.category].icon} </span>
          <strong className="font-semibold">
            {t(`alerts.categories.${line.category}.short`)}
          </strong>
          {" — "}
          {line.label}
          {line.detail ? (
            <span className="mt-0.5 block text-xs text-ink-muted">{line.detail}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

type Translate = ReturnType<typeof useT>;

function buildLines(snapshot: DriverSnapshot, t: Translate): Line[] {
  const lines = new Map<string, Line>();

  for (const alert of snapshot.state?.alerts ?? []) {
    if (!alert.raisedBySelf) continue;
    lines.set(alert.clientAlertId, {
      key: alert.alertId,
      category: alert.category,
      createdAt: alert.createdAt,
      ...describeOwnAlert(alert, t),
    });
  }

  // A fila tem a última palavra: se o alerta ainda está aqui, ele não foi
  // confirmado, e a UI não pode dizer que chegou.
  for (const pending of snapshot.pendingAlerts) {
    lines.set(pending.clientAlertId, {
      key: pending.clientAlertId,
      category: pending.category,
      createdAt: pending.createdAt,
      tone: "pending",
      label: snapshot.connection === "sending" ? t("alerts.sending") : t("alerts.queued"),
      detail:
        pending.attempts > 0
          ? /* i18n: precisa de chave — contagem de tentativas e instrução de rádio */
            `${pending.attempts} tentativa(s) sem sucesso. Avise pelo rádio.`
          : null,
    });
  }

  return [...lines.values()]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 4);
}

function describeOwnAlert(
  alert: DriverAlertView,
  t: Translate,
): Pick<Line, "label" | "tone" | "detail"> {
  const who = alert.dispatch?.label ?? "";

  if (alert.status === "resolved" || alert.status === "cancelled") {
    return { label: t(`alerts.status.${alert.status}`), tone: "handled", detail: null };
  }

  if (alert.dispatch?.onSceneAt) {
    return {
      label: t("alerts.dispatch.onScene", { position: who }),
      tone: "delivered",
      detail: null,
    };
  }

  if (alert.dispatch?.acknowledgedAt) {
    return {
      label: t("alerts.dispatch.enRoute", { position: who }),
      tone: "delivered",
      detail: alert.dispatch.reason,
    };
  }

  if (alert.dispatch) {
    return {
      label: t("alerts.dispatch.called", { position: who }),
      tone: "delivered",
      detail: alert.dispatch.reason,
    };
  }

  // Gravado, visível para todos, mas sem ninguém designado. É a situação que o
  // motorista PRECISA ver: o alerta chegou e mesmo assim ninguém está indo.
  return {
    label: t("alerts.delivered"),
    tone: "pending",
    detail: t("alerts.dispatch.noneAvailable"),
  };
}
