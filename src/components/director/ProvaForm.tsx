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
 * ("meia hora entre abertura e vassoura") muito antes de saber a partir de que
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

      {/* i18n: precisa de chave — este formulário inteiro (rótulos "Nome da
          prova", "Local", "Data/Horário da largada", "Fuso horário da prova",
          "Janela alvo", "Alerta abaixo/acima de", suas dicas, e os títulos dos
          avisos de sucesso e erro). */}
      {estado.erro ? (
        <Aviso tone="warn" titulo={t("common.error")}>
          {estado.erro}
        </Aviso>
      ) : null}

      {estado.ok ? (
        <Aviso tone="ok" titulo="Dados da prova atualizados" />
      ) : null}

      <Campo label="Nome da prova" htmlFor="nome" obrigatorio erro={campo("nome")}>
        <input
          id="nome"
          name="nome"
          type="text"
          maxLength={200}
          defaultValue={valores.nome}
          className={entradaClasse(campo("nome"))}
          placeholder="Giro delle Langhe — 2ª etapa"
        />
      </Campo>

      <Campo
        label="Local"
        htmlFor="local"
        erro={campo("local")}
        hint="Cidade ou região da largada. Aparece na lista de provas."
      >
        <input
          id="local"
          name="local"
          type="text"
          maxLength={200}
          defaultValue={valores.local}
          className={entradaClasse(campo("local"))}
          placeholder="Alba, Piemonte"
        />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Data da largada" htmlFor="data" erro={campo("data")}>
          <input
            id="data"
            name="data"
            type="date"
            defaultValue={valores.data}
            className={`${entradaClasse(campo("data"))} tnum`}
          />
        </Campo>

        <Campo
          label="Horário da largada"
          htmlFor="hora"
          erro={campo("hora")}
          hint="No relógio do local da prova."
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
        label="Fuso horário da prova"
        htmlFor="fuso"
        obrigatorio
        erro={campo("fuso")}
        hint="Tudo que a direção vê é convertido para este fuso, inclusive no celular do motorista."
      >
        <select
          id="fuso"
          name="fuso"
          defaultValue={valores.fuso}
          className={entradaClasse(campo("fuso"))}
        >
          {TIMEZONE_OPTIONS.some((t) => t.value === valores.fuso) ? null : (
            <option value={valores.fuso}>{valores.fuso}</option>
          )}
          {TIMEZONE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Campo>

      {/* i18n: precisa de chave — "Mapa de fundo", a dica e as descrições dos
          fundos, que vêm do catálogo em @/lib/map/basemaps. */}
      <Campo
        label="Mapa de fundo"
        htmlFor="mapa"
        erro={campo("mapa")}
        hint="Vale só para esta prova. O traçado troca de cor junto, para não sumir sobre o fundo escolhido."
      >
        <select
          id="mapa"
          name="mapa"
          defaultValue={valores.mapa ?? BASEMAP_PADRAO}
          className={entradaClasse(campo("mapa"))}
        >
          {basemapsDisponiveis().map((b) => (
            <option key={b.id} value={b.id}>
              {b.nome}
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
                {b.nome}
              </span>{" "}
              — {b.descricao}
            </li>
          ))}
        </ul>
      </Campo>

      {/* i18n: precisa de chave — "Voltas sobre o percurso" e sua dica. */}
      <Campo
        label="Voltas sobre o percurso"
        htmlFor="voltas"
        obrigatorio
        erro={campo("voltas")}
        hint="1 para prova ponto-a-ponto. Num circuito, a distância da prova é o traçado multiplicado pelas voltas."
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
        <p className="mt-1 text-xs text-ink-faint">
          Quantos minutos a direção quer entre o carro de abertura e a vassoura.
          É a partir daqui que o painel decide se o pelotão esticou ou comprimiu
          demais.
        </p>

        <Campo
          label="Janela alvo (minutos)"
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
              label="Alerta abaixo de (minutos)"
              htmlFor="janelaMin"
              erro={campo("janelaMin")}
              hint="Pelotão comprimido demais."
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
              label="Alerta acima de (minutos)"
              htmlFor="janelaMax"
              erro={campo("janelaMax")}
              hint="Pelotão esticado demais."
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
            Definir limites de alerta ({t("common.optional")})
          </button>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Botao type="submit" variant="primary" size="lg" disabled={pendente}>
          {pendente ? t("common.saving") : rotulo}
        </Botao>
        {modo === "criar" ? (
          <p className="text-sm text-ink-muted">
            Depois de salvar você vai direto para o percurso.
          </p>
        ) : null}
      </div>
    </form>
  );
}
