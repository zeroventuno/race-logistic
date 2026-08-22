"use client";

import { VehicleIcon } from "@/components/icons/vehicle";
import { useFormat, useT } from "@/lib/i18n/client";
import { ROLE_META } from "@/lib/types";

import {
  gapAdvice,
  gapIsTrustworthy,
  serverAgeSeconds,
  type GapBand,
  type GapEndpointView,
  type LiveGapView,
  type LiveRaceView,
} from "./protocol";

/**
 * A janela abertura ↔ fechamento — o número que libera ou não libera uma rua.
 *
 * Quatro coisas aparecem SEMPRE, juntas, porque separadas elas mentem:
 *
 *  1. O TEMPO, grande. É o que o diretor fala no rádio.
 *  2. A DISTÂNCIA pela estrada, ao lado. Tempo sozinho esconde que o vassoura
 *     pode estar parado; distância sozinha esconde que a estrada é lenta.
 *  3. O MÉTODO. "Medido" é observação: os dois veículos passaram pelo mesmo
 *     ponto e a diferença de horário é um fato. "Projetado" é extrapolação:
 *     distância dividida por velocidade média, que assume que o fechamento vai
 *     continuar no mesmo ritmo. Decidir fechar uma rua olhando um ou outro são
 *     decisões de confiança diferente, e esconder qual é qual é a forma mais
 *     eficiente de fazer o painel mentir sem dizer nada falso.
 *  4. A COMPARAÇÃO com a janela alvo da prova, e com os limites, quando eles
 *     existem.
 *
 * E quando o dado está velho ou o relógio de um aparelho está errado, o número
 * PERDE o status de número: ele continua na tela — apagá-lo esconderia
 * informação — mas riscado de âmbar, com a idade escrita ao lado e a ressalva
 * escrita por extenso. Preferir "não sei" a um número bonito e errado é a regra
 * inteira desta tela.
 */

export interface JanelaGapProps {
  gap: LiveGapView;
  race: LiveRaceView;
  /** Relógio do SERVIDOR, para a idade do dado. */
  nowMs: number;
  /**
   * Versão de uma linha, para quando o cartão está grudado no alto de uma tela
   * estreita e rolada.
   *
   * Sobrevivem o NÚMERO e a DISTÂNCIA PARA O ALVO, porque juntos eles são a
   * decisão inteira: quanto tempo separa os dois carros, e se isso está dentro
   * do que a autoridade autorizou. O resto do cartão — distância pela estrada,
   * veredito escrito, ressalvas — é o porquê, e o porquê espera você rolar de
   * volta para cima.
   */
  compacta?: boolean;
}

const BAND_TOM: Record<GapBand, string> = {
  within: "border-ok/50 bg-ok/10 text-ok",
  over: "border-warn/50 bg-warn/10 text-warn",
  under: "border-warn/50 bg-warn/10 text-warn",
  no_limits: "border-border bg-surface-2 text-ink-muted",
  unknown: "border-border bg-surface-2 text-ink-faint",
};

