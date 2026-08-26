import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

import { apurarBloqueios, type BloqueioApurado } from "./bloqueios";
import { reconstruirSerie, type AmostraDePing, type ResumoDaSerie } from "./serie";

/**
 * Tudo o que o relatório final precisa, montado a partir do banco.
 *
 * SÓ LÊ. Nenhuma função daqui escreve nada — o relatório é uma leitura da
 * prova, e uma leitura que altera o que lê não serve como prova de coisa
 * alguma.
 *
 * USA `service_role`. A permissão é conferida ANTES, na rota, com o cliente do
 * usuário e o `can_edit_race`. Aqui já se assume autorizado: é o mesmo desenho
 * do `gap-snapshot`, e a razão é a mesma — atravessar RLS para juntar
 * `auth.users` com tabelas públicas não dá para fazer com o cliente do
 * usuário.
 */

export interface IncidenteDoRelatorio {
  criadoEm: string;
  categoria: string;
  prioridade: string | null;
  status: string;
  offsetM: number | null;
  lat: number | null;
  lng: number | null;
  nota: string | null;
  chamadoPor: string | null;
  atendidoPor: string | null;
  reconhecidoEm: string | null;
  despachadoEm: string | null;
  noLocalEm: string | null;
  resolvidoEm: string | null;
  /** Do chamado até alguém chegar. Nulo quando ninguém chegou. */
  segundosAteOLocal: number | null;
  /** Do chamado até o encerramento. Nulo enquanto aberto. */
  segundosAteResolver: number | null;
}

export interface VeiculoDoRelatorio {
  ordinal: number;
  papel: string;
  rotulo: string;
  motorista: string | null;
  placa: string | null;
  ehAbertura: boolean;
  ehFechamento: boolean;
  vinculadoEm: string | null;
  pings: number;
  primeiroPing: string | null;
  ultimoPing: string | null;
  /** Fração do tempo de prova com sinal, de 0 a 1. Nulo se nunca transmitiu. */
  cobertura: number | null;
  /** Silêncios acima do limiar, para a seção que explica os buracos. */
  silencios: { deMs: number; ateMs: number; segundos: number }[];
}

export interface DadosDoRelatorio {
  prova: {
    id: string;
    nome: string;
    local: string | null;
    fusoHorario: string | null;
    inicio: string | null;
    fim: string | null;
    voltas: number;
    janelaAlvoMin: number | null;
    janelaMinMin: number | null;
    janelaMaxMin: number | null;
  };
  percurso: {
    nome: string | null;
    distanciaM: number;
    distanciaDaProvaM: number;
    pontos: [number, number][];
  } | null;
  serie: ResumoDaSerie | null;
  /** Por que a série não pôde ser feita. Nulo quando ela existe. */
  serieImpossivel: string | null;
  /**
   * Segundos entre o último ping do comboio e o encerramento declarado.
   *
   * Grande demais significa que a direção esqueceu de encerrar a prova no
   * sistema. O relatório não conserta isso — declara, porque o período
   * declarado é o que a prefeitura vai ler.
   */
  caudaSemDadoS: number | null;
  bloqueios: BloqueioApurado[];
  /**
   * Rótulo do veículo cuja passagem devolveu a rua ao trânsito.
   *
   * Vai impresso: quem lê precisa saber de quem é essa passagem. É o carro de
   * fechamento; nulo quando ele não transmitiu, e aí a coluna sai vazia.
   */
  veiculoDeReabertura: string | null;
  incidentes: IncidenteDoRelatorio[];
  veiculos: VeiculoDoRelatorio[];
  geradoEm: string;
}

/** Acima disto, o veículo estava calado o bastante para o relatório contar. */
const SILENCIO_RELEVANTE_MS = 120_000;

/** Teto de pontos da série. Acima disto o gráfico vira borrão, não informação. */
const TETO_DE_PONTOS = 900;

/** Nunca mais fino que isto: é a cadência real de ping, ~20 s. */
const PASSO_MINIMO_MS = 30_000;

/** Quantos pontos do traçado vão para o mapinha do PDF. */
const PONTOS_DO_MAPA = 400;

