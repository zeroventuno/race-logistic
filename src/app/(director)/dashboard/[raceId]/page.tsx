import Link from "next/link";

import { atualizarProva } from "@/app/(director)/_actions/race";
import { ProvaForm } from "@/components/director/ProvaForm";
import { StatusProvaBotao } from "@/components/director/StatusProvaBotao";
import { BotaoLink, Cartao, TituloSecao } from "@/components/director/ui";
import { VehicleIcon } from "@/components/icons/vehicle";
import { formatDistance, formatDuration } from "@/lib/i18n/format";
import { getTranslator } from "@/lib/i18n/server";
import { ROLE_META } from "@/lib/types";

import { formatElevationGain, formatInteger } from "../../_lib/format";
import { getRaceContext } from "../../_lib/session";
import { utcToZonedInputs } from "../../_lib/timezone";

export default async function ResumoDaProvaPage({
  params,
}: {
  params: Promise<{ raceId: string }>;
}) {
  const { raceId } = await params;
  const { race, positions, activeTrack, readiness, canEdit } =
    await getRaceContext(raceId);
  const { locale, t } = await getTranslator();

  const largada = utcToZonedInputs(race.scheduled_start, race.timezone);
  const voltas = (race as { laps?: number }).laps ?? 1;
  const lead = positions.find((p) => p.is_reference_lead);
  const sweep = positions.find((p) => p.is_reference_sweep);

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      {/* Checklist primeiro: é a resposta para a única pergunta que importa na
          véspera — "falta alguma coisa?". */}
      <Cartao className="p-5 sm:p-6">
        <TituloSecao
          acao={
            <span className="tnum text-sm text-ink-muted">
              {readiness.doneCount}/{readiness.requiredCount}
            </span>
          }
        >
          {t("director.setupChecklist")}
        </TituloSecao>

        <ul className="mt-4 space-y-2">
          {readiness.items.map((item) => (
            <li
              key={item.key}
              className={`flex items-start gap-3 border px-4 py-3 ${
                item.done
                  ? "border-border bg-surface-2/40"
                  : item.required
                    ? "border-warn/40 bg-warn/5"
                    : "border-border bg-surface-2/40"
              }`}
            >
              <span
                aria-hidden
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                  item.done
                    ? "bg-ok/20 text-ok"
                    : item.required
                      ? "bg-warn/20 text-warn"
                      : "bg-surface-3 text-ink-faint"
                }`}
              >
                {item.done ? "✓" : item.required ? "!" : "–"}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">
                  {t(item.labelKey)}
                  {!item.required && !item.done ? (
                    <span className="ml-2 text-xs font-normal text-ink-faint">
                      {t("common.optional")}
                    </span>
                  ) : null}
                </p>
                {!item.done ? (
                  <p className="mt-0.5 text-sm text-ink-muted">{t(item.hintKey)}</p>
                ) : null}
              </div>

              {!item.done && item.path ? (
                <Link
                  href={`/dashboard/${race.id}/${item.path}`}
                  className="shrink-0 self-center text-sm text-info underline underline-offset-4"
                >
                  {t("director.resolveItem")}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>

        {canEdit ? (
          <div className="mt-6">
            <StatusProvaBotao
              raceId={race.id}
              status={race.status}
              pronta={readiness.ready}
            />
          </div>
        ) : null}
      </Cartao>

      <div className="grid gap-6 lg:grid-cols-2">
        <Cartao className="p-5 sm:p-6">
          <TituloSecao
            acao={
              <BotaoLink
                href={`/dashboard/${race.id}/percurso`}
                variant="ghost"
                size="sm"
              >
                {activeTrack ? t("route.replace") : t("route.uploadTitle")}
              </BotaoLink>
            }
          >
            {t("race.route")}
          </TituloSecao>

          {activeTrack ? (
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <dt className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-faint">
                  {t("race.distance")}
                </dt>
                <dd className="medido tnum mt-0.5 text-2xl text-ink">
                  {formatDistance(activeTrack.total_distance_m, locale)}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-faint">
                  {t("race.elevation")}
                </dt>
                <dd className="medido tnum mt-0.5 text-2xl text-ink">
                  {formatElevationGain(activeTrack.elevation_gain_m, locale)}
                </dd>
              </div>
              {voltas > 1 ? (
                <div className="col-span-2 border border-border bg-surface-2/50 px-3 py-2 text-sm text-ink-muted">
                  {t("race.lapsTotal", {
                    laps: voltas,
                    distance: formatDistance(
                      activeTrack.total_distance_m * voltas,
                      locale,
                    ),
                  })}{" "}
                  de prova.
                </div>
              ) : null}

              <div className="col-span-2 text-sm text-ink-muted">
                <span className="tnum">
                  {t("route.pointCount", {
                    count: formatInteger(activeTrack.point_count, locale),
                  })}
                </span>
                {" · "}
                {activeTrack.source === "gpx"
                  ? t("route.sourceGpx", {
                      filename: activeTrack.original_filename ?? "GPX",
                    })
                  : t("route.sourceDrawn")}
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-ink-muted">
              {t("route.missingExplain")}
            </p>
          )}
        </Cartao>

        <Cartao className="p-5 sm:p-6">
          <TituloSecao
            acao={
              <BotaoLink
                href={`/dashboard/${race.id}/posicoes`}
                variant="ghost"
                size="sm"
              >
                {t("common.edit")}
              </BotaoLink>
            }
          >
            {t("race.positions")}
          </TituloSecao>

          <p className="medido tnum mt-4 text-2xl text-ink">
            {positions.length}
          </p>

          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex gap-2">
              <dt className="text-ink-faint">{t("roles.lead_car.short")}:</dt>
              <dd className={lead ? "flex items-center gap-1.5 text-ink" : "text-warn"}>
                {lead ? (
                  <>
                    <span aria-hidden style={{ color: ROLE_META[lead.role].color }}>
                      <VehicleIcon role={lead.role} size={15} />
                    </span>
                    {lead.label}
                  </>
                ) : (
                  t("common.none")
                )}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ink-faint">{t("roles.sweep_car.short")}:</dt>
              <dd className={sweep ? "flex items-center gap-1.5 text-ink" : "text-warn"}>
                {sweep ? (
                  <>
                    <span aria-hidden style={{ color: ROLE_META[sweep.role].color }}>
                      <VehicleIcon role={sweep.role} size={15} />
                    </span>
                    {sweep.label}
                  </>
                ) : (
                  t("common.none")
                )}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ink-faint">{t("gap.short")}:</dt>
              <dd className="tnum text-ink">
                {t("gap.target", {
                  duration: formatDuration(race.target_gap_minutes * 60, locale),
                })}
                {race.min_gap_minutes !== null || race.max_gap_minutes !== null
                  ? ` · ${race.min_gap_minutes ?? "—"}–${race.max_gap_minutes ?? "—"} min`
                  : ""}
              </dd>
            </div>
          </dl>

          {positions.length > 0 ? (
            <div className="mt-5">
              <BotaoLink
                href={`/dashboard/${race.id}/posicoes/codigos`}
                variant="secondary"
                size="sm"
              >
                {t("positions.print")}
              </BotaoLink>
            </div>
          ) : null}
        </Cartao>
      </div>

      {canEdit ? (
        <Cartao className="p-5 sm:p-6">
          <TituloSecao>{t("race.details")}</TituloSecao>
          <div className="mt-4">
            <ProvaForm
              acao={atualizarProva}
              modo="editar"
              rotulo={t("common.save")}
              valores={{
                raceId: race.id,
                nome: race.name,
                local: race.location ?? "",
                data: largada.date,
                hora: largada.time,
                fuso: race.timezone,
                voltas: (race as { laps?: number }).laps ?? 1,
                janelaAlvo: race.target_gap_minutes,
                janelaMin: race.min_gap_minutes,
                janelaMax: race.max_gap_minutes,
                mapa: race.map_basemap ?? null,
              }}
            />
          </div>
        </Cartao>
      ) : null}
    </main>
  );
}
