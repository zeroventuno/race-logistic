"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { detectarCruzamentos } from "@/lib/relatorio/overpass";
import { loadRaceRoute } from "@/lib/route/store";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Ações da tela de pontos de bloqueio.
 *
 * A PERMISSÃO É REFERIDA AQUI, e não só na página. Ação de servidor é
 * endpoint: qualquer pessoa autenticada pode chamá-la direto, e confiar na
 * tela seria o mesmo erro de esconder um botão e achar que a regra está
 * imposta.
 */

async function autorizado(raceId: string): Promise<boolean> {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;

  const { data, error } = await supabase.rpc("can_edit_race", {
    p_race_id: raceId,
  });
  return !error && data === true;
}

export interface Resultado {
  erro?: string;
  ok?: boolean;
  /** Quantos pontos a detecção acrescentou. */
  novos?: number;
  /** Até que quilometragem do percurso a varredura chegou. */
  ateKm?: number;
  /** Comprimento do percurso, para a tela dizer "42 de 110". */
  totalKm?: number;
  /** Faltou percurso para varrer? */
  completo?: boolean;
}

const uuid = z.string().uuid();

/**
 * Semeia a lista a partir do OpenStreetMap.
 *
 * NÃO APAGA NADA. A detecção acrescenta o que ainda não existe e deixa em paz
 * o que a direção já mexeu. Rodar de novo depois de podar não ressuscita o que
 * foi desligado.
 *
 * VARRE POR PARTES. O Overpass público não dá conta de um percurso longo num
 * pedido só — ver a medição em `overpass.ts`. Cada toque continua de onde o
 * anterior parou, usando o ponto mais adiantado que já existe como marca. É por
 * isso que o resultado diz até que quilômetro chegou: a tela precisa poder
 * pedir para continuar.
 */
export async function detectar(raceId: string): Promise<Resultado> {
  if (!uuid.safeParse(raceId).success) return { erro: "Prova inválida." };
  if (!(await autorizado(raceId))) return { erro: "Sem permissão." };

  const rota = await loadRaceRoute(raceId);
  if (!rota) return { erro: "Cadastre o percurso antes." };

  const admin = supabaseAdmin();

  const { data: existentes } = await admin
    .from("route_blockpoints")
    .select("offset_m")
    .eq("race_id", raceId);

  const offsets = ((existentes ?? []) as { offset_m: number | string }[]).map(
    (r) => Number(r.offset_m),
  );
  const jaTem = new Set(offsets.map((o) => Math.round(o)));

  // Retoma do ponto mais adiantado que já existe. Um percurso ainda intocado
  // começa do zero.
  const desdeOffsetM = offsets.length > 0 ? Math.max(...offsets) : 0;

  const varredura = await detectarCruzamentos(rota.track, { desdeOffsetM });

  const comum = {
    ateKm: Math.round(varredura.ateOffsetM / 100) / 10,
    totalKm: Math.round(rota.raceDistanceM / 100) / 10,
    completo: varredura.completo,
  };

  if (varredura.cruzamentos.length === 0) {
    return { ok: true, novos: 0, ...comum };
  }

  const novos = varredura.cruzamentos
    .filter((c) => !jaTem.has(Math.round(c.offsetM)))
    .map((c) => ({
      race_id: raceId,
      offset_m: c.offsetM,
      name: c.nome,
      source: "detected" as const,
      active: true,
    }));

  if (novos.length === 0) return { ok: true, novos: 0, ...comum };

  const { error } = await admin.from("route_blockpoints").insert(novos);
  if (error) return { erro: error.message };

  revalidatePath(`/dashboard/${raceId}/bloqueios`);
  return { ok: true, novos: novos.length, ...comum };
}

const esquemaPonto = z.object({
  raceId: z.string().uuid(),
  offsetM: z.number().finite().min(0),
  nome: z.string().trim().max(120).nullable(),
});

