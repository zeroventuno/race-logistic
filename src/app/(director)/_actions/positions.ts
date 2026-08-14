"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { generateUniqueBindCode } from "@/lib/codes/bind-code";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ROLE_META, type PositionRole } from "@/lib/types";

import {
  isColisaoDeCodigo,
  isColisaoDeOrdinal,
  mensagemDeErroDoBanco,
} from "../_lib/db-errors";
import { normalizePhone, normalizePlate } from "../_lib/format";
import { PermissaoNegadaError, requireEditableRace } from "../_lib/session";

/**
 * Ações de cadastro das posições de apoio.
 *
 * SOBRE O CÓDIGO DE VÍNCULO. A partir da migração 0005 o código NÃO passa mais
 * por aqui: `bind_code` está fora do grant de leitura e de escrita do papel
 * `authenticated`, porque quem tem o código vira o GPS daquele veículo — um
 * observador da prova não pode nem ler o do carro de abertura. O sorteio virou
 * `default` da coluna e a reemissão é a função `issue_bind_code`, que confere
 * permissão e roda com privilégio elevado. Por isso não existe aqui nenhuma
 * chamada a `generateUniqueBindCode`: o conjunto de códigos em uso é global e
 * só o banco enxerga ele inteiro.
 */

export interface ResultadoAcao {
  erro?: string;
  ok?: boolean;
}

const PAPEIS = Object.keys(ROLE_META) as PositionRole[];

/** Sentinela para trocar dois `ordinal` sem violar `unique (race_id, ordinal)`. */
const ORDINAL_TEMPORARIO = 2_000_000_000;

/** Quantas vezes vale a pena repetir quando o banco sorteia um código já usado. */
const TENTATIVAS = 4;

// ---------------------------------------------------------------------------
// Criação em lote
// ---------------------------------------------------------------------------

const loteSchema = z.object({
  role: z.enum(PAPEIS as [PositionRole, ...PositionRole[]], {
    errorMap: () => ({ message: "Escolha um papel válido." }),
  }),
  quantidade: z
    .number()
    .int("A quantidade precisa ser um número inteiro.")
    .min(1, "Adicione pelo menos 1 posição.")
    .max(40, "Adicione no máximo 40 posições de uma vez."),
});

export async function adicionarPosicoes(
  raceId: string,
  role: string,
  quantidade: number,
): Promise<ResultadoAcao> {
  try {
    const { supabase } = await requireEditableRace(raceId);

    const parsed = loteSchema.safeParse({ role, quantidade });
    if (!parsed.success) {
      return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    }

    const { data: existentes, error: erroLeitura } = await supabase
      .from("race_positions")
      .select("ordinal, role")
      .eq("race_id", raceId);

    if (erroLeitura) return { erro: mensagemDeErroDoBanco(erroLeitura) };

    const linhas = (existentes ?? []) as { ordinal: number; role: string }[];
    let proximoOrdinal =
      linhas.reduce((max, l) => Math.max(max, l.ordinal), 0) + 1;
    const jaDoPapel = linhas.filter((l) => l.role === parsed.data.role).length;

    const meta = ROLE_META[parsed.data.role];

    for (let tentativa = 0; tentativa < TENTATIVAS; tentativa++) {
      // Sem `bind_code`: o default da coluna sorteia. Uma colisão vira 23505 e
      // a próxima tentativa sorteia de novo.
      const novas = Array.from({ length: parsed.data.quantidade }, (_, i) => ({
        race_id: raceId,
        role: parsed.data.role,
        label: `${meta.shortLabel} ${jaDoPapel + i + 1}`,
        ordinal: proximoOrdinal + i,
        is_dispatchable: meta.dispatchable,
        is_reference_lead: false,
        is_reference_sweep: false,
      }));

      const { error } = await supabase.from("race_positions").insert(novas);

      if (!error) {
        await marcarReferenciaAutomatica(supabase, raceId, parsed.data.role);
        revalidatePath(`/dashboard/${raceId}/posicoes`);
        revalidatePath(`/dashboard/${raceId}`);
        return { ok: true };
      }

      if (isColisaoDeCodigo(error) && tentativa < TENTATIVAS - 1) {
        continue;
      }

      if (isColisaoDeOrdinal(error) && tentativa < TENTATIVAS - 1) {
        // Alguém inseriu no meio: recomeça a numeração a partir do que existe.
        const { data: agora } = await supabase
          .from("race_positions")
          .select("ordinal")
          .eq("race_id", raceId)
          .order("ordinal", { ascending: false })
          .limit(1);
        proximoOrdinal =
          ((agora?.[0]?.ordinal as number | undefined) ?? 0) + 1;
        continue;
      }

      return { erro: mensagemDeErroDoBanco(error) };
    }

    return {
      erro: "Não foi possível gerar códigos únicos agora. Tente de novo em alguns segundos.",
    };
  } catch (e) {
    if (e instanceof PermissaoNegadaError) return { erro: e.message };
    throw e;
  }
}

