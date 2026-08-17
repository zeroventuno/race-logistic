"use server";

import { redirect } from "next/navigation";
import { BASEMAP_PADRAO, basemapsDisponiveis } from "@/lib/map/basemaps";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getTranslator } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translate";

import { mensagemDeErroDoBanco } from "../_lib/db-errors";
import {
  PermissaoNegadaError,
  requireEditableRace,
  requireUser,
} from "../_lib/session";
import { isValidTimeZone, zonedToUtc } from "../_lib/timezone";

export interface ProvaFormState {
  erro?: string;
  campos?: Record<string, string>;
  /** Preenchido no sucesso de uma edição (a criação redireciona). */
  ok?: boolean;
}

const provaSchema = (t: Translator) =>
  z
  .object({
    nome: z
      .string()
      .trim()
      .min(1, t("race.form.nameRequired"))
      .max(200, t("race.form.nameTooLong")),
    local: z
      .string()
      .trim()
      .max(200, t("race.form.locationTooLong"))
      .optional(),
    data: z.string().trim(),
    hora: z.string().trim(),
    fuso: z
      .string()
      .trim()
      .min(1, t("race.form.timezoneRequired"))
      .refine(isValidTimeZone, t("race.form.timezoneUnknown")),
    // Um circuito percorrido 3 vezes é uma prova de 3 × o traçado. Sem isto o
    // sistema acha que a prova acaba no fim da primeira volta.
    voltas: z
      .number({ invalid_type_error: t("race.form.lapsRequired") })
      .int(t("race.form.lapsInteger"))
      .min(1, "A prova tem pelo menos 1 volta.")
      .max(50, t("race.form.lapsMax")),
    janelaAlvo: z
      .number({ invalid_type_error: "Informe a janela alvo em minutos." })
      .int(t("race.form.targetInteger"))
      .min(1, "A janela alvo precisa ser de pelo menos 1 minuto.")
      .max(600, t("race.form.targetMax")),
    janelaMin: z
      .number()
      .int(t("race.form.minInteger"))
      .min(0, t("race.form.minNegative"))
      .max(600, t("race.form.minMax"))
      .nullable(),
    mapa: z
      .string()
      .refine((v) => basemapsDisponiveis().some((b) => b.id === v), {
        message: t("race.form.basemapInvalid"),
      }),
    janelaMax: z
      .number()
      .int(t("race.form.maxInteger"))
      .min(1, t("race.form.maxMin"))
      .max(600, t("race.form.maxMax"))
      .nullable(),
  })
  // A data e a hora andam juntas: só uma das duas produz uma largada que o
  // painel não sabe exibir e a contagem regressiva não sabe usar.
  .superRefine((v, ctx) => {
    if (v.data && !v.hora) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hora"],
        message: t("race.form.timeRequired"),
      });
    }
    if (v.hora && !v.data) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["data"],
        message: t("race.form.dateRequired"),
      });
    }
    if (v.janelaMin !== null && v.janelaMax !== null && v.janelaMin >= v.janelaMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["janelaMax"],
        message: t("race.form.maxBelowMin", { min: v.janelaMin ?? 0 }),
      });
    }
    if (v.janelaMin !== null && v.janelaMin > v.janelaAlvo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["janelaMin"],
        message: t("race.form.minAboveTarget", { target: v.janelaAlvo }),
      });
    }
    if (v.janelaMax !== null && v.janelaMax < v.janelaAlvo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["janelaMax"],
        message: t("race.form.maxBelowTarget", { target: v.janelaAlvo }),
      });
    }
  });

function lerFormulario(formData: FormData) {
  return {
    nome: String(formData.get("nome") ?? ""),
    local: String(formData.get("local") ?? ""),
    data: String(formData.get("data") ?? ""),
    hora: String(formData.get("hora") ?? ""),
    fuso: String(formData.get("fuso") ?? ""),
    voltas: numeroOuNaN(formData.get("voltas")),
    janelaAlvo: numeroOuNaN(formData.get("janelaAlvo")),
    janelaMin: numeroOuNulo(formData.get("janelaMin")),
    janelaMax: numeroOuNulo(formData.get("janelaMax")),
    // Formulário antigo em aba aberta não manda o campo. Cair no padrão é
    // melhor que rejeitar o salvamento inteiro por causa dele.
    mapa: String(formData.get("mapa") ?? "") || BASEMAP_PADRAO,
  };
}

