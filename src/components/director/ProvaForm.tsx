"use client";

import { useActionState, useState } from "react";

import type { ProvaFormState } from "@/app/(director)/_actions/race";
import { TIMEZONE_OPTIONS } from "@/app/(director)/_lib/timezone";
import { Aviso, Botao, Campo, entradaClasse } from "@/components/director/ui";
import { BASEMAP_PADRAO, basemapsDisponiveis } from "@/lib/map/basemaps";
import { useT } from "@/lib/i18n/client";

export interface ValoresProva {
  raceId?: string;
  nome: string;
  local: string;
  data: string;
  hora: string;
  fuso: string;
  voltas: number;
  janelaAlvo: number;
  janelaMin: number | null;
  janelaMax: number | null;
  mapa?: string | null;
}

/**
 * Formulário de dados da prova — usado tanto para criar quanto para editar.
 *
 * Os limites mínimo e máximo ficam atrás de um "mostrar limites" porque na
 * criação eles quase sempre ficam vazios: o diretor sabe a janela que quer
 * ("meia hora entre abertura e fechamento") muito antes de saber a partir de que
 * ponto ele quer ser avisado. Campos opcionais em destaque fazem o formulário
 * parecer mais longo do que é e atrasam a decisão que importa.
 */
export function ProvaForm({
  acao,
  valores,
  rotulo,
  modo,
}: {
  acao: (estado: ProvaFormState, formData: FormData) => Promise<ProvaFormState>;
  valores: ValoresProva;
  rotulo: string;
  modo: "criar" | "editar";
}) {
  const t = useT();
  const [estado, submeter, pendente] = useActionState<ProvaFormState, FormData>(
    acao,
    {},
  );

  const [mostrarLimites, setMostrarLimites] = useState(
    valores.janelaMin !== null || valores.janelaMax !== null,
  );

  const campo = (nome: string) => estado.campos?.[nome];

  return (
    <form action={submeter} className="space-y-6" noValidate>
      {valores.raceId ? (
        <input type="hidden" name="raceId" value={valores.raceId} />
      ) : null}

      {estado.erro ? (
        <Aviso tone="warn" titulo={t("common.error")}>
          {estado.erro}
        </Aviso>
      ) : null}

      {estado.ok ? (
        <Aviso tone="ok" titulo={t("race.form.saved")} />
      ) : null}

      <Campo
        label={t("race.form.nameLabel")}
        htmlFor="nome"
        obrigatorio
        erro={campo("nome")}
      >
        <input
          id="nome"
          name="nome"
          type="text"
          maxLength={200}
          defaultValue={valores.nome}
          className={entradaClasse(campo("nome"))}
          placeholder={t("race.form.namePlaceholder")}
        />
      </Campo>

      <Campo
        label={t("race.form.locationLabel")}
        htmlFor="local"
        erro={campo("local")}
        hint={t("race.form.locationHint")}
      >
        <input
          id="local"
          name="local"
          type="text"
          maxLength={200}
          defaultValue={valores.local}
          className={entradaClasse(campo("local"))}
          placeholder={t("race.form.locationPlaceholder")}
        />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          label={t("race.form.dateLabel")}
          htmlFor="data"
          erro={campo("data")}
        >
          <input
            id="data"
            name="data"
            type="date"
            defaultValue={valores.data}
            className={`${entradaClasse(campo("data"))} tnum`}
          />
        </Campo>

        <Campo
          label={t("race.form.timeLabel")}
          htmlFor="hora"
          erro={campo("hora")}
          hint={t("race.form.timeHint")}
        >
          <input
            id="hora"
            name="hora"
            type="time"
            defaultValue={valores.hora}
            className={`${entradaClasse(campo("hora"))} tnum`}
          />
        </Campo>
      </div>

      <Campo
        label={t("race.form.timezoneLabel")}
        htmlFor="fuso"
        obrigatorio
        erro={campo("fuso")}
        hint={t("race.form.timezoneHint")}
      >
        <select
          id="fuso"
          name="fuso"
          defaultValue={valores.fuso}
          className={entradaClasse(campo("fuso"))}
        >
          {TIMEZONE_OPTIONS.some((tz) => tz.value === valores.fuso) ? null : (
            <option value={valores.fuso}>{valores.fuso}</option>
          )}
          {TIMEZONE_OPTIONS.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </Campo>

      <Campo
        label={t("map.basemapLabel")}
        htmlFor="mapa"
        erro={campo("mapa")}
        hint={t("map.basemapHint")}
      >
        <select
          id="mapa"
          name="mapa"
          defaultValue={valores.mapa ?? BASEMAP_PADRAO}
          className={entradaClasse(campo("mapa"))}
        >
          {basemapsDisponiveis().map((b) => (
            <option key={b.id} value={b.id}>
              {t(b.nomeChave)}
            </option>
          ))}
        </select>

        {/* A descrição de cada fundo fica visível, não escondida atrás de
            passar o mouse: quem escolhe faz isso uma vez por prova e não sabe
            de cor o que "topográfico" muda na tela. */}
        <ul className="mt-3 space-y-1.5">
          {basemapsDisponiveis().map((b) => (
            <li key={b.id} className="text-xs leading-relaxed text-ink-faint">
              <span className="font-mono uppercase tracking-[0.14em] text-ink-muted">
                {t(b.nomeChave)}
              </span>{" "}
              — {t(b.descricaoChave)}
            </li>
          ))}
        </ul>
      </Campo>

      <Campo
        label={t("race.form.lapsLabel")}
        htmlFor="voltas"
        obrigatorio
        erro={campo("voltas")}
        hint={t("race.form.lapsHint")}
        className="max-w-[14rem]"
      >
        <input
          id="voltas"
          name="voltas"
          type="number"
          inputMode="numeric"
          min={1}
          max={50}
          step={1}
          defaultValue={valores.voltas}
          className={`${entradaClasse(campo("voltas"))} tnum`}
        />
      </Campo>

      <fieldset className="border border-border bg-surface-1 p-4">
        <legend className="px-1 text-sm font-medium text-ink">
          {t("gap.title")}
        </legend>
        <p className="mt-1 text-xs text-ink-faint">{t("race.form.gapHint")}</p>

        <Campo
          label={t("race.form.targetLabel")}
          htmlFor="janelaAlvo"
          obrigatorio
          erro={campo("janelaAlvo")}
          className="mt-4 max-w-[14rem]"
        >
          <input
            id="janelaAlvo"
            name="janelaAlvo"
            type="number"
            inputMode="numeric"
            min={1}
            max={600}
            step={1}
            defaultValue={valores.janelaAlvo}
            className={`${entradaClasse(campo("janelaAlvo"))} tnum`}
          />
        </Campo>

        {mostrarLimites ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Campo
              label={t("race.form.minLabel")}
              htmlFor="janelaMin"
              erro={campo("janelaMin")}
              hint={t("race.form.minHint")}
            >
              <input
                id="janelaMin"
                name="janelaMin"
                type="number"
                inputMode="numeric"
                min={0}
                max={600}
                step={1}
                defaultValue={valores.janelaMin ?? ""}
                className={`${entradaClasse(campo("janelaMin"))} tnum`}
              />
            </Campo>

            <Campo
              label={t("race.form.maxLabel")}
              htmlFor="janelaMax"
              erro={campo("janelaMax")}
              hint={t("race.form.maxHint")}
            >
              <input
                id="janelaMax"
                name="janelaMax"
                type="number"
                inputMode="numeric"
                min={1}
                max={600}
                step={1}
                defaultValue={valores.janelaMax ?? ""}
                className={`${entradaClasse(campo("janelaMax"))} tnum`}
              />
            </Campo>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMostrarLimites(true)}
            className="mt-3 text-sm text-info underline underline-offset-4"
          >
            {t("race.form.showLimits")} ({t("common.optional")})
          </button>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Botao type="submit" variant="primary" size="lg" disabled={pendente}>
          {pendente ? t("common.saving") : rotulo}
        </Botao>
        {modo === "criar" ? (
          <p className="text-sm text-ink-muted">
            {t("race.form.afterSave")}
          </p>
        ) : null}
      </div>
    </form>
  );
}