export async function acrescentar(
  raceId: string,
  offsetM: number,
  nome: string | null,
): Promise<Resultado> {
  const parsed = esquemaPonto.safeParse({ raceId, offsetM, nome });
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Valor inválido." };
  }
  if (!(await autorizado(raceId))) return { erro: "Sem permissão." };

  const rota = await loadRaceRoute(raceId);
  if (!rota) return { erro: "Cadastre o percurso antes." };

  // Um ponto além do fim do percurso nunca seria cruzado por veículo nenhum, e
  // sairia no relatório como "não apurado" para sempre — parecendo defeito do
  // sistema em vez de erro de digitação.
  if (offsetM > rota.raceDistanceM) {
    return { erro: "Fora do percurso." };
  }

  const { error } = await supabaseAdmin().from("route_blockpoints").insert({
    race_id: raceId,
    offset_m: offsetM,
    name: parsed.data.nome || null,
    source: "manual",
    active: true,
  });

  if (error) {
    return {
      erro: error.code === "23505" ? "Já existe um ponto neste quilômetro." : error.message,
    };
  }

  revalidatePath(`/dashboard/${raceId}/bloqueios`);
  return { ok: true };
}

export async function renomear(
  raceId: string,
  id: string,
  nome: string,
): Promise<Resultado> {
  if (!uuid.safeParse(id).success) return { erro: "Ponto inválido." };
  if (!(await autorizado(raceId))) return { erro: "Sem permissão." };

  const limpo = nome.trim().slice(0, 120);

  const { error } = await supabaseAdmin()
    .from("route_blockpoints")
    .update({ name: limpo || null })
    .eq("id", id)
    .eq("race_id", raceId);

  if (error) return { erro: error.message };

  // SEM `revalidatePath`: a tela já sabe o nome que digitou, e revalidar
  // remontaria a lista inteira por causa de uma letra. Ver a nota em alternar.
  return { ok: true };
}

export async function alternar(
  raceId: string,
  id: string,
  ativo: boolean,
): Promise<Resultado> {
  if (!uuid.safeParse(id).success) return { erro: "Ponto inválido." };
  if (!(await autorizado(raceId))) return { erro: "Sem permissão." };

  const { error } = await supabaseAdmin()
    .from("route_blockpoints")
    .update({ active: ativo })
    .eq("id", id)
    .eq("race_id", raceId);

  if (error) return { erro: error.message };

  /*
   * SEM `revalidatePath`, e é o conserto de um defeito de uso.
   *
   * Cada clique numa caixa disparava revalidação da rota, que remonta a página
   * inteira no servidor e devolve a lista toda. Com uma centena de pontos a
   * tela piscava DUAS vezes antes de a caixa mudar de estado — uma na
   * transição, outra na chegada dos dados —, e quem estava podando a lista
   * apanhava a cada linha.
   *
   * Ligar ou desligar um ponto é a ação mais repetida desta tela. Quem clicou
   * já sabe o que pediu; a tela reflete na hora e o servidor confirma por
   * baixo. Só as ações que MUDAM A LISTA — detectar, acrescentar, remover —
   * continuam revalidando, porque aí a tela realmente não sabe o resultado.
   */
  return { ok: true };
}

/**
 * Só o que a direção cadastrou à mão pode ser apagado.
 *
 * Ponto detectado é DESLIGADO, não removido: apagar faria a próxima detecção
 * trazer tudo de volta, e o trabalho de podar teria que ser refeito. O botão
 * de remover existe para desfazer um cadastro errado, não para limpar a lista.
 */
export async function remover(raceId: string, id: string): Promise<Resultado> {
  if (!uuid.safeParse(id).success) return { erro: "Ponto inválido." };
  if (!(await autorizado(raceId))) return { erro: "Sem permissão." };

  const { error } = await supabaseAdmin()
    .from("route_blockpoints")
    .delete()
    .eq("id", id)
    .eq("race_id", raceId)
    .eq("source", "manual");

  if (error) return { erro: error.message };

  revalidatePath(`/dashboard/${raceId}/bloqueios`);
  return { ok: true };
}