export function JanelaGap({ gap, race, nowMs, compacta = false }: JanelaGapProps) {
  const t = useT();
  const fmt = useFormat();

  const confiavel = gapIsTrustworthy(gap);
  const idade = serverAgeSeconds(gap.lead?.receivedAt ?? null, nowMs);
  const idadeFechamento = serverAgeSeconds(gap.sweep?.receivedAt ?? null, nowMs);
  const idadeMaisVelha =
    idade === null || idadeFechamento === null
      ? (idade ?? idadeFechamento)
      : Math.max(idade, idadeFechamento);

  if (compacta) {
    // `bg-surface-1` sólido e não translúcido: esta faixa fica por cima do
    // conteúdo que rola por baixo, e vidro aqui deixaria dois textos
    // sobrepostos justamente no número que precisa ser lido de relance.
    return (
      <section
        aria-label={t("gap.title")}
        className={`flex items-center gap-3 border bg-surface-1 px-3 py-2 ${
          confiavel ? "border-border" : "border-warn/50"
        }`}
      >
        <span className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-ink-faint">
          {t("gap.short")}
        </span>

        <span className="medido tnum shrink-0 whitespace-nowrap text-2xl leading-none text-ink">
          {fmt.duration(gap.gapSeconds)}
        </span>

        {gap.deltaToTargetSeconds !== null ? (
          <span
            className={`tnum shrink-0 whitespace-nowrap text-sm ${
              Math.abs(gap.deltaToTargetSeconds) < 60
                ? "text-ink-faint"
                : "text-warn"
            }`}
          >
            {gap.deltaToTargetSeconds >= 0 ? "+" : "−"}
            {fmt.duration(Math.abs(gap.deltaToTargetSeconds))}
          </span>
        ) : null}

        <span className="ml-auto shrink-0">
          <SeloMetodo gap={gap} />
        </span>
      </section>
    );
  }

  return (
    <section
      aria-label={t("gap.title")}
      className={`border bg-surface-1 p-4 sm:p-5 ${
        confiavel ? "border-border" : "border-warn/50"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {t("gap.title")}
        </h2>
        <SeloMetodo gap={gap} />
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <p
            className={`medido tnum text-[3.5rem] leading-none sm:text-[4.5rem] ${
              confiavel ? "text-ink" : "text-warn"
            }`}
            style={
              confiavel
                ? undefined
                : {
                    // Hachura diagonal: o número continua legível e deixa de
                    // parecer um valor limpo. É a diferença entre "28 min" e
                    // "28 min, mas não confie".
                    backgroundImage:
                      "repeating-linear-gradient(135deg, rgb(255 167 38 / .16) 0 6px, transparent 6px 12px)",
                  }
            }
          >
            {fmt.duration(gap.gapSeconds)}
          </p>
          <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-faint">
            {t("gap.timeSeparation")}
          </p>
        </div>

        <div>
          <p className="medido tnum text-3xl leading-none text-ink-muted">
            {gap.gapM === null ? "—" : fmt.distance(gap.gapM)}
          </p>
          <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-faint">
            {t("gap.alongRoad")}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="tnum text-sm text-ink-muted">
            {t("gap.target", {
              duration: fmt.duration(race.targetGapSeconds),
            })}
            {gap.deltaToTargetSeconds !== null ? (
              <span
                className={
                  Math.abs(gap.deltaToTargetSeconds) < 60
                    ? " text-ink-faint"
                    : " text-ink"
                }
              >
                {" · "}
                {gap.deltaToTargetSeconds >= 0 ? "+" : "−"}
                {fmt.duration(Math.abs(gap.deltaToTargetSeconds))}
              </span>
            ) : null}
          </span>

          <SeloBanda gap={gap} confiavel={confiavel} />
        </div>
      </div>

      <div className="mt-4">
        <Veredito gap={gap} confiavel={confiavel} />
      </div>

      {/* Ressalvas. Vêm antes da explicação do método de propósito: elas
          invalidam o método, não o detalham. */}
      <div className="mt-4 space-y-2">
        {gap.clockSuspect ? (
          <Ressalva>
            {t("gap.clockSuspect")}
          </Ressalva>
        ) : null}

        {gap.stale && !gap.clockSuspect ? (
          <Ressalva>
            {t("gap.stale", { age: fmt.age(idadeMaisVelha) })}
          </Ressalva>
        ) : null}

        {gap.sweepAheadOfLead ? <Ressalva>{t("gap.sweepAhead")}</Ressalva> : null}

        {gap.lapsInferred && !gap.historyComplete ? (
          <Ressalva>
            {t("gap.lapsUncertain", { laps: race.laps })}
          </Ressalva>
        ) : null}

        <p className="text-sm text-ink-muted">{explicacao(gap, t, fmt)}</p>
      </div>

      <dl className="mt-4 grid gap-2 border-t border-border pt-3 sm:grid-cols-2">
        <Extremidade
          ponto={gap.lead}
          ausente={t("gap.noLead")}
          laps={race.laps}
          nowMs={nowMs}
        />
        <Extremidade
          ponto={gap.sweep}
          ausente={t("gap.noSweep")}
          laps={race.laps}
          nowMs={nowMs}
        />
      </dl>
    </section>
  );
}

function SeloMetodo({ gap }: { gap: LiveGapView }) {
  const t = useT();
  const estilo =
    gap.method === "measured"
      ? "border-ok/50 bg-ok/10 text-ok"
      : gap.method === "projected"
        ? "border-info/50 bg-info/10 text-info"
        : "border-warn/50 bg-warn/10 text-warn";

  return (
    <span
      className={`font-mono inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${estilo}`}
    >
      <span aria-hidden>
        {gap.method === "measured" ? "◉" : gap.method === "projected" ? "◌" : "⚠"}
      </span>
      {gap.method === "measured"
        ? t("gap.methodMeasured")
        : gap.method === "projected"
          ? t("gap.methodProjected")
          : t("gap.methodNone")}
    </span>
  );
}

/**
 * "Dentro da janela" / "esticou demais".
 *
 * Some quando o número não é confiável, e isso não é detalhe de estilo: um selo
 * verde de "✓ Dentro da janela" ao lado de um número que o próprio painel
 * acabou de marcar como suspeito é a contradição mais perigosa que esta tela
 * poderia produzir. O olho lê o selo, que é o mais fácil de ler, e a ressalva
 * vira decoração.
 */
function SeloBanda({ gap, confiavel }: { gap: LiveGapView; confiavel: boolean }) {
  const t = useT();
  const fmt = useFormat();

  if (gap.band === "unknown") return null;

  if (!confiavel) {
    return (
      <span className="inline-flex w-fit items-center border border-warn/45 bg-warn/10 px-2 py-0.5 text-xs text-warn">
        {t("gap.comparisonSuspended")}
      </span>
    );
  }

  if (gap.band === "no_limits") {
    return (
      <span
        className={`inline-flex w-fit items-center border px-2 py-0.5 text-xs ${BAND_TOM.no_limits}`}
      >
        {t("gap.noLimits")}
      </span>
    );
  }

  const limites = `${gap.minSeconds === null ? "—" : fmt.duration(gap.minSeconds)} – ${
    gap.maxSeconds === null ? "—" : fmt.duration(gap.maxSeconds)
  }`;

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 border px-2 py-0.5 text-xs font-semibold ${BAND_TOM[gap.band]}`}
    >
      {gap.band === "over" ? (
        <>
          ↗ {t("gap.overTarget")}
          <span className="font-normal"> · {t("gap.overTargetDetail")}</span>
        </>
      ) : gap.band === "under" ? (
        <>
          ↘ {t("gap.underTarget")}
          <span className="font-normal"> · {t("gap.underTargetDetail")}</span>
        </>
      ) : (
        <>
          ✓ {t("gap.withinTarget")}
        </>
      )}
      <span className="tnum font-normal opacity-80">({limites})</span>
    </span>
  );
}