/**
 * A primeira posição de abertura (ou de fechamento) vira a referência sozinha.
 *
 * Quem cadastra um carro de abertura quer que ele SEJA a referência de abertura
 * — a única razão de existirem dois conceitos é a prova que tem dois carros na
 * frente. Deixar o diretor descobrir que precisa marcar mais uma caixinha é
 * criar uma pendência artificial no checklist.
 *
 * Falha aqui é silenciosa de propósito: as posições já foram criadas, e o item
 * pendente aparece no checklist como qualquer outro.
 */
async function marcarReferenciaAutomatica(
  supabase: SupabaseClient,
  raceId: string,
  role: PositionRole,
): Promise<void> {
  const coluna =
    role === "lead_car"
      ? "is_reference_lead"
      : role === "sweep_car"
        ? "is_reference_sweep"
        : null;

  if (!coluna) return;

  const { data: jaTem } = await supabase
    .from("race_positions")
    .select("id")
    .eq("race_id", raceId)
    .eq(coluna, true)
    .limit(1);

  if (jaTem && jaTem.length > 0) return;

  const { data: candidata } = await supabase
    .from("race_positions")
    .select("id")
    .eq("race_id", raceId)
    .eq("role", role)
    .order("ordinal", { ascending: true })
    .limit(1);

  const alvo = candidata?.[0]?.id as string | undefined;
  if (!alvo) return;

  await supabase
    .from("race_positions")
    .update({ [coluna]: true })
    .eq("id", alvo);
}

// ---------------------------------------------------------------------------
// Edição
// ---------------------------------------------------------------------------

const edicaoSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "A posição precisa de um nome — é o que a direção vai chamar no rádio.")
    .max(60, "Nome muito longo (máximo 60 caracteres)."),
  role: z.enum(PAPEIS as [PositionRole, ...PositionRole[]], {
    errorMap: () => ({ message: "Escolha um papel válido." }),
  }),
  driverName: z
    .string()
    .trim()
    .max(120, "Nome do motorista muito longo (máximo 120 caracteres)."),
  driverPhone: z
    .string()
    .trim()
    .max(30, "Telefone muito longo.")
    .refine(
      (v) => v === "" || /^\+?\d{6,20}$/.test(normalizePhone(v)),
      "Telefone inválido. Use só números, com o código do país se for de fora.",
    ),
  vehiclePlate: z.string().trim().max(15, "Placa muito longa."),
  isDispatchable: z.boolean(),
});

export async function atualizarPosicao(
  raceId: string,
  positionId: string,
  dados: {
    label: string;
    role: string;
    driverName: string;
    driverPhone: string;
    vehiclePlate: string;
    isDispatchable: boolean;
  },
): Promise<ResultadoAcao> {
  try {
    const { supabase } = await requireEditableRace(raceId);

    const parsed = edicaoSchema.safeParse(dados);
    if (!parsed.success) {
      return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    }

    const v = parsed.data;

    const { error } = await supabase
      .from("race_positions")
      .update({
        label: v.label,
        role: v.role,
        driver_name: v.driverName || null,
        driver_phone: v.driverPhone ? normalizePhone(v.driverPhone) : null,
        vehicle_plate: v.vehiclePlate ? normalizePlate(v.vehiclePlate) : null,
        is_dispatchable: v.isDispatchable,
      })
      .eq("id", positionId)
      // Cinto de segurança contra id de outra prova chegando pelo cliente: o
      // RLS já barraria, mas errar em silêncio é melhor que confiar.
      .eq("race_id", raceId);

    if (error) return { erro: mensagemDeErroDoBanco(error) };
  } catch (e) {
    if (e instanceof PermissaoNegadaError) return { erro: e.message };
    throw e;
  }

  revalidatePath(`/dashboard/${raceId}/posicoes`);
  revalidatePath(`/dashboard/${raceId}`);
  return { ok: true };
}

