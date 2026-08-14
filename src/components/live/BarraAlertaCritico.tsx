"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { useFormat, useT } from "@/lib/i18n/client";
import { ALERT_CATEGORY_META, ROLE_META } from "@/lib/types";

import { acionarApoio, reconhecerAlerta } from "./acoes";
import {
  alertNeedsAttention,
  serverAgeSeconds,
  sortAlerts,
  type LiveAlertView,
} from "./protocol";

/**
 * A barra que não some.
 *
 * `position: fixed` no alto da janela, acima de tudo. Existe por um motivo
 * específico: o painel de alertas fica numa coluna que rola, e uma prova com
 * seis alertas ativos empurra o sétimo — o que acabou de chegar — para fora da
 * vista. Numa tela de emergência, "estava lá, era só rolar" não é defesa.
 *
 * Mostra UM alerta por vez, o mais urgente, com as duas ações que importam ao
 * alcance de um clique: reconhecer e acionar o primeiro apoio sugerido. O
 * contador ao lado diz quantos outros esperam. Empilhar todos aqui devolveria o
 * problema da rolagem para dentro da própria barra.
 *
 * Ela desaparece no instante em que o último alerta é reconhecido — porque uma
 * faixa vermelha permanente vira parte do cenário em vinte minutos, e a partir
 * daí o próximo acidente chega numa tela que já estava vermelha.
 */

export interface BarraAlertaCriticoProps {
  alerts: LiveAlertView[];
  usuarioId: string;
  podeEditar: boolean;
  nowMs: number;
  onAbrir: (alerta: LiveAlertView) => void;
  aoAgir: () => void;
  /**
   * Altura ocupada, em pixels, para o conteúdo abaixo reservar espaço.
   *
   * A barra é `fixed` e sai do fluxo — sem esta medida ela cobriria justamente
   * o número da janela quando a página está no topo. A altura muda com a
   * largura da janela (o conteúdo quebra em duas linhas), então é medida em vez
   * de chutada.
   */
  onAltura?: (px: number) => void;
}

export function BarraAlertaCritico({
  alerts,
  usuarioId,
  podeEditar,
  nowMs,
  onAbrir,
  aoAgir,
  onAltura,
}: BarraAlertaCriticoProps) {
  const t = useT();
  const fmt = useFormat();
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const raizRef = useRef<HTMLDivElement | null>(null);

  const pendentes = sortAlerts(alerts).filter(alertNeedsAttention);
  const alerta = pendentes[0];

  const alturaRef = useRef(onAltura);
  alturaRef.current = onAltura;

  useEffect(() => {
    const el = raizRef.current;
    if (!el) {
      alturaRef.current?.(0);
      return;
    }

    const observer = new ResizeObserver(() => {
      alturaRef.current?.(el.getBoundingClientRect().height);
    });
    observer.observe(el);
    alturaRef.current?.(el.getBoundingClientRect().height);

    return () => {
      observer.disconnect();
      alturaRef.current?.(0);
    };
  }, [alerta?.alertId]);

  if (!alerta) return null;

  const meta = ALERT_CATEGORY_META[alerta.category];
  const medico = alerta.category === "medical";
  const idade = serverAgeSeconds(alerta.receivedAt, nowMs);
  const primeiraSugestao = alerta.suggestions.find(
    (s) => s.positionId !== alerta.dispatch?.positionId,
  );

  return (
    <div
      ref={raizRef}
      role="alert"
      aria-live="assertive"
      className={`alert-pulse fixed inset-x-0 top-0 z-50 border-b-2 px-3 py-2 shadow-2xl sm:px-5 ${
        medico
          ? "border-critical bg-critical/95 text-surface-0"
          : "border-warn bg-warn/95 text-surface-0"
      }`}
    >
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-x-4 gap-y-2">
        <span aria-hidden className="text-2xl leading-none">
          {meta.icon}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-base font-bold leading-tight">
            {t(`alerts.categories.${alerta.category}.label`)}
            {pendentes.length > 1 ? (
              <span className="tnum ml-2 rounded-full bg-surface-0/25 px-2 py-0.5 text-xs">
                {/* i18n: precisa de chave — "+{n} sem reconhecer" */}+
                {pendentes.length - 1} sem reconhecer
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 truncate text-xs font-medium opacity-90">
            <span className="tnum">{fmt.age(idade)}</span>
            {alerta.raisedBy ? (
              <>
                {" · "}
                {/* Só o rótulo entra na interpolação: `t()` devolve texto, e um
                    pictograma dentro dele viraria a palavra "ambulance". */}
                {t("alerts.raisedBy", { position: alerta.raisedBy.label })}
              </>
            ) : null}
            {alerta.routeOffsetM !== null ? (
              <>
                {" · "}
                <span className="tnum">{fmt.distance(alerta.routeOffsetM)}</span>
              </>
            ) : null}
            {alerta.note ? <> · {alerta.note}</> : null}
          </p>
          {erro ? <p className="mt-0.5 text-xs font-bold">{erro}</p> : null}
        </div>

        {podeEditar ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            {!alerta.dispatch && primeiraSugestao ? (
              <button
                type="button"
                disabled={pendente}
                onClick={() => {
                  setErro(null);
                  iniciar(async () => {
                    const r = await acionarApoio(
                      alerta,
                      {
                        positionId: primeiraSugestao.positionId,
                        label: primeiraSugestao.label,
                        motivo: primeiraSugestao.reason,
                      },
                      usuarioId,
                    );
                    if (r.erro) setErro(r.erro);
                    aoAgir();
                  });
                }}
                className="min-h-11 border-2 border-surface-0/40 bg-surface-0/15 px-4 text-sm font-bold hover:bg-surface-0/25 disabled:opacity-50"
              >
                {t("alerts.dispatch.calling", {
                  position: primeiraSugestao.label,
                })}
              </button>
            ) : null}

            <button
              type="button"
              disabled={pendente}
              onClick={() => {
                setErro(null);
                iniciar(async () => {
                  const r = await reconhecerAlerta(alerta, usuarioId);
                  if (r.erro) setErro(r.erro);
                  aoAgir();
                });
              }}
              className="min-h-11 bg-surface-0 px-5 text-sm font-bold text-ink hover:bg-surface-1 disabled:opacity-50"
            >
              {t("alerts.actions.acknowledge")}
            </button>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => onAbrir(alerta)}
          className="shrink-0 text-xs font-semibold underline underline-offset-4"
        >
          {/* i18n: precisa de chave — "ver no mapa" */}
          ver no mapa
        </button>
      </div>
    </div>
  );
}