/**
 * O veredito acionável: quanto fora do combinado, e o que fazer.
 *
 * A banda diz "esticou demais". Isto diz o que o diretor faz a respeito — e
 * por que, já que os dois lados custam coisas diferentes: adiantar prejudica a
 * prova, atrasar quebra o contrato de interdição com a autoridade. Sem a
 * consequência declarada, "adiantado 12 min" é só um número que não obriga
 * ninguém a nada.
 */
function Veredito({ gap, confiavel }: { gap: LiveGapView; confiavel: boolean }) {
  const t = useT();
  const fmt = useFormat();
  const conselho = gapAdvice(gap.gapSeconds, gap.targetSeconds, confiavel);

  if (conselho.drift === "unknown") return null;

  if (conselho.drift === "on_target") {
    return (
      <p className="flex items-baseline gap-2 text-sm text-ok">
        <span aria-hidden="true">✓</span>
        <span className="tnum">
          {t("gap.onTarget", {
            gap: fmt.duration(gap.gapSeconds),
            target: fmt.duration(gap.targetSeconds),
          })}
        </span>
      </p>
    );
  }

  const adiantado = conselho.drift === "ahead";

  return (
    <p
      className={`flex flex-col gap-1 border px-3 py-2 text-sm ${
        adiantado
          ? "border-info/45 bg-info/10 text-info"
          : "border-warn/50 bg-warn/10 text-warn"
      }`}
    >
      <span className="tnum font-semibold">
        {t(adiantado ? "gap.verdictAhead" : "gap.verdictBehind", {
          gap: fmt.duration(gap.gapSeconds),
          target: fmt.duration(gap.targetSeconds),
          drift: fmt.duration(conselho.driftSeconds),
        })}
      </span>
      <span className="font-medium text-ink">
        {t(adiantado ? "gap.remedyAhead" : "gap.remedyBehind")}{" "}
        <span className="font-normal text-ink-muted">
          {t(adiantado ? "gap.costAhead" : "gap.costBehind")}
        </span>
      </span>
    </p>
  );
}