function numeroOuNaN(value: FormDataEntryValue | null): number {
  const texto = String(value ?? "").trim();
  if (texto === "") return Number.NaN;
  return Number(texto);
}

function numeroOuNulo(value: FormDataEntryValue | null): number | null {
  const texto = String(value ?? "").trim();
  if (texto === "") return null;
  const n = Number(texto);
  return Number.isFinite(n) ? n : Number.NaN;
}

function camposDeZod(error: z.ZodError): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const issue of error.issues) {
    const campo = String(issue.path[0] ?? "");
    if (campo && !(campo in saida)) saida[campo] = issue.message;
  }
  return saida;
}

export async function criarProva(
  _anterior: ProvaFormState,
  formData: FormData,
): Promise<ProvaFormState> {
  const { supabase, user } = await requireUser();
  const { t } = await getTranslator();

  const parsed = provaSchema(t).safeParse(lerFormulario(formData));
  if (!parsed.success) return { campos: camposDeZod(parsed.error) };

  const v = parsed.data;
  const largada = v.data && v.hora ? zonedToUtc(v.data, v.hora, v.fuso) : null;

  if (v.data && v.hora && !largada) {
    return {
      campos: { data: t("race.form.dateTimeInvalid") },
    };
  }

  const { data, error } = await supabase
    .from("races")
    .insert({
      name: v.nome,
      location: v.local || null,
      timezone: v.fuso,
      scheduled_start: largada ? largada.toISOString() : null,
      laps: v.voltas,
      target_gap_minutes: v.janelaAlvo,
      min_gap_minutes: v.janelaMin,
      max_gap_minutes: v.janelaMax,
      map_basemap: v.mapa,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { erro: mensagemDeErroDoBanco(error, t) };
  }

  revalidatePath("/dashboard");
  // O próximo passo real é o percurso — mandar para o resumo faria o diretor
  // ter que descobrir sozinho o que fazer em seguida.
  redirect(`/dashboard/${data.id as string}/percurso`);
}

export async function atualizarProva(
  _anterior: ProvaFormState,
  formData: FormData,
): Promise<ProvaFormState> {
  const raceId = String(formData.get("raceId") ?? "");
  const { t } = await getTranslator();

  try {
    const { supabase } = await requireEditableRace(raceId);

    const parsed = provaSchema(t).safeParse(lerFormulario(formData));
    if (!parsed.success) return { campos: camposDeZod(parsed.error) };

    const v = parsed.data;
    const largada = v.data && v.hora ? zonedToUtc(v.data, v.hora, v.fuso) : null;

    if (v.data && v.hora && !largada) {
      return {
        campos: { data: t("race.form.dateTimeInvalid") },
      };
    }

    const { error } = await supabase
      .from("races")
      .update({
        name: v.nome,
        location: v.local || null,
        timezone: v.fuso,
        scheduled_start: largada ? largada.toISOString() : null,
        laps: v.voltas,
        target_gap_minutes: v.janelaAlvo,
        min_gap_minutes: v.janelaMin,
        max_gap_minutes: v.janelaMax,
      map_basemap: v.mapa,
      })
      .eq("id", raceId);

    if (error) return { erro: mensagemDeErroDoBanco(error, t) };
  } catch (e) {
    if (e instanceof PermissaoNegadaError) return { erro: e.message };
    throw e;
  }

  revalidatePath(`/dashboard/${raceId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Muda o status entre rascunho e "pronta".
 *
 * Não valida a prontidão aqui: o índice do banco não conhece esse conceito e a
 * validação já está na tela (o botão nem aparece com item obrigatório
 * pendente). O que esta ação garante é que a transição seja explícita e
 * reversível — nada muda de status sozinho.
 */
export async function definirStatusDaProva(
  raceId: string,
  status: "draft" | "armed",
): Promise<{ erro?: string }> {
  const { t } = await getTranslator();

  try {
    const { supabase } = await requireEditableRace(raceId);

    const { error } = await supabase
      .from("races")
      .update({ status })
      .eq("id", raceId)
      .in("status", ["draft", "armed"]);

    if (error) return { erro: mensagemDeErroDoBanco(error, t) };
  } catch (e) {
    if (e instanceof PermissaoNegadaError) return { erro: e.message };
    throw e;
  }

  revalidatePath(`/dashboard/${raceId}`);
  revalidatePath("/dashboard");
  return {};
}
