"use client";

import { useEffect, useState } from "react";

import { useFormat, useT } from "@/lib/i18n/client";

import { carregarHistorico, type EventoDeAlerta } from "./acoes";

/**
 * Trilha de auditoria de um alerta.
 *
 * Fora do caminho quente de propósito: carrega sob demanda, ocupa zero pixel
 * enquanto ninguém pede, e nunca é o que separa o diretor do botão de acionar.
 * O momento de ler o histórico é depois — numa contestação, numa revisão
 * pós-prova — e nesse momento espera-se meio segundo sem problema.
 *
 * Os tipos de evento vêm crus do banco (`dispatch_declined`, `alert_raised`) e
 * são exibidos crus. Traduzi-los aqui criaria uma segunda lista de nomes que
 * ninguém lembra de atualizar quando o servidor inventa um evento novo — e um
 * histórico que esconde eventos que não conhece é pior que um histórico feio.
 */

export function HistoricoAlerta({ alertId }: { alertId: string }) {
  const fmt = useFormat();
  const t = useT();
  const [eventos, setEventos] = useState<EventoDeAlerta[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    void carregarHistorico(alertId).then((r) => {
      if (!ativo) return;
      setEventos(r.eventos);
      setErro(r.erro ?? null);
    });

    return () => {
      ativo = false;
    };
  }, [alertId]);

  if (erro) {
    return (
      <p className="mt-2 text-xs text-warn" role="alert">
        {erro}
      </p>
    );
  }

  if (eventos === null) {
    return (
      <p className="mt-2 text-xs text-ink-faint">
        {t("live.loadingHistory")}
      </p>
    );
  }

  if (eventos.length === 0) {
    return (
      <p className="mt-2 text-xs text-ink-faint">
        {t("live.noEvents")}
      </p>
    );
  }

  return (
    <ol className="mt-2 space-y-1.5 border-l border-border pl-3 text-xs">
      {eventos.map((e) => (
        <li key={e.id} className="text-ink-muted">
          <span className="tnum text-ink-faint">{fmt.clock(e.createdAt, true)}</span>{" "}
          <span className="font-mono text-ink">{e.type}</span>{" "}
          <span className="text-ink-faint">({e.actorType})</span>
          {resumoDoPayload(e.payload) ? (
            <span className="text-ink-faint"> — {resumoDoPayload(e.payload)}</span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/** Uma linha do payload, sem despejar JSON na cara de quem está com pressa. */
function resumoDoPayload(payload: Record<string, unknown>): string {
  const partes: string[] = [];

  for (const chave of ["label", "reason", "note", "positionId", "previousStatus"]) {
    const valor = payload[chave];
    if (typeof valor === "string" && valor.trim()) {
      partes.push(chave === "label" ? valor : `${chave}: ${valor}`);
    }
  }

  return partes.join(" · ").slice(0, 220);
}
