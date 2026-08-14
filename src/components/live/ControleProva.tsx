"use client";

import { useState, useTransition } from "react";

import { encerrarProva, iniciarProva } from "@/app/(director)/dashboard/[raceId]/ao-vivo/actions";
import { useFormat, useT } from "@/lib/i18n/client";
import type { RaceStatus } from "@/lib/types";

/**
 * Largada e encerramento.
 *
 * As únicas ações desta tela COM confirmação, e o critério é reversibilidade.
 * Reconhecer um alerta por engano custa um segundo de atenção; encerrar a prova
 * por engano tira o mapa da equipe inteira enquanto ela ainda está na estrada,
 * e o gatilho do banco não deixa desfazer com um clique.
 *
 * O botão de iniciar fica desabilitado enquanto houver pendência obrigatória no
 * checklist — sem percurso ou sem as duas referências, a janela abertura ↔
 * fechamento não existe, e um painel ao vivo sem janela é um mapa bonito que
 * não responde à única pergunta que a direção faz.
 */

export interface ControleProvaProps {
  raceId: string;
  status: RaceStatus;
  actualStart: string | null;
  finishedAt: string | null;
  podeEditar: boolean;
  /** Checklist obrigatório resolvido? */
  pronta: boolean;
  /** O que ainda falta, para o botão desabilitado poder explicar por quê. */
  pendencias: string[];
  aoMudar: () => void;
}

export function ControleProva({
  raceId,
  status,
  actualStart,
  finishedAt,
  podeEditar,
  pronta,
  pendencias,
  aoMudar,
}: ControleProvaProps) {
  const t = useT();
  const fmt = useFormat();
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<"iniciar" | "encerrar" | null>(null);
  const [pendente, iniciar] = useTransition();

  const executar = (acao: () => Promise<{ erro?: string }>) => {
    setErro(null);
    setConfirmando(null);
    iniciar(async () => {
      const r = await acao();
      if (r.erro) setErro(r.erro);
      aoMudar();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="flex items-center gap-2 text-sm">
        <span
          aria-hidden
          className={`inline-block h-2.5 w-2.5 rounded-full ${
            status === "live" ? "bg-ok" : status === "finished" ? "bg-ink-faint" : "bg-warn"
          }`}
        />
        <span className="font-semibold text-ink">{t(`race.status.${status}`)}</span>
        {status === "live" && actualStart ? (
          <span className="tnum text-xs text-ink-muted">
            {/* i18n: precisa de chave — "largada às {hora}" */}
            largada às {fmt.clock(actualStart)}
          </span>
        ) : null}
        {status === "finished" && finishedAt ? (
          <span className="tnum text-xs text-ink-muted">
            {/* i18n: precisa de chave — "encerrada às {hora}" */}
            encerrada às {fmt.clock(finishedAt)}
          </span>
        ) : null}
      </span>

      {podeEditar && (status === "draft" || status === "armed") ? (
        confirmando === "iniciar" ? (
          <span className="flex items-center gap-2">
            <button
              type="button"
              disabled={pendente}
              onClick={() => executar(() => iniciarProva(raceId))}
              className="min-h-9 bg-ok px-4 text-sm font-bold text-surface-0 disabled:opacity-50"
            >
              {/* i18n: precisa de chave — "confirmar largada" */}
              confirmar largada
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(null)}
              className="min-h-9 px-2 text-sm text-ink-muted underline underline-offset-4"
            >
              {t("common.cancel")}
            </button>
          </span>
        ) : (
          <button
            type="button"
            disabled={pendente || !pronta}
            onClick={() => setConfirmando("iniciar")}
            title={pronta ? undefined : pendencias.join(" · ")}
            className="min-h-9 bg-ink px-4 text-sm font-bold text-surface-0 transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ▶ {t("director.goLive")}
          </button>
        )
      ) : null}

      {podeEditar && status === "live" ? (
        confirmando === "encerrar" ? (
          <span className="flex items-center gap-2">
            <button
              type="button"
              disabled={pendente}
              onClick={() => executar(() => encerrarProva(raceId))}
              className="min-h-9 border border-warn bg-warn/20 px-4 text-sm font-bold text-warn disabled:opacity-50"
            >
              {/* i18n: precisa de chave — "confirmar encerramento" */}
              confirmar encerramento
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(null)}
              className="min-h-9 px-2 text-sm text-ink-muted underline underline-offset-4"
            >
              {t("common.cancel")}
            </button>
          </span>
        ) : (
          <button
            type="button"
            disabled={pendente}
            onClick={() => setConfirmando("encerrar")}
            className="min-h-9 border border-border-strong bg-surface-2 px-4 text-sm font-semibold text-ink transition hover:border-warn disabled:opacity-50"
          >
            ■ {t("director.finish")}
          </button>
        )
      ) : null}

      {!pronta && (status === "draft" || status === "armed") ? (
        <span className="text-xs text-warn">
          {/* i18n: precisa de chave — pendências que travam a largada */}
          {pendencias.join(" · ")}
        </span>
      ) : null}

      {erro ? (
        <span role="alert" className="text-xs font-medium text-warn">
          {erro}
        </span>
      ) : null}
    </div>
  );
}
