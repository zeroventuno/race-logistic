"use client";

import { useEffect, useState } from "react";

import { AlertIcon } from "@/components/icons/alerta";
import { useFormat, useT } from "@/lib/i18n/client";
import { fraseOuTexto } from "@/lib/i18n/frase";
import type { DriverAlertView } from "@/lib/driver/protocol";
import type { DriverSnapshot } from "@/lib/driver/runtime";
import {
  JANELA_APOS_ENCERRAR_MS,
  encerradoHaMaisDe,
} from "@/lib/driver/alerta-encerrado";
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

export type RaiseResult = { ok: true } | { ok: false; error: string };

export interface AlertPadProps {
  snapshot: DriverSnapshot;
  onRaise: (category: AlertCategory) => Promise<RaiseResult>;
}

export function AlertPad({ snapshot, onRaise }: AlertPadProps) {
  const t = useT();
  const [confirming, setConfirming] = useState<AlertCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(null), CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

  /**
   * Dispara e — se não der para nem enfileirar — GRITA.
   *
   * O `catch` aqui não é higiene: sem ele, uma rejeição em `onRaise` (o
   * IndexedDB recusando escrita) era engolida pelo `try/finally`, o botão
   * piscava, e o alerta nunca existia. Nenhuma linha na lista, nenhum erro,
   * nada. É a falha silenciosa que este app inteiro existe para não ter.
   */
  async function fire(category: AlertCategory) {
    setBusy(true);
    setConfirming(null);
    setFailure(null);

    try {
      const result = await onRaise(category);
      if (!result.ok) setFailure(result.error);
    } catch (error) {
      setFailure((error as Error)?.message ?? "falha desconhecida");
    } finally {
      setBusy(false);
    }
  }

  const storageFailure = failure ?? snapshot.alertStorageError;

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
      {storageFailure ? (
        <p
          role="alert"
          className="alert-pulse border-2 border-critical bg-critical px-3 py-3 text-sm font-bold text-white"
        >
          {t("driver.alertNotSaved")}
          <span className="mt-1 block text-xs font-normal opacity-90">
            {t("driver.alertNotSavedDetail", { reason: storageFailure })}
          </span>
        </p>
      ) : null}

      <MyAlerts snapshot={snapshot} />

      <div className="grid gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => handlePress("medical")}
          className={`font-mono uppercase tracking-[0.12em] touch-target flex items-center justify-center gap-3 px-4 py-4 text-lg font-bold transition ${
            confirming === "medical"
              ? "alert-pulse bg-critical text-white"
              : "border-2 border-critical bg-critical-dim/40 text-ink"
          }`}
        >
          <AlertIcon category="medical" size={30} stroke={2.2} />
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
              className="font-mono uppercase tracking-[0.12em] touch-target border border-border bg-surface-2 px-4 text-sm font-medium text-ink-muted"
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
            className="font-mono uppercase tracking-[0.12em] touch-target flex items-center justify-center gap-2 border border-border-strong bg-surface-2 px-3 py-3 font-semibold text-ink"
          >
            <AlertIcon category="mechanical" size={20} />
            {t("alerts.categories.mechanical.short")}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => handlePress("other")}
            className="font-mono uppercase tracking-[0.12em] touch-target flex items-center justify-center gap-2 border border-border-strong bg-surface-2 px-3 py-3 font-semibold text-ink"
          >
            <AlertIcon category="other" size={20} />
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
  const fmt = useFormat();
  // A hora é lida na renderização, e quem renderiza é a leitura de estado que
  // chega a cada 10 s. A linha some, na prática, até 10 s depois de vencer a
  // janela — o que não muda nada para quem olha, e evita um timer só para
  // apagar um aviso que já não diz mais nada.
  const lines = buildLines(snapshot, t, fmt, Date.now());

  if (lines.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1">
      {lines.map((line) => (
        <li
          key={line.key}
          className={`border px-3 py-2 text-sm ${
            line.tone === "pending"
              ? "border-warn/60 bg-warn-dim/25 text-ink"
              : line.tone === "delivered"
                ? "border-ok/50 bg-ok-dim/25 text-ink"
                : "border-border bg-surface-2 text-ink-muted"
          }`}
        >
          <AlertIcon category={line.category} size={15} className="inline-block shrink-0" />
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

/**
 * Monta a lista dos MEUS alertas a partir de três fontes, nesta ordem de
 * precedência: fila local (não chegou), estado do servidor (autoritativo), e
 * confirmação guardada no aparelho.
 *
 * A terceira fonte existe por causa de um caso muito comum e muito ruim: o
 * alerta é confirmado, sai da fila, e o `/state` seguinte não chega porque o
 * sinal caiu logo depois. Sem ela, a linha SUMIA da tela — o motorista não via
 * "na fila", não via "recebido", não via nada.
 */
function buildLines(
  snapshot: DriverSnapshot,
  t: Translate,
  fmt: { distance: (m: number | null) => string },
  agoraMs: number,
): Line[] {
  const lines = new Map<string, Line>();

  for (const ack of snapshot.ackedAlerts) {
    lines.set(ack.clientAlertId, {
      key: ack.alertId,
      category: ack.category,
      createdAt: ack.createdAt,
      tone: ack.dispatchFailed ? "pending" : "delivered",
      label: t("alerts.delivered"),
      detail: ack.dispatchFailed
        ? t("alerts.dispatch.noneAvailable")
        : ack.dispatchLabel
          ? t("alerts.dispatch.called", { position: ack.dispatchLabel })
          : null,
    });
  }

  for (const alert of snapshot.state?.alerts ?? []) {
    if (!alert.raisedBySelf) continue;

    if (encerradoHaMaisDe(alert, agoraMs, JANELA_APOS_ENCERRAR_MS)) {
      /*
       * `delete`, e não `continue`.
       *
       * As três fontes escrevem no MESMO Map, com a mesma chave. A confirmação
       * guardada no aparelho já pôs esta linha aqui algumas dezenas de linhas
       * acima; pular agora deixaria aquela versão de pé, dizendo "entregue"
       * para sempre. O alerta sumiria da fonte autoritativa e continuaria na
       * tela pela fonte de reserva — que é o mesmo defeito com outra fachada.
       */
      lines.delete(alert.clientAlertId);
      continue;
    }

    lines.set(alert.clientAlertId, {
      key: alert.alertId,
      category: alert.category,
      createdAt: alert.createdAt,
      ...describeOwnAlert(alert, t, fmt),
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
          ? t("driver.alertAttempts", { count: pending.attempts })
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
  fmt: { distance: (m: number | null) => string },
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
      detail: fraseOuTexto(
        alert.dispatch.reasonParts,
        alert.dispatch.reason,
        t,
        fmt,
      ),
    };
  }

  if (alert.dispatch) {
    return {
      label: t("alerts.dispatch.called", { position: who }),
      tone: "delivered",
      detail: fraseOuTexto(
        alert.dispatch.reasonParts,
        alert.dispatch.reason,
        t,
        fmt,
      ),
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
