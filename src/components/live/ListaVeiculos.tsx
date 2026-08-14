"use client";

import { useMemo } from "react";

import { VehicleIcon } from "@/components/icons/vehicle";
import { useFormat, useT } from "@/lib/i18n/client";
import { ROLE_META, SIGNAL_META } from "@/lib/types";

import {
  groupVehicles,
  vehicleAgeSeconds,
  vehicleClockSuspect,
  vehicleSignal,
  type LiveVehicleView,
  type VehicleSort,
} from "./protocol";

/**
 * A lista lateral de veículos.
 *
 * Ela existe porque o mapa não responde a todas as perguntas. "Quem está sem
 * bateria", "quem ainda não vinculou o aparelho", "quem é o motorista da Moto
 * 3 para eu ligar agora" — nada disso cabe num marcador, e tudo isso é
 * perguntado em prova.
 *
 * A ordenação padrão é a POSIÇÃO NA PROVA, com quem está mais adiante no topo,
 * porque é assim que a direção pensa a corrida. Mas antes de qualquer critério
 * escolhido vem um grupo fixo: OS SEM SINAL. Eles sobem sempre, em qualquer
 * ordenação, separados por um cabeçalho — não como preferência de exibição, mas
 * porque são a única linha da lista em que a informação exibida não descreve o
 * presente. Um veículo sem sinal há três minutos é o próximo telefonema, e ele
 * não pode estar embaixo de mais doze linhas de gente que está bem.
 */

export interface ListaVeiculosProps {
  vehicles: LiveVehicleView[];
  nowMs: number;
  laps: number;
  sort: VehicleSort;
  onSort: (s: VehicleSort) => void;
  selecionado: string | null;
  onSelecionar: (positionId: string) => void;
}

const ORDENS: Array<{ valor: VehicleSort; rotulo: string }> = [
  // i18n: precisa de chaves — rótulos de ordenação da lista de veículos
  { valor: "prova", rotulo: "Posição na prova" },
  { valor: "ordinal", rotulo: "Cadastro" },
  { valor: "papel", rotulo: "Papel" },
];

