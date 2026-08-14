"use client";

import { useState } from "react";

import { useFormat, useT } from "@/lib/i18n/client";
import type {
  AlertConfirmationKind,
  AlertProximity,
  DriverAlertView,
} from "@/lib/driver/protocol";
import { ALERT_CATEGORY_META } from "@/lib/types";

/**
 * "Tem alguma coisa à frente."
 *
 * A faixa aparece quando existe um alerta ativo adiante no percurso, dentro do
 * raio daquela categoria. A distância é PELA ROTA: um acidente a 200 m em linha
 * reta, mas do outro lado do grampo, não está no caminho de ninguém e avisar
 * ali só ensinaria o motorista a ignorar a faixa.
 *
 * O botão de dispensar não apaga o alerta — só a faixa, e só até a próxima
 * mudança de estado. E ao lado dele ficam as duas confirmações colaborativas:
 * quem passou pelo local é a melhor fonte que a direção tem sobre um incidente
 * que ela não consegue ver.
 */

export interface ProximityBannerProps {
  proximity: AlertProximity[];
  alerts: DriverAlertView[];
  onConfirm: (alertId: string, kind: AlertConfirmationKind) => void;
}

export function ProximityBanner({ proximity, alerts, onConfirm }: ProximityBannerProps) {
  const t = useT();
  const fmt = useFormat();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState<string[]>([]);

  const nearest = proximity
    .filter((p) => !dismissed.includes(p.alertId))
    .sort((a, b) => a.distanceAheadM - b.distanceAheadM)[0];

  if (!nearest) return null;

  const alert = alerts.find((a) => a.alertId === nearest.alertId);
  const category = alert?.category ?? nearest.category;
  const answered = confirmed.includes(nearest.alertId);

  // Perto o bastante para o motorista estar vendo a cena com os próprios olhos:
  // é aqui que a confirmação colaborativa vale alguma coisa.
  const passing = nearest.distanceAheadM < 300;

  return (
    <div
      role="status"
      className={`border-b px-3 py-2 ${
        category === "medical"
          ? "border-critical/60 bg-critical-dim/40"
          : "border-warn/60 bg-warn-dim/30"
      }`}
    >
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="text-xl">
          {ALERT_CATEGORY_META[category].icon}
        </span>
        <p className="tnum flex-1 text-sm font-semibold text-ink">
          {passing
            ? t("alerts.proximity.passing")
            : t("alerts.proximity.ahead", {
                category: t(`alerts.categories.${category}.short`),
                distance: fmt.distance(nearest.distanceAheadM),
              })}
        </p>
        <button
          type="button"
          onClick={() => setDismissed((d) => [...d, nearest.alertId])}
          className="border border-border px-3 py-1 text-xs text-ink-muted"
        >
          {t("alerts.proximity.dismiss")}
        </button>
      </div>

      {passing && !answered ? (
        <div className="mt-2">
          <p className="text-xs text-ink-muted">{t("alerts.confirm.prompt")}</p>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmed((c) => [...c, nearest.alertId]);
                onConfirm(nearest.alertId, "still_there");
              }}
              className="font-mono uppercase tracking-[0.12em] touch-target flex-1 border border-border-strong bg-surface-2 px-2 text-sm font-medium text-ink"
            >
              {t("alerts.confirm.still_there")}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmed((c) => [...c, nearest.alertId]);
                onConfirm(nearest.alertId, "cleared");
              }}
              className="font-mono uppercase tracking-[0.12em] touch-target flex-1 border border-border-strong bg-surface-2 px-2 text-sm font-medium text-ink"
            >
              {t("alerts.confirm.cleared")}
            </button>
          </div>
        </div>
      ) : null}

      {answered ? (
        <p className="mt-1 text-xs text-ok">{t("alerts.confirm.thanks")}</p>
      ) : null}
    </div>
  );
}
