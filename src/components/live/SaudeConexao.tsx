"use client";

import { useFormat } from "@/lib/i18n/client";

import {
  POLL_INTERVAL_MS,
  type ConnectionState,
  type PanelHealth,
} from "./protocol";

/**
 * Saúde da conexão DO PRÓPRIO PAINEL.
 *
 * Um dashboard que congelou parecendo normal é pior que um que admite estar
 * desconectado. Esse é o modo de falha que este indicador existe para tornar
 * impossível: o WebSocket do Realtime cai sem fechar, o `subscribe` continua
 * dizendo que está inscrito, e a tela simplesmente para de mudar. Do lado de
 * dentro do browser, "a prova está tranquila" e "eu parei de receber" são
 * exatamente a mesma imagem.
 *
 * Por isso o que este componente exibe em destaque não é o estado do WebSocket
 * — é HÁ QUANTO TEMPO a última reconciliação completa deu certo. É o único
 * número que não pode mentir por omissão: ele cresce sozinho quando nada
 * acontece.
 *
 * Quando o painel está degradado ou caído, ele para de ser um selinho discreto
 * e vira uma faixa. A gradação é intencional: verde não pede nada, âmbar avisa
 * que a reação instantânea sumiu mas os números continuam certos, e vermelho
 * diz que o que está na tela é uma fotografia com hora marcada.
 */

export interface SaudeConexaoProps {
  connection: ConnectionState;
  health: PanelHealth;
  /** Epoch ms LOCAL — `lastPollOkMs` é medido no relógio do browser. */
  localNowMs: number;
  atualizando: boolean;
  onRecarregar: () => void;
  somBloqueado: boolean;
  onAtivarSom: () => void;
}

export function SaudeConexao({
  connection,
  health,
  localNowMs,
  atualizando,
  onRecarregar,
  somBloqueado,
  onAtivarSom,
}: SaudeConexaoProps) {
  const fmt = useFormat();

  const desdeSegundos =
    connection.lastPollOkMs === null
      ? null
      : Math.max(0, (localNowMs - connection.lastPollOkMs) / 1000);

  const estilo =
    health === "ok"
      ? "border-border bg-surface-2 text-ink-muted"
      : health === "degraded"
        ? "border-warn/60 bg-warn/12 text-warn"
        : "border-critical/70 bg-critical/15 text-critical";

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-1.5 text-xs ${estilo}`}
      role={health === "down" ? "alert" : undefined}
    >
      <span className="flex items-center gap-1.5 font-semibold">
        <span
          aria-hidden
          className={`inline-block h-2 w-2 rounded-full ${
            health === "ok"
              ? "bg-ok"
              : health === "degraded"
                ? "bg-warn"
                : "bg-critical"
          } ${health !== "ok" ? "alert-pulse" : ""}`}
        />
        {/* i18n: precisa de chaves — estados de saúde do painel */}
        {health === "ok"
          ? "Painel ao vivo"
          : health === "degraded"
            ? "Painel degradado"
            : "PAINEL SEM CONEXÃO"}
      </span>

      <span className="tnum">
        {/* i18n: precisa de chave — "reconciliado {age}" */}
        reconciliado {fmt.age(desdeSegundos)}
      </span>

      <span className="opacity-80">
        {/* i18n: precisa de chaves — estado do canal de tempo real */}
        tempo real:{" "}
        {connection.realtime === "connected"
          ? "ligado"
          : connection.realtime === "connecting"
            ? "conectando…"
            : "caído"}
      </span>

      {health === "down" ? (
        <span className="font-bold">
          {/* i18n: precisa de chave — o que está na tela não é o presente */}
          O que está na tela não é o presente. Confirme tudo pelo rádio.
        </span>
      ) : health === "degraded" && connection.realtime !== "connected" ? (
        <span>
          {/* i18n: precisa de chave — realtime caiu, polling continua */}
          sem atualização instantânea; reconciliando a cada{" "}
          <span className="tnum">{Math.round(POLL_INTERVAL_MS / 1000)} s</span>
        </span>
      ) : null}

      {connection.lastError && health !== "ok" ? (
        <span className="max-w-[24rem] truncate opacity-80" title={connection.lastError}>
          {connection.lastError}
        </span>
      ) : null}

      <button
        type="button"
        onClick={onRecarregar}
        disabled={atualizando}
        className="ml-auto rounded-md border border-current/40 px-2 py-0.5 font-medium hover:bg-current/10 disabled:opacity-50"
      >
        {/* i18n: precisa de chaves — "atualizar agora" / "atualizando…" */}
        {atualizando ? "atualizando…" : "atualizar agora"}
      </button>

      {/* Som bloqueado é uma promessa não cumprida: o diretor pode estar
          contando com o aviso sonoro que o navegador nunca deixou tocar. */}
      {somBloqueado ? (
        <button
          type="button"
          onClick={onAtivarSom}
          className="rounded-md border border-warn/60 bg-warn/15 px-2 py-0.5 font-semibold text-warn"
        >
          {/* i18n: precisa de chave — "som desligado — ativar" */}
          🔇 som desligado — ativar
        </button>
      ) : (
        <span className="opacity-70" title="Aviso sonoro ativo">
          🔔
        </span>
      )}
    </div>
  );
}
