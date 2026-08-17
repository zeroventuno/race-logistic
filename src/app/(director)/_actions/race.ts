"use server";

import { redirect } from "next/navigation";
import { BASEMAP_PADRAO, basemapsDisponiveis } from "@/lib/map/basemaps";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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

const provaSchema = z
  .object({
    nome: z
      .string()
      .trim()
      .min(1, "Dê um nome à prova — é como você vai reconhecê-la na lista.")
      .max(200, "Nome muito longo (máximo 200 caracteres)."),
    local: z
      .string()
      .trim()
      .max(200, "Local muito longo (máximo 200 caracteres).")
      .optional(),
    data: z.string().trim(),
    hora: z.string().trim(),
    fuso: z
      .string()
      .trim()
      .min(1, "Escolha o fuso horário do local da prova.")
      .refine(isValidTimeZone, "Fuso horário desconhecido."),
    // Um circuito percorrido 3 vezes é uma prova de 3 × o traçado. Sem isto o
    // sistema acha que a prova acaba no fim da primeira volta.
    voltas: z
      .number({ invalid_type_error: "Informe o número de voltas." })
      .int("O número de voltas precisa ser inteiro.")
      .min(1, "A prova tem pelo menos 1 volta.")
      .max(50, "No máximo 50 voltas."),
    janelaAlvo: z
      .number({ invalid_type_error: "Informe a janela alvo em minutos." })
      .int("A janela alvo precisa ser um número inteiro de minutos.")
      .min(1, "A janela alvo precisa ser de pelo menos 1 minuto.")
      .max(600, "A janela alvo não pode passar de 600 minutos (10 horas)."),
    janelaMin: z
      .number()
      .int("O limite mínimo precisa ser um número inteiro de minutos.")
      .min(0, "O limite mínimo não pode ser negativo.")
      .max(600, "O limite mínimo não pode passar de 600 minutos.")
      .nullable(),
    mapa: z
      .string()
      .refine((v) => basemapsDisponiveis().some((b) => b.id === v), {
        message: "Escolha um dos mapas disponíveis.",
      }),
    janelaMax: z
      .number()
      .int("O limite máximo precisa ser um número inteiro de minutos.")
      .min(1, "O limite máximo precisa ser de pelo menos 1 minuto.")
      .max(600, "O limite máximo não pode passar de 600 minutos.")
      .nullable(),
  })
  // A data e a hora andam juntas: só uma das duas produz uma largada que o
  // painel não sabe exibir e a contagem regressiva não sabe usar.
  .superRefine((v, ctx) => {
    if (v.data && !v.hora) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hora"],
        message: "Informe também o horário da largada.",
      });
    }
    if (v.hora && !v.data) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["data"],
        message: "Informe também a data da largada.",
      });
    }
    if (v.janelaMin !== null && v.janelaMax !== null && v.janelaMin >= v.janelaMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["janelaMax"],
        message: `O limite máximo precisa ser maior que o mínimo (${v.janelaMin} min).`,
      });
    }
    if (v.janelaMin !== null && v.janelaMin > v.janelaAlvo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["janelaMin"],
        message: `O mínimo não pode ser maior que a janela alvo (${v.janelaAlvo} min).`,
      });
    }
    if (v.janelaMax !== null && v.janelaMax < v.janelaAlvo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["janelaMax"],
        message: `O máximo não pode ser menor que a janela alvo (${v.janelaAlvo} min).`,
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

  const parsed = provaSchema.safeParse(lerFormulario(formData));
  if (!parsed.success) return { campos: camposDeZod(parsed.error) };

  const v = parsed.data;
  const largada = v.data && v.hora ? zonedToUtc(v.data, v.hora, v.fuso) : null;

  if (v.data && v.hora && !largada) {
    return {
      campos: { data: "Data ou horário inválidos. Confira os dois campos." },
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
    return { erro: mensagemDeErroDoBanco(error) };
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

  try {
    const { supabase } = await requireEditableRace(raceId);

    const parsed = provaSchema.safeParse(lerFormulario(formData));
    if (!parsed.success) return { campos: camposDeZod(parsed.error) };

    const v = parsed.data;
    const largada = v.data && v.hora ? zonedToUtc(v.data, v.hora, v.fuso) : null;

    if (v.data && v.hora && !largada) {
      return {
        campos: { data: "Data ou horário inválidos. Confira os dois campos." },
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

    if (error) return { erro: mensagemDeErroDoBanco(error) };
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
  try {
    const { supabase } = await requireEditableRace(raceId);

    const { error } = await supabase
      .from("races")
      .update({ status })
      .eq("id", raceId)
      .in("status", ["draft", "armed"]);

    if (error) return { erro: mensagemDeErroDoBanco(error) };
  } catch (e) {
    if (e instanceof PermissaoNegadaError) return { erro: e.message };
    throw e;
  }

  revalidatePath(`/dashboard/${raceId}`);
  revalidatePath("/dashboard");
  return {};
}