export function ListaVeiculos({
  vehicles,
  nowMs,
  laps,
  sort,
  onSort,
  selecionado,
  onSelecionar,
}: ListaVeiculosProps) {
  const t = useT();

  const { semSinal, emOperacao } = useMemo(
    () => groupVehicles(vehicles, sort, nowMs),
    [vehicles, sort, nowMs],
  );

  return (
    <section
      aria-label={t("map.vehicles")}
      className="flex min-h-0 flex-col border border-border bg-surface-1"
    >
      <header className="border-b border-border px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-ink">
            {t("map.vehicles")}
          </h2>
          <span className="tnum text-xs text-ink-muted">{vehicles.length}</span>
        </div>

        <div className="mt-2 flex gap-1">
          {ORDENS.map((o) => (
            <button
              key={o.valor}
              type="button"
              onClick={() => onSort(o.valor)}
              aria-pressed={sort === o.valor}
              className={`border px-2 py-1 text-[11px] transition ${
                sort === o.valor
                  ? "border-info bg-info/15 font-semibold text-info"
                  : "border-border text-ink-muted hover:text-ink"
              }`}
            >
              {o.rotulo}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {semSinal.length > 0 ? (
          <>
            <p className="font-mono sticky top-0 z-10 bg-critical/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-critical backdrop-blur">
              {/* i18n: precisa de chave — cabeçalho do grupo sem sinal */}
              Sem sinal ({semSinal.length}) — a posição no mapa é uma lembrança
            </p>
            <ul>
              {semSinal.map((v) => (
                <LinhaVeiculo
                  key={v.positionId}
                  v={v}
                  nowMs={nowMs}
                  laps={laps}
                  selecionado={selecionado === v.positionId}
                  onSelecionar={onSelecionar}
                />
              ))}
            </ul>
          </>
        ) : null}

        <ul>
          {emOperacao.map((v) => (
            <LinhaVeiculo
              key={v.positionId}
              v={v}
              nowMs={nowMs}
              laps={laps}
              selecionado={selecionado === v.positionId}
              onSelecionar={onSelecionar}
            />
          ))}
        </ul>

        {vehicles.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-ink-muted">
            {/* i18n: precisa de chave — nenhuma posição cadastrada */}
            Nenhuma posição cadastrada nesta prova.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function LinhaVeiculo({
  v,
  nowMs,
  laps,
  selecionado,
  onSelecionar,
}: {
  v: LiveVehicleView;
  nowMs: number;
  laps: number;
  selecionado: boolean;
  onSelecionar: (positionId: string) => void;
}) {
  const t = useT();
  const fmt = useFormat();

  const sinal = vehicleSignal(v, nowMs);
  const idade = vehicleAgeSeconds(v, nowMs);
  const apagado = sinal === "stale" || sinal === "lost" || sinal === "never";
  const bateriaBaixa = v.batteryPct !== null && v.batteryPct <= 20;

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelecionar(v.positionId)}
        className={`flex w-full items-start gap-2 border-b border-border/60 px-3 py-2 text-left transition hover:bg-surface-2 ${
          selecionado ? "bg-surface-3" : ""
        }`}
      >
        <span
          aria-hidden
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm"
          style={{
            background: ROLE_META[v.role].color,
            border: `2px ${apagado ? "dashed" : "solid"} ${SIGNAL_META[sinal].color}`,
            opacity: sinal === "lost" || sinal === "never" ? 0.5 : 1,
          }}
        >
          <VehicleIcon role={v.role} size={17} stroke={2.2} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold text-ink">
              {v.label}
              {/* O selo de referência só aparece quando acrescenta informação.
                  Uma posição chamada "Abertura" não precisa de "(Abertura)"
                  colado — repetição gasta a largura da coluna e ensina o olho a
                  pular o selo justamente quando ele importa. */}
              {referenciaRedundante(v, t) ? null : (
                <span className="ml-1 text-[10px] font-normal text-ink-faint">
                  (
                  {v.isReferenceLead
                    ? t("roles.lead_car.short")
                    : t("roles.sweep_car.short")}
                  )
                </span>
              )}
            </span>
            <span
              className="tnum shrink-0 text-[11px] font-medium"
              style={{ color: SIGNAL_META[sinal].color }}
            >
              {sinal === "never" ? t("positions.notBound") : fmt.age(idade)}
            </span>
          </span>

          {/* Os números de um veículo sem sinal são a última leitura, não o
              presente. Continuam na tela (apagá-los esconderia informação) mas
              apagados, para não competirem com os de quem está transmitindo. */}
          <span
            className={`mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] ${
              sinal === "lost" || sinal === "never"
                ? "text-ink-faint opacity-70"
                : "text-ink-muted"
            }`}
          >
            {v.driverName ? <span className="truncate">{v.driverName}</span> : null}

            <span className="tnum">
              {v.routeOffsetM === null ? "—" : fmt.distance(v.routeOffsetM)}
            </span>

            {laps > 1 ? (
              <span className="tnum text-ink-faint">
                {/* i18n: precisa de chave — volta atual / volta desconhecida */}
                {v.lapKnown ? `volta ${v.lap + 1}/${laps}` : "volta ?"}
              </span>
            ) : null}

            <span className="tnum">{fmt.speed(v.rollingSpeedMps ?? v.speedMps)}</span>

            {v.batteryPct !== null ? (
              <span className={`tnum ${bateriaBaixa ? "font-bold text-warn" : ""}`}>
                {bateriaBaixa ? "🔋 " : ""}
                {v.batteryPct}%
              </span>
            ) : null}
          </span>

          {/* Confissões. Cada uma muda o que a linha acima significa. */}
          <span className="mt-0.5 flex flex-wrap gap-1.5 text-[10px]">
            {!v.bound ? (
              <Etiqueta tom="warn">{t("positions.notBound")}</Etiqueta>
            ) : null}
            {v.offRoute ? (
              /* i18n: precisa de chave — "fora do percurso" */
              <Etiqueta tom="warn">fora do percurso</Etiqueta>
            ) : null}
            {vehicleClockSuspect(v) ? (
              /* i18n: precisa de chave — "relógio do aparelho fora de hora" */
              <Etiqueta tom="warn">relógio fora de hora</Etiqueta>
            ) : null}
            {v.snapDistanceM !== null && v.snapDistanceM > 120 && !v.offRoute ? (
              /* i18n: precisa de chave — distância até o traçado */
              <Etiqueta tom="neutro">
                {fmt.distance(v.snapDistanceM)} do traçado
              </Etiqueta>
            ) : null}
          </span>
        </span>
      </button>
    </li>
  );
}

/** O rótulo da posição já diz que ela é a referência? */
function referenciaRedundante(
  v: LiveVehicleView,
  t: ReturnType<typeof useT>,
): boolean {
  if (!v.isReferenceLead && !v.isReferenceSweep) return true;

  const curto = v.isReferenceLead
    ? t("roles.lead_car.short")
    : t("roles.sweep_car.short");

  return v.label.toLocaleLowerCase().includes(curto.toLocaleLowerCase());
}

function Etiqueta({
  tom,
  children,
}: {
  tom: "warn" | "neutro";
  children: React.ReactNode;
}) {
  return (
    <span
      className={`rounded border px-1 py-px ${
        tom === "warn"
          ? "border-warn/50 bg-warn/10 text-warn"
          : "border-border bg-surface-2 text-ink-faint"
      }`}
    >
      {children}
    </span>
  );
}