export async function montarRelatorio(
  raceId: string,
): Promise<DadosDoRelatorio | null> {
  const admin = supabaseAdmin();

  const [provaRes, percursoRes, posicoesRes, alertasRes, bloqueiosRes] = await Promise.all([
    admin
      .from("races")
      .select(
        "id, name, location, timezone, actual_start, finished_at, laps, target_gap_minutes, min_gap_minutes, max_gap_minutes",
      )
      .eq("id", raceId)
      .maybeSingle(),
    admin
      .from("route_tracks")
      .select("name, points, render_points, total_distance_m")
      .eq("race_id", raceId)
      .eq("is_active", true)
      .maybeSingle(),
    admin
      .from("race_positions")
      .select(
        "id, ordinal, role, label, driver_name, vehicle_plate, is_reference_lead, is_reference_sweep",
      )
      .eq("race_id", raceId)
      .order("ordinal"),
    admin
      .from("alerts")
      .select(
        "id, created_at, category, priority, status, note, lat, lng, route_offset_m, raised_by_position_id, dispatched_position_id, acknowledged_at, dispatched_at, on_scene_at, resolved_at",
      )
      .eq("race_id", raceId)
      .order("created_at"),
    admin
      .from("route_blockpoints")
      .select("id, offset_m, name")
      .eq("race_id", raceId)
      .eq("active", true)
      .order("offset_m"),
  ]);

  const prova = provaRes.data as ProvaRow | null;
  if (!prova) return null;

  const posicoes = (posicoesRes.data ?? []) as PosicaoRow[];
  const percursoRow = percursoRes.data as PercursoRow | null;

  const voltas = Math.max(1, prova.laps ?? 1);
  const distanciaTracadoM = Number(percursoRow?.total_distance_m ?? 0);

  const abertura = posicoes.find((p) => p.is_reference_lead) ?? null;
  const fechamento = posicoes.find((p) => p.is_reference_sweep) ?? null;

  /*
   * A JANELA DA PROVA, e por que ela não é `min(ping)`..`max(ping)`.
   *
   * Uma prova de teste pode ter pings de vários dias — simulação rodada de novo
   * na semana seguinte. Delimitar pelo extremo dos pings faria o relatório
   * cobrir dias de nada. `actual_start` e `finished_at` são o que a direção
   * declarou, e é isso que a prefeitura autorizou.
   */
  const inicioMs = prova.actual_start ? Date.parse(prova.actual_start) : null;
  const fimMs = prova.finished_at ? Date.parse(prova.finished_at) : null;

  const [pingsAbertura, pingsFechamento, cobertura] = await Promise.all([
    abertura ? carregarPings(raceId, abertura.id, distanciaTracadoM, inicioMs, fimMs) : [],
    fechamento ? carregarPings(raceId, fechamento.id, distanciaTracadoM, inicioMs, fimMs) : [],
    carregarCobertura(raceId, inicioMs, fimMs),
  ]);

  const { serie, impossivel } = reconstruir({
    abertura,
    fechamento,
    pingsAbertura,
    pingsFechamento,
    distanciaDaProvaM: voltas * distanciaTracadoM,
    inicioMs,
    fimMs,
  });

  const porId = new Map(posicoes.map((p) => [p.id, p]));

  return {
    prova: {
      id: prova.id,
      nome: prova.name,
      local: prova.location,
      fusoHorario: prova.timezone,
      inicio: prova.actual_start,
      fim: prova.finished_at,
      voltas,
      janelaAlvoMin: prova.target_gap_minutes,
      janelaMinMin: prova.min_gap_minutes,
      janelaMaxMin: prova.max_gap_minutes,
    },
    percurso: percursoRow
      ? {
          nome: percursoRow.name,
          distanciaM: distanciaTracadoM,
          distanciaDaProvaM: voltas * distanciaTracadoM,
          pontos: amostrarTracado(percursoRow),
        }
      : null,
    serie,
    serieImpossivel: impossivel,
    caudaSemDadoS: calcularCauda(cobertura, fimMs),
    bloqueios: apurarBloqueios({
      pontos: ((bloqueiosRes.data ?? []) as BloqueioRow[]).map((b) => ({
        id: b.id,
        offsetM: Number(b.offset_m),
        nome: b.name,
      })),
      abertura: pingsAbertura,
      fechamento: pingsFechamento,
    }),
    veiculoDeReabertura:
      pingsFechamento.length > 0 ? (fechamento?.label ?? null) : null,
    incidentes: ((alertasRes.data ?? []) as AlertaRow[]).map((a) =>
      paraIncidente(a, porId),
    ),
    veiculos: posicoes.map((p) => paraVeiculo(p, cobertura.get(p.id), inicioMs, fimMs)),
    geradoEm: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------

function reconstruir(e: {
  abertura: PosicaoRow | null;
  fechamento: PosicaoRow | null;
  pingsAbertura: AmostraDePing[];
  pingsFechamento: AmostraDePing[];
  distanciaDaProvaM: number;
  inicioMs: number | null;
  fimMs: number | null;
}): { serie: ResumoDaSerie | null; impossivel: string | null } {
  /*
   * CADA RECUSA TEM MOTIVO PRÓPRIO, e o motivo vai impresso na capa.
   *
   * "Não foi possível gerar o gráfico" não serve a ninguém. "O carro de
   * fechamento nunca foi vinculado a um aparelho" diz exatamente o que faltou
   * e o que fazer diferente na próxima prova — e é uma frase que o organizador
   * pode mostrar à prefeitura sem constrangimento, porque é honesta.
   */
  if (!e.abertura) {
    return { serie: null, impossivel: "Nenhuma posição foi marcada como carro de abertura." };
  }
  if (!e.fechamento) {
    return { serie: null, impossivel: "Nenhuma posição foi marcada como carro de fechamento." };
  }
  if (!e.inicioMs) {
    return { serie: null, impossivel: "A prova não chegou a ser iniciada no sistema." };
  }
  if (e.distanciaDaProvaM <= 0) {
    return { serie: null, impossivel: "A prova não tem percurso cadastrado." };
  }
  if (e.pingsAbertura.length === 0) {
    return { serie: null, impossivel: "O carro de abertura não transmitiu posição durante a prova." };
  }
  if (e.pingsFechamento.length === 0) {
    return { serie: null, impossivel: "O carro de fechamento não transmitiu posição durante a prova." };
  }

  const fim =
    e.fimMs ??
    Math.max(e.pingsAbertura.at(-1)!.atMs, e.pingsFechamento.at(-1)!.atMs);

  /*
   * O PASSO SE ADAPTA AO PERÍODO DECLARADO.
   *
   * `actual_start` e `finished_at` são o que a direção declarou, e é isso que
   * o relatório respeita. Só que "encerrar a prova" é um botão que se esquece
   * de apertar: a prova acaba às 13h, alguém lembra do sistema no dia
   * seguinte, e o período declarado vira 20 horas. A 30 segundos por ponto
   * isso são 2 400 pontos, quase todos de nada, e o gráfico do dia de prova
   * fica espremido num canto ilegível.
   *
   * Encurtar o período seria a saída errada — apagaria do documento o fato de
   * que a prova ficou aberta. Então o período fica, e o que cede é a
   * resolução: nunca mais que `TETO_DE_PONTOS`, nunca mais fino que 30 s.
   */
  const passoMs = Math.max(
    PASSO_MINIMO_MS,
    Math.ceil((fim - e.inicioMs) / TETO_DE_PONTOS / 1000) * 1000,
  );

  return {
    serie: reconstruirSerie({
      lead: e.pingsAbertura,
      sweep: e.pingsFechamento,
      raceDistanceM: e.distanciaDaProvaM,
      deMs: e.inicioMs,
      ateMs: fim,
      passoMs,
    }),
    impossivel: null,
  };
}

async function carregarPings(
  raceId: string,
  positionId: string,
  distanciaTracadoM: number,
  deMs: number | null,
  ateMs: number | null,
): Promise<AmostraDePing[]> {
  let q = supabaseAdmin()
    .from("location_pings")
    .select("recorded_at, received_at, route_offset_m, lap")
    .eq("race_id", raceId)
    .eq("position_id", positionId)
    .not("route_offset_m", "is", null)
    .order("recorded_at")
    .limit(20_000);

  if (deMs) q = q.gte("recorded_at", new Date(deMs).toISOString());
  if (ateMs) q = q.lte("recorded_at", new Date(ateMs).toISOString());

  const { data } = await q;

  return ((data ?? []) as PingRow[]).map((p) => ({
    atMs: Date.parse(p.recorded_at),
    receivedAtMs: Date.parse(p.received_at ?? p.recorded_at),
    // Volta × traçado + offset dentro da volta: é este número que a janela usa.
    offsetAbsolutoM: (p.lap ?? 0) * distanciaTracadoM + Number(p.route_offset_m),
  }));
}

/**
 * Quando cada veículo transmitiu, e quando ficou calado.
 *
 * Uma consulta só para todos os veículos: são milhares de linhas, mas só os
 * carimbos de tempo — sem geometria, sem snap. É contagem, e é barata.
 */
async function carregarCobertura(
  raceId: string,
  deMs: number | null,
  ateMs: number | null,
): Promise<Map<string, number[]>> {
  let q = supabaseAdmin()
    .from("location_pings")
    .select("position_id, recorded_at")
    .eq("race_id", raceId)
    .order("recorded_at")
    .limit(200_000);

  if (deMs) q = q.gte("recorded_at", new Date(deMs).toISOString());
  if (ateMs) q = q.lte("recorded_at", new Date(ateMs).toISOString());

  const { data } = await q;

  const porPosicao = new Map<string, number[]>();
  for (const r of (data ?? []) as { position_id: string; recorded_at: string }[]) {
    const lista = porPosicao.get(r.position_id) ?? [];
    lista.push(Date.parse(r.recorded_at));
    porPosicao.set(r.position_id, lista);
  }
  return porPosicao;
}

/**
 * Quanto tempo a prova ficou aberta depois de o comboio parar de transmitir.
 *
 * Só faz sentido com encerramento declarado: sem ele, o fim É o último ping.
 */
function calcularCauda(
  cobertura: Map<string, number[]>,
  fimMs: number | null,
): number | null {
  if (!fimMs) return null;

  let ultimo = 0;
  for (const carimbos of cobertura.values()) {
    const c = carimbos[carimbos.length - 1];
    if (c !== undefined && c > ultimo) ultimo = c;
  }

  if (ultimo === 0) return null;
  return Math.max(0, Math.round((fimMs - ultimo) / 1000));
}

function paraVeiculo(
  p: PosicaoRow,
  carimbos: number[] | undefined,
  inicioMs: number | null,
  fimMs: number | null,
): VeiculoDoRelatorio {
  const base = {
    ordinal: p.ordinal,
    papel: p.role,
    rotulo: p.label,
    motorista: p.driver_name,
    placa: p.vehicle_plate,
    ehAbertura: p.is_reference_lead,
    ehFechamento: p.is_reference_sweep,
    vinculadoEm: null,
  };

  if (!carimbos || carimbos.length === 0) {
    return { ...base, pings: 0, primeiroPing: null, ultimoPing: null, cobertura: null, silencios: [] };
  }

  const silencios: VeiculoDoRelatorio["silencios"] = [];
  let caladoMs = 0;

  for (let i = 1; i < carimbos.length; i++) {
    const salto = carimbos[i]! - carimbos[i - 1]!;
    if (salto > SILENCIO_RELEVANTE_MS) {
      silencios.push({
        deMs: carimbos[i - 1]!,
        ateMs: carimbos[i]!,
        segundos: Math.round(salto / 1000),
      });
      caladoMs += salto;
    }
  }

  const duracao =
    inicioMs && fimMs && fimMs > inicioMs
      ? fimMs - inicioMs
      : carimbos.at(-1)! - carimbos[0]!;

  return {
    ...base,
    pings: carimbos.length,
    primeiroPing: new Date(carimbos[0]!).toISOString(),
    ultimoPing: new Date(carimbos.at(-1)!).toISOString(),
    cobertura: duracao > 0 ? Math.max(0, Math.min(1, 1 - caladoMs / duracao)) : null,
    silencios,
  };
}

function paraIncidente(
  a: AlertaRow,
  porId: Map<string, PosicaoRow>,
): IncidenteDoRelatorio {
  const criado = Date.parse(a.created_at);
  const noLocal = a.on_scene_at ? Date.parse(a.on_scene_at) : null;
  const resolvido = a.resolved_at ? Date.parse(a.resolved_at) : null;

  return {
    criadoEm: a.created_at,
    categoria: a.category,
    prioridade: a.priority,
    status: a.status,
    offsetM: a.route_offset_m === null ? null : Number(a.route_offset_m),
    lat: a.lat,
    lng: a.lng,
    nota: a.note,
    chamadoPor: a.raised_by_position_id
      ? (porId.get(a.raised_by_position_id)?.label ?? null)
      : null,
    atendidoPor: a.dispatched_position_id
      ? (porId.get(a.dispatched_position_id)?.label ?? null)
      : null,
    reconhecidoEm: a.acknowledged_at,
    despachadoEm: a.dispatched_at,
    noLocalEm: a.on_scene_at,
    resolvidoEm: a.resolved_at,
    segundosAteOLocal: noLocal ? Math.round((noLocal - criado) / 1000) : null,
    segundosAteResolver: resolvido ? Math.round((resolvido - criado) / 1000) : null,
  };
}

/**
 * O traçado reduzido para o mapinha.
 *
 * Um percurso de 3 300 pontos num desenho de 8 cm não ganha nada com 3 300
 * pontos, e faz o PDF pesar à toa. Amostragem uniforme, preservando o primeiro
 * e o último — largada e chegada são justamente os pontos que não podem sumir.
 */
function amostrarTracado(row: PercursoRow): [number, number][] {
  const bruto = (row.render_points ?? row.points) as unknown;
  if (!Array.isArray(bruto) || bruto.length === 0) return [];

  const passo = Math.max(1, Math.floor(bruto.length / PONTOS_DO_MAPA));
  const saida: [number, number][] = [];

  for (let i = 0; i < bruto.length; i += passo) {
    const p = bruto[i] as number[];
    if (Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])) {
      saida.push([p[0]!, p[1]!]);
    }
  }

  const ultimo = bruto.at(-1) as number[] | undefined;
  if (ultimo && Number.isFinite(ultimo[0]) && Number.isFinite(ultimo[1])) {
    saida.push([ultimo[0]!, ultimo[1]!]);
  }

  return saida;
}

