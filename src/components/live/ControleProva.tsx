"use client";

import Link from "next/link";

import { useState, useTransition } from "react";

import {
  encerrarProva,
  iniciarProva,
} from "@/app/(director)/dashboard/[raceId]/ao-vivo/actions";
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
  /** Enquadrar o percurso inteiro no mapa. */
  onEnquadrar?: () => void;
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
  onEnquadrar,
}: ControleProvaProps) {
  const t = useT();
  const fmt = useFormat();
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<"iniciar" | "encerrar" | null>(
    null,
  );
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

  // Há alguma ação para mostrar? Sem isto a faixa de ações renderizaria
  // vazia para um observador, e o `gap` da coluna abriria um buraco.
  const temAcoes =
    Boolean(onEnquadrar) ||
    (podeEditar &&
      (status === "draft" || status === "armed" || status === "live"));

  /*
   * TRÊS FAIXAS EXPLÍCITAS, e não um `flex-wrap` só.
   *
   * Isto era um contêiner único com seis irmãos soltos, e onde a linha
   * quebrava dependia do comprimento das palavras. Em português "Iniciar
   * prova" e "Enquadrar percurso" empurravam a segunda para baixo; em inglês
   * "Start race" cabia e subia para a linha do estado, encostada no selo de
   * rascunho — o botão mais consequente da tela grudado no rótulo que ele
   * contradiz.
   *
   * Layout que depende do tamanho da tradução é layout que só quebra na tela
   * de outra pessoa, num idioma que ninguém da equipe lê. Agrupar à mão custa
   * duas `div` e vale para os seis.
   */
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* A VOLTA PARA A LISTA DE PROVAS.
          Na tela Ao vivo o cabeçalho de prova não existe — o mapa ocupa a
          viewport — e eu tinha dito que este cartão carregaria a volta, e não
          carregava. Sobrava clicar no letreiro, que funciona e ninguém
          adivinha: logotipo que leva para casa é convenção de site, não de
          painel de operação. */}
        <Link
          href="/dashboard"
          className="-ml-1 inline-flex min-h-9 items-center gap-1.5 px-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-ink-faint transition hover:text-ink"
        >
          <span aria-hidden>←</span>
          {t("director.myRaces")}
        </Link>

        <span aria-hidden className="h-4 w-px bg-border" />

        <span className="flex items-center gap-2 text-sm">
          <span
            aria-hidden
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              status === "live"
                ? "bg-ok"
                : status === "finished"
                  ? "bg-ink-faint"
                  : "bg-warn"
            }`}
          />
          <span className="font-semibold text-ink">
            {t(`race.status.${status}`)}
          </span>
          {status === "live" && actualStart ? (
            <span className="tnum text-xs text-ink-muted">
              {t("live.startedAt", { time: fmt.clock(actualStart) })}
            </span>
          ) : null}
          {status === "finished" && finishedAt ? (
            <span className="tnum text-xs text-ink-muted">
              {t("live.finishedAt", { time: fmt.clock(finishedAt) })}
            </span>
          ) : null}
        </span>
      </div>

      {temAcoes ? (
        <div className="flex flex-wrap items-center gap-2">
          {podeEditar && (status === "draft" || status === "armed") ? (
            confirmando === "iniciar" ? (
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pendente}
                  onClick={() => executar(() => iniciarProva(raceId))}
                  className="min-h-9 bg-ok px-4 text-sm font-bold text-surface-0 disabled:opacity-50"
                >
                  {t("live.confirmStart")}
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
                  {t("live.confirmFinish")}
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

          {/* Enquadrar o percurso: ação de MAPA, mas mora aqui.
          Flutuando no canto do mapa ela brigava com a lista de veículos, que
          cresce — e uma prova de verdade tem uma dúzia deles. Aqui ela fica ao
          lado da outra ação da prova, num lugar de altura fixa, e o canto do
          mapa volta a ser do mapa. */}
          {onEnquadrar ? (
            <button
              type="button"
              onClick={onEnquadrar}
              className="min-h-9 border border-border-strong bg-surface-2 px-3 text-xs font-medium text-ink transition hover:border-ink"
            >
              {t("map.fitRoute")}
            </button>
          ) : null}
        </div>
      ) : null}

      {!pronta && (status === "draft" || status === "armed") ? (
        <span className="text-xs text-warn">{pendencias.join(" · ")}</span>
      ) : null}

      {erro ? (
        <span role="alert" className="text-xs font-medium text-warn">
          {erro}
        </span>
      ) : null}
    </div>
  );
}
