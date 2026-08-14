"use server";

import { revalidatePath } from "next/cache";

import { mensagemDeErroDoBanco } from "@/app/(director)/_lib/db-errors";
import {
  PermissaoNegadaError,
  requireEditableRace,
} from "@/app/(director)/_lib/session";
import type { RaceStatus } from "@/lib/types";

/**
 * Largada e encerramento.
 *
 * Separado de `definirStatusDaProva` (rascunho ↔ pronta) porque estas duas
 * transições são de natureza diferente: elas acontecem no dia, com a equipe na
 * estrada, e marcam o relógio da prova. `actual_start` é a referência de todo o
 * histórico posterior — o snapshot da janela, a auditoria dos alertas, a
 * reconstrução das voltas — então ele é gravado UMA vez e não é reescrito por
 * um segundo clique no botão.
 *
 * As duas exigem confirmação na interface, ao contrário das ações sobre alerta.
 * O critério é reversibilidade: reconhecer um alerta errado custa um segundo de
 * atenção, encerrar a prova por engano tira o mapa da equipe inteira no meio da
 * estrada.
 */

export interface StatusProvaResultado {
  erro?: string;
  status?: RaceStatus;
}

export async function iniciarProva(raceId: string): Promise<StatusProvaResultado> {
  try {
    const { supabase } = await requireEditableRace(raceId);

    const { data: atual, error: leituraErro } = await supabase
      .from("races")
      .select("status, actual_start")
      .eq("id", raceId)
      .maybeSingle();

    if (leituraErro || !atual) {
      return { erro: mensagemDeErroDoBanco(leituraErro, "Prova não encontrada.") };
    }

    const status = atual.status as RaceStatus;

    if (status === "live") return { status: "live" };

    if (status !== "draft" && status !== "armed") {
      return {
        erro: "Só uma prova em rascunho ou pronta pode ser iniciada.",
      };
    }

    const { error } = await supabase
      .from("races")
      .update({
        status: "live",
        // Reiniciar não reescreve a largada: o histórico já gravado se refere
        // ao primeiro início, e mover a âncora invalidaria tudo que veio depois.
        actual_start: atual.actual_start ?? new Date().toISOString(),
      })
      .eq("id", raceId)
      .in("status", ["draft", "armed"]);

    if (error) return { erro: mensagemDeErroDoBanco(error) };
  } catch (e) {
    if (e instanceof PermissaoNegadaError) return { erro: e.message };
    throw e;
  }

  revalidatePath(`/dashboard/${raceId}`, "layout");
  revalidatePath("/dashboard");
  return { status: "live" };
}

export async function encerrarProva(raceId: string): Promise<StatusProvaResultado> {
  try {
    const { supabase } = await requireEditableRace(raceId);

    const { error } = await supabase
      .from("races")
      .update({ status: "finished", finished_at: new Date().toISOString() })
      .eq("id", raceId)
      .eq("status", "live");

    if (error) return { erro: mensagemDeErroDoBanco(error) };
  } catch (e) {
    if (e instanceof PermissaoNegadaError) return { erro: e.message };
    throw e;
  }

  revalidatePath(`/dashboard/${raceId}`, "layout");
  revalidatePath("/dashboard");
  return { status: "finished" };
}