// ---------------------------------------------------------------------------

interface ProvaRow {
  id: string;
  name: string;
  location: string | null;
  timezone: string | null;
  actual_start: string | null;
  finished_at: string | null;
  laps: number | null;
  target_gap_minutes: number | null;
  min_gap_minutes: number | null;
  max_gap_minutes: number | null;
}

interface PercursoRow {
  name: string | null;
  points: unknown;
  render_points: unknown;
  total_distance_m: number | string;
}

interface PosicaoRow {
  id: string;
  ordinal: number;
  role: string;
  label: string;
  driver_name: string | null;
  vehicle_plate: string | null;
  is_reference_lead: boolean;
  is_reference_sweep: boolean;
}

interface BloqueioRow {
  id: string;
  offset_m: number | string;
  name: string | null;
}

interface PingRow {
  recorded_at: string;
  received_at: string | null;
  route_offset_m: number | string;
  lap: number | null;
}

interface AlertaRow {
  id: string;
  created_at: string;
  category: string;
  priority: string | null;
  status: string;
  note: string | null;
  lat: number | null;
  lng: number | null;
  route_offset_m: number | string | null;
  raised_by_position_id: string | null;
  dispatched_position_id: string | null;
  acknowledged_at: string | null;
  dispatched_at: string | null;
  on_scene_at: string | null;
  resolved_at: string | null;
}