export async function removerPosicao(
  raceId: string,
  positionId: string,
): Promise<ResultadoAcao> {
  try {
    const { supabase } = await requireEditableRace(raceId);

    const { error } = await supabase
      .from("race_positions")
      .delete()
      .eq("id", positionId)
      .eq("race_id", raceId);

    // O banco recusa apagar posição que já transmitiu ou disparou alerta — o
    // histórico é registro da prova. A mensagem do gatilho já explica isso e
    // atravessa `mensagemDeErroDoBanco` intacta.
    if (error) return { erro: mensagemDeErroDoBanco(error) };
  } catch (e) {
    if (e instanceof PermissaoNegadaError) return { erro: e.message };
    throw e;
  }

  revalidatePath(`/dashboard/${raceId}/posicoes`);
  revalidatePath(`/dashboard/${raceId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Referências de abertura e fechamento
// ---------------------------------------------------------------------------

/**
 * Marca (ou desmarca) a referência de abertura / fechamento.
 *
 * `race_positions_one_lead` é um índice único parcial e o Postgres o avalia
 * linha a linha, na hora. Marcar a nova antes de desmarcar a antiga falharia
 * sempre — daí a ordem obrigatória: limpar, depois marcar.
 *
 * A mesma escrita zera o papel oposto na linha alvo, por causa da constraint
 * `lead_and_sweep_are_different`: promover a vassoura a carro de abertura é um
 * ajuste normal de véspera, e obrigar o diretor a desmarcar antes só produziria
 * um erro que ele não entenderia.
 *
 * Entre limpar e marcar a prova fica sem referência. Não dá para evitar isso
 * sem uma função no banco (que este agente não pode acrescentar), então o que
 * se faz é falhar alto: a mensagem diz que a referência ficou vazia, e o
 * checklist da prova já mostra a pendência.
 */
export async function definirReferencia(
  raceId: string,
  positionId: string | null,
  tipo: "lead" | "sweep",
): Promise<ResultadoAcao> {
  const coluna = tipo === "lead" ? "is_reference_lead" : "is_reference_sweep";
  const oposta = tipo === "lead" ? "is_reference_sweep" : "is_reference_lead";
  const nome = tipo === "lead" ? "abertura" : "fechamento";

  try {
    const { supabase } = await requireEditableRace(raceId);

    const { error: erroLimpeza } = await supabase
      .from("race_positions")
      .update({ [coluna]: false })
      .eq("race_id", raceId)
      .eq(coluna, true);

    if (erroLimpeza) return { erro: mensagemDeErroDoBanco(erroLimpeza) };

    if (positionId) {
      const { error } = await supabase
        .from("race_positions")
        .update({ [coluna]: true, [oposta]: false })
        .eq("id", positionId)
        .eq("race_id", raceId);

      if (error) {
        return {
          erro: `${mensagemDeErroDoBanco(error)} Atenção: a prova está sem referência de ${nome} agora — marque uma antes da largada.`,
        };
      }
    }
  } catch (e) {
    if (e instanceof PermissaoNegadaError) return { erro: e.message };
    throw e;
  }

  revalidatePath(`/dashboard/${raceId}/posicoes`);
  revalidatePath(`/dashboard/${raceId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Código de vínculo
// ---------------------------------------------------------------------------

/**
 * Revoga o código atual e emite outro.
 *
 * Em dois passos de propósito. O primeiro derruba o código antigo na hora: se
 * o papel com o código vazou (ficou no para-brisa, foi fotografado no grupo),
 * o diretor quer que ele pare de funcionar imediatamente, mesmo que a emissão
 * do novo falhe logo em seguida. O estado intermediário — posição sem código
 * válido — é visível na tela e tem um botão para tentar de novo.
 *
 * A emissão em si é do banco: `issue_bind_code` roda com privilégio elevado,
 * confere `can_edit_race` por dentro e resorteia sozinha em caso de colisão.
 */
export async function regerarCodigo(
  raceId: string,
  positionId: string,
): Promise<ResultadoAcao> {
  try {
    const { supabase } = await requireEditableRace(raceId);

    const { error: erroRevogacao } = await supabase
      .from("race_positions")
      .update({ bind_code_revoked_at: new Date().toISOString() })
      .eq("id", positionId)
      .eq("race_id", raceId)
      .is("bind_code_revoked_at", null);

    if (erroRevogacao) return { erro: mensagemDeErroDoBanco(erroRevogacao) };

    const { error } = await supabase.rpc("issue_bind_code", {
      p_position_id: positionId,
    });

    if (error) {
      const doServidor = await emitirCodigoNoServidor(raceId, positionId);
      if (doServidor) {
        return {
          erro: `${doServidor} O código anterior já foi revogado — esta posição está sem código até você tentar de novo.`,
        };
      }
    }
  } catch (e) {
    if (e instanceof PermissaoNegadaError) return { erro: e.message };
    throw e;
  }

  revalidatePath(`/dashboard/${raceId}/posicoes`);
  revalidatePath(`/dashboard/${raceId}/posicoes/codigos`);
  return { ok: true };
}

/**
 * Plano B para a emissão de código.
 *
 * `issue_bind_code` (migração 0005) chama `gen_random_bytes`, que mora no
 * schema `extensions` no Supabase, mas roda com `search_path = public, pg_temp`
 * — e falha com "function gen_random_bytes(integer) does not exist". O default
 * da coluna funciona (herda o search_path da sessão, que inclui `extensions`),
 * então CRIAR posição vai bem e REEMITIR código não. Este agente não pode
 * escrever migração, e um diretor sem como trocar um código vazado é uma falha
 * operacional real, não cosmética.
 *
 * O caminho alternativo mantém a mesma propriedade de segurança: a permissão é
 * verificada antes, o sorteio acontece no servidor com o conjunto global de
 * códigos em uso (que só a service_role enxerga por inteiro) e o código nunca
 * chega ao browser por este caminho — a tela o relê pela `race_bind_codes`.
 *
 * Devolve `null` em caso de sucesso, ou a mensagem de erro.
 */
async function emitirCodigoNoServidor(
  raceId: string,
  positionId: string,
): Promise<string | null> {
  let admin;
  try {
    admin = supabaseAdmin();
  } catch {
    return "Não foi possível emitir um código novo neste servidor.";
  }

  const { data: usados } = await admin
    .from("race_positions")
    .select("bind_code")
    .is("bind_code_revoked_at", null)
    .limit(50_000);

  const tomados = new Set(
    ((usados ?? []) as { bind_code: string }[]).map((r) => r.bind_code),
  );

  for (let tentativa = 0; tentativa < TENTATIVAS; tentativa++) {
    const codigo = generateUniqueBindCode(tomados);

    const { error } = await admin
      .from("race_positions")
      .update({
        bind_code: codigo,
        bind_code_issued_at: new Date().toISOString(),
        bind_code_expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        bind_code_revoked_at: null,
      })
      .eq("id", positionId)
      .eq("race_id", raceId);

    if (!error) return null;

    if (isColisaoDeCodigo(error)) {
      tomados.add(codigo);
      continue;
    }

    return mensagemDeErroDoBanco(error);
  }

  return "Não foi possível sortear um código livre. Tente de novo em alguns segundos.";
}

// ---------------------------------------------------------------------------
// Ordem
// ---------------------------------------------------------------------------

/**
 * Troca de lugar com a posição vizinha.
 *
 * `unique (race_id, ordinal)` impede a troca direta: escrever o ordinal do
 * vizinho antes de ele sair de lá viola o índice. A saída é o vaivém por um
 * ordinal sentinela, com desfazimento explícito se algum passo falhar — uma
 * posição esquecida no ordinal sentinela apareceria no fim da lista com um
 * número absurdo e ninguém entenderia por quê.
 */
export async function moverPosicao(
  raceId: string,
  positionId: string,
  direcao: "cima" | "baixo",
): Promise<ResultadoAcao> {
  try {
    const { supabase } = await requireEditableRace(raceId);

    const { data, error: erroLeitura } = await supabase
      .from("race_positions")
      .select("id, ordinal")
      .eq("race_id", raceId)
      .order("ordinal", { ascending: true });

    if (erroLeitura) return { erro: mensagemDeErroDoBanco(erroLeitura) };

    const lista = (data ?? []) as { id: string; ordinal: number }[];
    const indice = lista.findIndex((p) => p.id === positionId);
    if (indice < 0) {
      return { erro: "Posição não encontrada. Recarregue a página." };
    }

    const vizinhoIndice = direcao === "cima" ? indice - 1 : indice + 1;
    const atual = lista[indice];
    const vizinho = lista[vizinhoIndice];
    if (!atual || !vizinho) return { ok: true }; // já está na ponta

    const ordinalAtual = atual.ordinal;
    const ordinalVizinho = vizinho.ordinal;

    const mover = (id: string, ordinal: number) =>
      supabase.from("race_positions").update({ ordinal }).eq("id", id);

    const passo1 = await mover(atual.id, ORDINAL_TEMPORARIO);
    if (passo1.error) return { erro: mensagemDeErroDoBanco(passo1.error) };

    const passo2 = await mover(vizinho.id, ordinalAtual);
    if (passo2.error) {
      await mover(atual.id, ordinalAtual);
      return { erro: mensagemDeErroDoBanco(passo2.error) };
    }

    const passo3 = await mover(atual.id, ordinalVizinho);
    if (passo3.error) {
      // Volta os dois para onde estavam, na ordem inversa.
      await mover(vizinho.id, ordinalVizinho);
      await mover(atual.id, ordinalAtual);
      return { erro: mensagemDeErroDoBanco(passo3.error) };
    }
  } catch (e) {
    if (e instanceof PermissaoNegadaError) return { erro: e.message };
    throw e;
  }

  revalidatePath(`/dashboard/${raceId}/posicoes`);
  revalidatePath(`/dashboard/${raceId}/posicoes/codigos`);
  return { ok: true };
}
