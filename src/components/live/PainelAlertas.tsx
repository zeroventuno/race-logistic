"use client";

import { useMemo, useState, useTransition } from "react";

import { VehicleIcon } from "@/components/icons/vehicle";
import { useFormat, useI18n, useT } from "@/lib/i18n/client";
import { LOCALE_META } from "@/lib/i18n/config";
import { ALERT_CATEGORY_META, ROLE_META, SIGNAL_META } from "@/lib/types";

import {
  acionarApoio,
  cancelarAlerta,
  reconhecerAlerta,
  resolverAlerta,
  type ResultadoAcao,
} from "./acoes";
import { HistoricoAlerta } from "./HistoricoAlerta";
import {
  alertHasNobodyGoing,
  alertIsActive,
  alertNeedsAttention,
  dispatchStage,
  sortAlerts,
  serverAgeSeconds,
  vehicleSignal,
  type LiveAlertSuggestionView,
  type LiveAlertView,
  type LiveVehicleView,
} from "./protocol";

/**
 * O painel de alertas — a coisa mais importante da tela.
 *
 * Duas regras governam tudo aqui.
 *
 * PRIMEIRA: um alerta que nenhum humano reconheceu é IMPOSSÍVEL de ignorar.
 * Ele pulsa, ele fica no topo, ele sai também numa barra fixa no alto da janela
 * (ver `BarraAlertaCritico`) e ele toca. O predicado é `acknowledged_by is
 * null` e não a data de reconhecimento — o gatilho do banco preenche a data
 * sozinho no acionamento automático, e usar a data apagaria o alarme de um
 * acidente que ninguém viu.
 *
 * SEGUNDA: toda ação urgente é UM CLIQUE, sem modal e sem confirmação.
 * Reconhecer é um clique. Resolver é um clique. Acionar ou TROCAR o apoio é um
 * clique — por isso as alternativas ficam desenhadas como botões prontos, com o
 * porquê ao lado, em vez de escondidas atrás de um menu. Um diálogo de
 * confirmação num painel de emergência não protege ninguém: ensina a clicar em
 * "sim" sem ler.
 *
 * A única exceção é CANCELAR, que é estado final e irreversível pelo gatilho do
 * banco. Ela pede um segundo clique no mesmo botão — sem sair do lugar, sem
 * empilhar janela.
 */

export interface PainelAlertasProps {
  alerts: LiveAlertView[];
  vehicles: LiveVehicleView[];
  usuarioId: string;
  podeEditar: boolean;
  nowMs: number;
  onFocarAlerta: (alerta: LiveAlertView) => void;
  /** Chamado depois de qualquer escrita, para reconciliar sem esperar 10 s. */
  aoAgir: () => void;
}