function Ressalva({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="border border-warn/45 bg-warn/10 px-3 py-2 text-sm font-medium text-warn"
    >
      {children}
    </p>
  );
}

function Extremidade({
  ponto,
  ausente,
  laps,
  nowMs,
}: {
  ponto: GapEndpointView | null;
  ausente: string;
  laps: number;
  nowMs: number;
}) {
  const fmt = useFormat();
  const t = useT();

  if (!ponto) {
    return (
      <div className="text-sm text-warn">
        <span aria-hidden>⚠ </span>
        {ausente}
      </div>
    );
  }

  const idade = serverAgeSeconds(ponto.receivedAt, nowMs);

  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span aria-hidden className="self-center" style={{ color: ROLE_META[ponto.role].color }}>
        <VehicleIcon role={ponto.role} size={16} />
      </span>
      <span className="font-medium text-ink">{ponto.label}</span>
      <span className="tnum text-ink-muted">
        {ponto.routeOffsetM === null ? "—" : fmt.distance(ponto.routeOffsetM)}
      </span>
      {laps > 1 ? (
        <span className="tnum text-xs text-ink-faint">
          {t("race.lap", { lap: ponto.lap + 1, laps })}
        </span>
      ) : null}
      <span
        className={`tnum text-xs ${idade !== null && idade >= 45 ? "text-warn" : "text-ink-faint"}`}
        title={t("signal.lastSeen", { age: fmt.age(idade) })}
      >
        {fmt.age(idade)}
      </span>
    </div>
  );
}

/**
 * A frase que explica de onde veio o número.
 *
 * Montada a partir dos campos de `GapResult` e do dicionário, e não do campo
 * `explanation` — que já vem em português cravado da biblioteca de cálculo. Um
 * diretor italiano lendo o painel em italiano não pode receber a única frase
 * que explica o número em outro idioma.
 */
function explicacao(
  gap: LiveGapView,
  t: ReturnType<typeof useT>,
  fmt: ReturnType<typeof useFormat>,
): string {
  if (gap.method === "measured") return t("gap.measured");

  if (gap.method === "projected") {
    return t("gap.projected", {
      distance: fmt.distance(gap.gapM),
      speed: fmt.speed(gap.sweepSpeedMps),
    });
  }

  if (gap.sweepAheadOfLead) return t("gap.sweepAhead");
  if (!gap.lead && !gap.sweep) return t("gap.noBoth");
  if (gap.leadOffsetM === null) return t("gap.noLead");
  if (gap.sweepOffsetM === null) return t("gap.noSweep");

  return gap.sweepSpeedMps === null
    ? t("gap.noHistory", { distance: fmt.distance(gap.gapM) })
    : t("gap.sweepStopped", { distance: fmt.distance(gap.gapM) });
}