export function PainelAlertas({
  alerts,
  vehicles,
  usuarioId,
  podeEditar,
  nowMs,
  onFocarAlerta,
  aoAgir,
}: PainelAlertasProps) {
  const t = useT();
  const [mostrarEncerrados, setMostrarEncerrados] = useState(false);

  const ordenados = useMemo(() => sortAlerts(alerts), [alerts]);
  const ativos = ordenados.filter(alertIsActive);
  const encerrados = ordenados.filter((a) => !alertIsActive(a));
  const naoReconhecidos = ativos.filter(alertNeedsAttention).length;

  return (
    <section
      aria-label={t("alerts.title")}
      className="flex min-h-0 flex-col rounded-xl border border-border bg-surface-1"
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-ink">
          {t("alerts.title")}
          {ativos.length > 0 ? (
            <span
              className={`tnum rounded-full px-2 py-0.5 text-xs font-bold ${
                naoReconhecidos > 0
                  ? "bg-critical text-surface-0"
                  : "bg-surface-3 text-ink-muted"
              }`}
            >
              {ativos.length}
            </span>
          ) : null}
        </h2>

        {encerrados.length > 0 ? (
          <button
            type="button"
            onClick={() => setMostrarEncerrados((v) => !v)}
            className="text-xs text-ink-muted underline underline-offset-4 hover:text-ink"
          >
            {/* i18n: precisa de chave — "{n} encerrados" / "ocultar encerrados" */}
            {mostrarEncerrados
              ? "ocultar encerrados"
              : `${encerrados.length} encerrados`}
          </button>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {ativos.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface-2/50 px-4 py-6 text-center text-sm text-ink-muted">
            {t("alerts.none")}
          </p>
        ) : (
          ativos.map((a) => (
            <CartaoAlerta
              key={a.alertId}
              alerta={a}
              vehicles={vehicles}
              usuarioId={usuarioId}
              podeEditar={podeEditar}
              nowMs={nowMs}
              onFocar={() => onFocarAlerta(a)}
              aoAgir={aoAgir}
            />
          ))
        )}

        {mostrarEncerrados
          ? encerrados.map((a) => (
              <CartaoAlerta
                key={a.alertId}
                alerta={a}
                vehicles={vehicles}
                usuarioId={usuarioId}
                podeEditar={podeEditar}
                nowMs={nowMs}
                onFocar={() => onFocarAlerta(a)}
                aoAgir={aoAgir}
              />
            ))
          : null}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

function CartaoAlerta({
  alerta,
  vehicles,
  usuarioId,
  podeEditar,
  nowMs,
  onFocar,
  aoAgir,
}: {
  alerta: LiveAlertView;
  vehicles: LiveVehicleView[];
  usuarioId: string;
  podeEditar: boolean;
  nowMs: number;
  onFocar: () => void;
  aoAgir: () => void;
}) {
  const t = useT();
  const fmt = useFormat();
  const { locale } = useI18n();

  const [erro, setErro] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
  const [verHistorico, setVerHistorico] = useState(false);
  const [verTodosApoios, setVerTodosApoios] = useState(false);
  const [pendente, iniciar] = useTransition();

  const meta = ALERT_CATEGORY_META[alerta.category];
  const ativo = alertIsActive(alerta);
  const gritando = alertNeedsAttention(alerta);
  const semNinguem = alertHasNobodyGoing(alerta);
  const estagio = dispatchStage(alerta);
  const idade = serverAgeSeconds(alerta.receivedAt, nowMs);

  const executar = (acao: () => Promise<ResultadoAcao>) => {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if (r.erro) setErro(r.erro);
      aoAgir();
    });
  };

  const alternativas = useMemo(
    () =>
      apoiosAlternativos(
        alerta,
        vehicles,
        nowMs,
        verTodosApoios ? 12 : 3,
        LOCALE_META[locale]?.intlTag ?? "pt-BR",
      ),
    [alerta, vehicles, nowMs, verTodosApoios, locale],
  );

  const borda = gritando
    ? alerta.category === "medical"
      ? "border-critical bg-critical/10"
      : "border-warn bg-warn/8"
    : ativo
      ? "border-border-strong bg-surface-2/60"
      : "border-border bg-surface-2/25 opacity-75";

  return (
    <article
      className={`rounded-xl border-2 p-3 ${borda} ${gritando ? "alert-pulse" : ""}`}
    >
      {/* Cabeçalho: categoria grande, estado e idade. É a linha que responde
          "o que é isso e desde quando" sem precisar ler mais nada. */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span aria-hidden className="text-2xl leading-none">
            {meta.icon}
          </span>
          <div className="min-w-0">
            <p
              className={`text-base font-bold leading-tight ${
                gritando && alerta.category === "medical" ? "text-critical" : "text-ink"
              }`}
            >
              {t(`alerts.categories.${alerta.category}.label`)}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-muted">
              <span className="tnum">{fmt.age(idade)}</span>
              <span aria-hidden>·</span>
              <span className="tnum">{fmt.clock(alerta.receivedAt, true)}</span>
              {alerta.raisedBy ? (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    {/* A interpolação recebe só texto: o pictograma é um
                        elemento e não cabe dentro de uma string traduzida. */}
                    {t("alerts.raisedBy", { position: alerta.raisedBy.label })}
                  </span>
                </>
              ) : null}
              {alerta.routeOffsetM !== null ? (
                <>
                  <span aria-hidden>·</span>
                  <button
                    type="button"
                    onClick={onFocar}
                    className="tnum underline underline-offset-2 hover:text-ink"
                  >
                    {t("alerts.at", { km: kmDoPercurso(alerta.routeOffsetM, locale) })}
                  </button>
                </>
              ) : null}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
            gritando
              ? "border-critical/60 bg-critical/15 text-critical"
              : "border-border bg-surface-3 text-ink-muted"
          }`}
        >
          {t(`alerts.status.${alerta.status}`)}
        </span>
      </div>

      {alerta.note ? (
        <p className="mt-2 rounded-md bg-surface-0/60 px-2.5 py-1.5 text-sm text-ink">
          {alerta.note}
        </p>
      ) : null}

      {/* Estado do apoio acionado. */}
      <div className="mt-2.5">
        {alerta.dispatch ? (
          <div
            className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-2.5 py-1.5 text-sm ${
              estagio === "declined"
                ? "border-warn/50 bg-warn/10 text-warn"
                : estagio === "on_scene"
                  ? "border-ok/50 bg-ok/10 text-ok"
                  : "border-border-strong bg-surface-3 text-ink"
            }`}
          >
            <span aria-hidden className="shrink-0">
              <VehicleIcon role={alerta.dispatch.role} size={17} />
            </span>
            <span className="font-semibold">
              {estagio === "declined"
                ? t("alerts.dispatch.declined", { position: alerta.dispatch.label })
                : estagio === "on_scene"
                  ? t("alerts.dispatch.onScene", { position: alerta.dispatch.label })
                  : estagio === "en_route"
                    ? t("alerts.dispatch.enRoute", { position: alerta.dispatch.label })
                    : t("alerts.dispatch.called", { position: alerta.dispatch.label })}
            </span>
            {alerta.dispatch.dispatchedAt ? (
              <span className="tnum text-xs opacity-80">
                {fmt.clock(alerta.dispatch.dispatchedAt, true)}
              </span>
            ) : null}
            {alerta.dispatch.mode === "auto" ? (
              <span className="rounded border border-border px-1 text-[10px] uppercase tracking-wide opacity-80">
                {/* i18n: precisa de chave — "automático" */}
                automático
              </span>
            ) : null}
          </div>
        ) : ativo ? (
          <p
            role="alert"
            className="rounded-lg border border-critical/60 bg-critical/15 px-2.5 py-1.5 text-sm font-semibold text-critical"
          >
            {/* i18n: precisa de chave — "Ninguém foi acionado" */}
            ⚠ Ninguém foi acionado para este alerta.
          </p>
        ) : null}

        {alerta.dispatch?.reason ? (
          <p className="mt-1 text-xs text-ink-faint">{alerta.dispatch.reason}</p>
        ) : null}
      </div>

      {/* Confirmações vindas de quem passou pelo local. */}
      {alerta.confirmations.stillThere + alerta.confirmations.cleared > 0 ? (
        <p className="mt-2 flex gap-3 text-xs text-ink-muted">
          {alerta.confirmations.stillThere > 0 ? (
            <span className="tnum">
              {t("alerts.confirm.countStillThere", {
                count: alerta.confirmations.stillThere,
              })}
            </span>
          ) : null}
          {alerta.confirmations.cleared > 0 ? (
            <span className="tnum text-ok">
              {t("alerts.confirm.countCleared", {
                count: alerta.confirmations.cleared,
              })}
            </span>
          ) : null}
        </p>
      ) : null}

      {/* AÇÕES URGENTES. Um clique cada, sempre na mesma posição do cartão. */}
      {podeEditar && ativo ? (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {gritando ? (
              <button
                type="button"
                disabled={pendente}
                onClick={() => executar(() => reconhecerAlerta(alerta, usuarioId))}
                className="min-h-11 flex-1 rounded-lg bg-ink px-4 text-sm font-bold text-surface-0 transition hover:bg-white disabled:opacity-50"
              >
                {t("alerts.actions.acknowledge")}
              </button>
            ) : null}

            <button
              type="button"
              disabled={pendente}
              onClick={() => executar(() => resolverAlerta(alerta, usuarioId, nota))}
              className="min-h-11 flex-1 rounded-lg border border-ok/50 bg-ok/10 px-4 text-sm font-semibold text-ok transition hover:bg-ok/20 disabled:opacity-50"
            >
              ✓ {t("alerts.actions.resolve")}
            </button>
          </div>

          {/* Trocar o apoio: os candidatos já vêm desenhados como botões. Um
              menu aqui custaria um clique a mais em cima do único momento da
              prova em que ninguém tem cliques sobrando. */}
          {alternativas.length > 0 ? (
            <div className="mt-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                {alerta.dispatch
                  ? t("alerts.dispatch.reassign")
                  : /* i18n: precisa de chave — "Acionar apoio" */
                    "Acionar apoio"}
              </p>
              <ul className="space-y-1.5">
                {alternativas.map((s) => (
                  <li key={s.positionId}>
                    <button
                      type="button"
                      disabled={pendente}
                      onClick={() =>
                        executar(() =>
                          acionarApoio(
                            alerta,
                            {
                              positionId: s.positionId,
                              label: s.label,
                              motivo: s.reason,
                            },
                            usuarioId,
                          ),
                        )
                      }
                      className="flex w-full items-start gap-2 rounded-lg border border-border bg-surface-0/50 px-2.5 py-2 text-left transition hover:border-info hover:bg-surface-3 disabled:opacity-50"
                    >
                      <span
                        aria-hidden
                        className="tnum mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[11px] font-bold text-ink-muted"
                      >
                        {s.rank}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-ink">
                          <span aria-hidden style={{ color: ROLE_META[s.role].color }}>
                            <VehicleIcon role={s.role} size={16} />
                          </span>
                          {s.label}
                          {s.etaSeconds !== null ? (
                            <span className="tnum font-normal text-info">
                              ~{fmt.duration(s.etaSeconds)}
                            </span>
                          ) : null}
                          <span
                            className="rounded px-1 text-[10px] font-medium"
                            style={{
                              color: SIGNAL_META[s.signal].color,
                              border: `1px solid ${SIGNAL_META[s.signal].color}`,
                            }}
                          >
                            {t(`signal.${s.signal}`)}
                          </span>
                        </span>
                        {/* O PORQUÊ, não só o nome: é o que permite ao diretor
                            discordar do cálculo com base em algo. */}
                        {s.reason ? (
                          <span className="mt-0.5 block text-[11px] leading-snug text-ink-faint">
                            {s.reason}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => setVerTodosApoios((v) => !v)}
                className="mt-1.5 text-xs text-ink-muted underline underline-offset-4 hover:text-ink"
              >
                {/* i18n: precisa de chave — "ver todos os veículos" / "ver menos" */}
                {verTodosApoios ? "ver menos" : "ver todos os veículos"}
              </button>
            </div>
          ) : semNinguem ? (
            <p className="mt-3 rounded-lg border border-warn/45 bg-warn/10 px-2.5 py-2 text-xs text-warn">
              {t("alerts.dispatch.noneAvailable")}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder={t("alerts.actions.resolutionNote")}
              className="min-h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface-0 px-2.5 text-xs text-ink placeholder:text-ink-faint"
            />

            <button
              type="button"
              disabled={pendente}
              onClick={() => {
                if (!confirmandoCancelar) {
                  setConfirmandoCancelar(true);
                  return;
                }
                executar(() => cancelarAlerta(alerta, usuarioId, nota));
              }}
              onBlur={() => setConfirmandoCancelar(false)}
              className={`min-h-9 rounded-lg border px-2.5 text-xs transition ${
                confirmandoCancelar
                  ? "border-warn bg-warn/15 font-semibold text-warn"
                  : "border-border text-ink-faint hover:text-ink"
              }`}
            >
              {confirmandoCancelar
                ? /* i18n: precisa de chave — "confirmar cancelamento?" */
                  "confirmar? (alarme falso)"
                : t("alerts.actions.cancel")}
            </button>
          </div>
        </>
      ) : null}

      {!ativo && alerta.resolutionNote ? (
        <p className="mt-2 text-xs text-ink-faint">{alerta.resolutionNote}</p>
      ) : null}

      {erro ? (
        <p role="alert" className="mt-2 text-xs font-medium text-warn">
          {erro}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setVerHistorico((v) => !v)}
        className="mt-2 text-[11px] text-ink-faint underline underline-offset-4 hover:text-ink-muted"
      >
        {/* i18n: precisa de chave — "histórico" */}
        {verHistorico ? "ocultar histórico" : "histórico"}
      </button>

      {verHistorico ? <HistoricoAlerta alertId={alerta.alertId} /> : null}
    </article>
  );
}

// ---------------------------------------------------------------------------

/**
 * Candidatos a acionar, em ordem.
 *
 * As sugestões de `alert_suggestions` vêm primeiro e mantêm o `rank` e o texto
 * do PORQUÊ calculados no instante do alerta — que é o que a revisão pós-prova
 * precisa e o que o diretor precisa para discordar do sistema.
 *
 * Quando não há sugestão nenhuma (o acionamento automático falhou, ou todos os
 * despacháveis estavam sem sinal na hora), a lista NÃO fica vazia: ela cai para
 * os veículos despacháveis com sinal, ordenados pela distância no percurso até
 * o ponto do alerta. Essa ordem é declaradamente mais burra — não conhece
 * sentido de tráfego nem tempo de retorno — e o texto ao lado diz isso. Uma
 * lista vazia num alerta médico seria abandoná-lo; uma lista burra sem aviso
 * seria mentir. O caminho honesto é a lista com a ressalva.
 */
function apoiosAlternativos(
  alerta: LiveAlertView,
  vehicles: LiveVehicleView[],
  nowMs: number,
  limite: number,
  intlTag: string,
): LiveAlertSuggestionView[] {
  const acionado = alerta.dispatch?.positionId ?? null;

  const doServidor = alerta.suggestions
    .filter((s) => s.positionId !== acionado)
    .sort((a, b) => a.rank - b.rank);

  if (doServidor.length > 0) return doServidor.slice(0, limite);

  const origem = alerta.routeOffsetM;

  return vehicles
    .filter((v) => v.isDispatchable && v.positionId !== acionado)
    .filter((v) => {
      const sinal = vehicleSignal(v, nowMs);
      return sinal !== "lost" && sinal !== "never";
    })
    .map((v) => {
      const distancia =
        origem !== null && v.routeOffsetM !== null
          ? Math.abs(v.routeOffsetM - origem)
          : null;

      return {
        positionId: v.positionId,
        label: v.label,
        role: v.role,
        rank: 0,
        routeDistanceM: distancia,
        straightDistanceM: 0,
        etaSeconds: null,
        isAhead:
          origem !== null && v.routeOffsetM !== null
            ? v.routeOffsetM > origem
            : null,
        /* i18n: precisa de chave — ressalva da lista de emergência */
        reason:
          distancia === null
            ? "Sem sugestão calculada e sem posição na rota — ordem arbitrária. Confirme pelo rádio."
            : `Sem sugestão calculada. ${new Intl.NumberFormat(intlTag, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              }).format(distancia / 1000)} km de diferença no percurso, sem cálculo de retorno nem de ETA.`,
        signal: vehicleSignal(v, nowMs),
        ageSeconds: serverAgeSeconds(v.receivedAt, nowMs),
      } satisfies LiveAlertSuggestionView;
    })
    .sort((a, b) => {
      if (a.routeDistanceM === null) return 1;
      if (b.routeDistanceM === null) return -1;
      return a.routeDistanceM - b.routeDistanceM;
    })
    .slice(0, limite)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

function kmDoPercurso(metros: number, locale: string): string {
  const tag =
    LOCALE_META[locale as keyof typeof LOCALE_META]?.intlTag ?? "pt-BR";
  return new Intl.NumberFormat(tag, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(metros / 1000);
}
