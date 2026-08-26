/**
 * Representação do percurso e índice espacial.
 *
 * A ideia central do sistema todo está aqui: o percurso é tratado como uma
 * *linha referenciada*. Cada vértice carrega sua distância cumulativa desde a
 * largada, então a posição de qualquer veículo vira um único número — quantos
 * metros de prova ele já percorreu. Com isso:
 *
 *   - a distância entre dois veículos é uma subtração, e é a distância pela
 *     estrada, não pelo ar;
 *   - "onde estará o vassoura daqui a 10 min" é uma soma seguida de uma busca
 *     binária;
 *   - um percurso em U não confunde o cálculo: dois veículos a 50 m um do
 *     outro em linha reta, mas em pernas opostas do U, aparecem corretamente
 *     como estando a 8 km um do outro.
 */

import {
  bearingDegrees,
  haversineMeters,
  interpolate,
  METERS_PER_DEG_LAT,
  type LatLng,
} from "@/lib/geo/distance";

/** Formato compacto de persistência: [lng, lat, distância cumulativa, elevação]. */
export type RoutePointTuple = [number, number, number, number | null];

export interface BBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface RouteTrack {
  points: RoutePointTuple[];
  totalDistanceM: number;
  bbox: BBox;
  elevationGainM: number | null;
  /**
   * Largada e chegada no mesmo lugar.
   *
   * Não é detalhe cosmético: num traçado fechado o offset 0 e o offset final
   * são o MESMO ponto do mapa, e um veículo que cruza a linha precisa voltar a
   * zero em vez de ficar preso no fim. Sem esta marca, uma prova em circuito
   * reporta a segunda volta como se fosse a primeira — silenciosamente.
   */
  isLoop: boolean;
  /** Distância em linha reta entre largada e chegada, em metros. */
  startFinishGapM: number;
}

export interface RawRoutePoint {
  lat: number;
  lng: number;
  ele?: number | null;
}

/** Descarta pontos consecutivos mais próximos que isto (ruído de GPS parado). */
const MIN_VERTEX_SPACING_M = 0.5;

/**
 * Salto absurdo entre dois pontos consecutivos de um GPX. Acima disso, o
 * arquivo provavelmente tem um artefato (pausa na gravação, sinal perdido em
 * túnel) e somar essa distância inflaria o comprimento da prova.
 */
const MAX_PLAUSIBLE_VERTEX_JUMP_M = 5_000;

/**
 * Largada e chegada mais próximas que isto significam prova em circuito.
 *
 * 200 m é folgado o bastante para cobrir o caso normal — o arco de chegada
 * fica a um quarteirão da largada — e apertado o bastante para não confundir
 * uma prova ponto-a-ponto cujas pontas por acaso ficaram na mesma cidade.
 */
const LOOP_CLOSURE_THRESHOLD_M = 200;

/**
 * Teto de vértices.
 *
 * Não é limite de conforto, é limite de segurança. Um ping cujo ponto está
 * longe do traçado cai numa varredura O(n) sobre todos os segmentos; com um
 * lote offline cheio (centenas de pings) e um GPX de 100 mil vértices isso vira
 * dezenas de segundos de CPU numa única requisição — acima do tempo limite de
 * uma função serverless. A resposta de erro faz o app manter o lote na fila e
 * reenviar para sempre, e o veículo nunca mais aparece no mapa.
 *
 * 60 mil vértices cobrem uma prova de 300 km gravada a cada 5 m.
 */
const MAX_VERTICES = 60_000;

export interface BuildTrackResult {
  track: RouteTrack;
  /** Problemas encontrados que o diretor precisa ver antes de confirmar. */
  warnings: string[];
}

/**
 * Constrói um percurso a partir de pontos crus, calculando a distância
 * cumulativa em cada vértice.
 */
export function buildRouteTrack(raw: RawRoutePoint[]): BuildTrackResult {
  const warnings: string[] = [];

  const valid = raw.filter(
    (p) =>
      Number.isFinite(p.lat) &&
      Number.isFinite(p.lng) &&
      p.lat >= -90 &&
      p.lat <= 90 &&
      p.lng >= -180 &&
      p.lng <= 180,
  );

  if (valid.length !== raw.length) {
    warnings.push(
      `${raw.length - valid.length} ponto(s) com coordenada inválida foram descartados.`,
    );
  }

  if (valid.length < 2) {
    throw new RouteTrackError(
      "O percurso precisa de pelo menos 2 pontos válidos.",
    );
  }

  const points: RoutePointTuple[] = [];
  let cum = 0;
  let sawElevation = false;
  let jumpCount = 0;

  const first = valid[0]!;
  points.push([first.lng, first.lat, 0, first.ele ?? null]);
  if (first.ele != null) sawElevation = true;

  let prev: RawRoutePoint = first;

  for (let i = 1; i < valid.length; i++) {
    const cur = valid[i]!;
    const step = haversineMeters(prev, cur);

    // Vértices coincidentes só engordam o array e criam segmentos degenerados
    // no snap. O último ponto é sempre mantido para não encurtar a prova.
    if (step < MIN_VERTEX_SPACING_M && i !== valid.length - 1) {
      continue;
    }

    if (step > MAX_PLAUSIBLE_VERTEX_JUMP_M) {
      jumpCount++;
    }

    cum += step;

    if (cur.ele != null) sawElevation = true;

    points.push([cur.lng, cur.lat, cum, cur.ele ?? null]);
    prev = cur;
  }

  if (jumpCount > 0) {
    warnings.push(
      `${jumpCount} salto(s) acima de ${MAX_PLAUSIBLE_VERTEX_JUMP_M / 1000} km entre pontos consecutivos — verifique se o GPX tem trechos faltando.`,
    );
  }

  if (points.length < 2) {
    throw new RouteTrackError(
      "Depois de remover pontos duplicados sobrou menos de 2 pontos.",
    );
  }

  if (cum < 100) {
    warnings.push(
      `O percurso tem apenas ${cum.toFixed(0)} m. Confirme se é isso mesmo.`,
    );
  }

  if (points.length > MAX_VERTICES) {
    throw new RouteTrackError(
      `O percurso tem ${points.length.toLocaleString("pt-BR")} pontos, acima do limite de ${MAX_VERTICES.toLocaleString("pt-BR")}. ` +
        `Simplifique o GPX antes de enviar — a precisão do cálculo não melhora com mais pontos que isso, mas o tempo de resposta piora muito.`,
    );
  }

  const first2 = points[0]!;
  const last2 = points[points.length - 1]!;
  const startFinishGapM = haversineMeters(
    { lat: first2[1], lng: first2[0] },
    { lat: last2[1], lng: last2[0] },
  );

  const isLoop =
    cum > 1_000 && startFinishGapM < LOOP_CLOSURE_THRESHOLD_M;

  if (isLoop) {
    warnings.push(
      `Largada e chegada estão a ${startFinishGapM.toFixed(0)} m uma da outra — este é um percurso em circuito. ` +
        `O sistema acompanha as voltas, mas confira que o número de voltas da prova está correto no cadastro: ` +
        `sem isso, um veículo na segunda volta seria mostrado como se estivesse na primeira.`,
    );
  }

  // O referencial plano usado na projeção não normaliza longitude, então um
  // percurso que cruza a linha de data produziria posições do outro lado do
  // planeta. É melhor recusar na importação do que calcular errado em prova.
  const { minLng, maxLng } = computeBBox(points);
  if (maxLng - minLng > 180) {
    throw new RouteTrackError(
      "O percurso parece cruzar o antimeridiano (linha de data internacional). Esse caso não é suportado.",
    );
  }

  const track: RouteTrack = {
    points,
    totalDistanceM: cum,
    bbox: computeBBox(points),
    elevationGainM: sawElevation ? elevationGainM(points) : null,
    isLoop,
    startFinishGapM,
  };

  // O aviso do fio enrolado vem DEPOIS do de circuito e é mais específico que
  // ele: quem sobe três voltas desenhadas recebe os dois, e o segundo diz o
  // que fazer. Deixá-lo aqui, na importação, é o único lugar em que ainda dá
  // para corrigir sem custo — depois da largada, a quilometragem já saiu no
  // rádio.
  const voltasDetectadas = voltasNoTracado(track);
  if (voltasDetectadas > 1) {
    warnings.push(
      `Este arquivo parece conter ${voltasDetectadas} voltas desenhadas como um traçado só. ` +
        `O sistema espera UMA volta e multiplica pelo número de voltas do cadastro — ` +
        `se você escrever ${voltasDetectadas} lá, a prova ficará com ${voltasDetectadas * voltasDetectadas} voltas de distância. ` +
        `Recorte o arquivo para uma volta, ou deixe o campo de voltas em 1.`,
    );
  }

  return { track, warnings };
}

export class RouteTrackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RouteTrackError";
  }
}

/**
 * Janela de suavização do perfil, em metros de percurso.
 *
 * Uma subida que merece nome tem quilômetros. 200 m alisam a tremedeira do
 * aparelho sem achatar rampa nenhuma que alguém vá lembrar depois.
 */
const SUAVIZACAO_M = 220;

/** Abaixo disto, "subiu" é o aparelho respirando, não a estrada. */
const LIMIAR_DE_SUBIDA_M = 4;

/**
 * Ganho de elevação acumulado.
 *
 * ------------------------------------------------------------------------
 * SOMAR TODO DELTA POSITIVO É O ERRO CLÁSSICO, e era o que este arquivo fazia.
 *
 * A elevação de um GPX oscila um ou dois metros por ponto — é ruído de GPS ou
 * de barômetro, não estrada. Somado ponto a ponto ao longo de milhares de
 * amostras, esse ruído vira centenas de metros de subida que nunca existiram.
 *
 * Medido num granfondo real de 110 km com 4 178 pontos, contra DUAS
 * referências independentes do mesmo arquivo: 2 201 m publicados pelo
 * organizador e 2 267 m calculados pelo Hammerhead.
 *
 *   soma crua ......................... 3 183 m   (+45% sobre o organizador)
 *   histerese de 3 m, sem suavizar .... 2 942 m   (+34%)
 *   suavização 220 m + histerese 4 m .. 2 265 m    (+3%, = Hammerhead)
 *
 * Que as duas referências discordem em 66 m entre si é o dado mais útil de
 * todos: ganho acumulado NÃO TEM VALOR VERDADEIRO, tem método. O alvo certo
 * não é acertar um dos dois números — é cair entre eles.
 *
 * Os parâmetros foram escolhidos pelo PLATÔ, não pelo pico. Mexer a janela
 * para 200 ou 250 m e o limiar para 3 ou 5 m mantém o resultado entre 2 198 e
 * 2 315 m. Uma combinação que acertasse 2 201 na mosca existia e foi
 * descartada: acertar uma prova ajustando duas constantes é ajustar ao ruído
 * dela, não medir melhor.
 *
 * Este número é INFORMATIVO. Nenhuma conta do produto depende dele: a janela
 * sai de distância ao longo da rota, e o despacho também.
 */
export function elevationGainM(points: RoutePointTuple[]): number | null {
  const perfil: { d: number; e: number }[] = [];
  for (const [, , d, e] of points) {
    if (e != null && Number.isFinite(e)) perfil.push({ d, e });
  }

  if (perfil.length < 2) return null;

  // Média móvel por JANELA DE DISTÂNCIA, não por número de pontos: um GPX
  // grava denso na cidade e esparso na estrada, e uma janela por índice
  // suavizaria demais num trecho e de menos no outro.
  const suave = new Array<number>(perfil.length);
  let a = 0;
  let b = 0;
  let soma = 0;

  for (let i = 0; i < perfil.length; i++) {
    const lo = perfil[i]!.d - SUAVIZACAO_M / 2;
    const hi = perfil[i]!.d + SUAVIZACAO_M / 2;
    while (a < perfil.length && perfil[a]!.d < lo) soma -= perfil[a++]!.e;
    while (b < perfil.length && perfil[b]!.d <= hi) soma += perfil[b++]!.e;
    suave[i] = soma / Math.max(1, b - a);
  }

  // Histerese: a referência sobe só quando a subida passa do limiar, e desce
  // livre. Assim uma rampa longa é contada inteira, e um sobe-e-desce de dois
  // metros não é contado nunca.
  let referencia = suave[0]!;
  let ganho = 0;

  for (const e of suave) {
    if (e >= referencia + LIMIAR_DE_SUBIDA_M) {
      ganho += e - referencia;
      referencia = e;
    } else if (e < referencia) {
      referencia = e;
    }
  }

  return Math.round(ganho);
}

export function computeBBox(points: RoutePointTuple[]): BBox {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of points) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  return { minLng, minLat, maxLng, maxLat };
}

/**
 * O arquivo já vem com as voltas enroladas?
 *
 * O sistema espera que o GPX seja UMA volta e que o número de voltas venha do
 * cadastro — a distância da prova é o traçado multiplicado por esse número.
 * Quem exporta o percurso de um relógio depois de reconhecer a prova inteira
 * traz o fio enrolado: três voltas desenhadas como uma linha só. Se essa
 * pessoa também escrever 3 no campo de voltas, a prova passa a ter nove.
 *
 * E o número errado é o menos grave. O sistema detecta circuito pela largada e
 * chegada coincidirem — o que continua verdade num fio de três voltas — e passa
 * a achar que UMA volta tem o comprimento de três. A janela de busca de posição
 * fica com a escala errada, a mesma curva física aparece três vezes dentro do
 * que ele chama de uma volta, e a contagem "volta 2/3" vira ficção.
 *
 * COMO SE DETECTA: um traçado enrolado N vezes se repete a cada `total / N`
 * metros. Anda-se pelo fio comparando o ponto em `d` com o ponto em
 * `d + total/N`; se quase todos coincidirem no chão, o fio deu N voltas.
 *
 * Isto NÃO confunde com ida-e-volta, e a razão é geométrica: numa ida-e-volta
 * o ponto que coincide com `d` é `total - d`, um espelho, não um deslocamento
 * fixo. O teste de deslocamento constante não casa.
 *
 * Devolve o MAIOR N que casa, que é a volta de verdade: num fio de seis voltas
 * o deslocamento de três voltas também casa, e reportar 2 seria dizer meia
 * verdade.
 */
export function voltasNoTracado(track: RouteTrack): number {
  const total = track.totalDistanceM;

  // Abaixo disto não há volta que se detecte com confiança, e o custo de um
  // falso positivo (assustar quem subiu um percurso curto legítimo) é maior
  // que o do falso negativo.
  if (total < 2_000 || track.points.length < 20) return 1;

  for (let n = MAX_VOLTAS_DETECTAVEIS; n >= 2; n--) {
    const voltaM = total / n;
    if (voltaM < 500) continue;
    if (fioSeRepeteA(track, voltaM)) return n;
  }

  return 1;
}

/** Quantas voltas enroladas vale a pena procurar. Além disso é ruído. */
const MAX_VOLTAS_DETECTAVEIS = 12;

/** Amostras ao longo de uma volta. O bastante para não casar por acaso. */
const AMOSTRAS_POR_VOLTA = 48;

/** Dois pontos a menos disto um do outro são o mesmo lugar da estrada. */
const TOLERANCIA_M = 25;

/**
 * Fração das amostras que precisa coincidir.
 *
 * Não é 100% porque o fio real não fecha perfeito: o GPS oscila, o piloto
 * abre mais numa curva na segunda volta, e a largada costuma ter um trecho
 * neutralizado que só existe na primeira. Exigir perfeição faria a detecção
 * nunca disparar justamente nos arquivos de verdade.
 */
const FRACAO_MINIMA = 0.9;

function fioSeRepeteA(track: RouteTrack, voltaM: number): boolean {
  let casaram = 0;

  for (let i = 0; i < AMOSTRAS_POR_VOLTA; i++) {
    const d = (voltaM * (i + 0.5)) / AMOSTRAS_POR_VOLTA;
    const aqui = positionAtOffset(track, d);
    const depois = positionAtOffset(track, d + voltaM);

    if (haversineMeters(aqui, depois) <= TOLERANCIA_M) casaram++;
  }

  return casaram / AMOSTRAS_POR_VOLTA >= FRACAO_MINIMA;
}

/** Posição geográfica a `offsetM` metros da largada, ao longo do percurso. */
export function positionAtOffset(track: RouteTrack, offsetM: number): LatLng {
  const pts = track.points;
  const clamped = Math.max(0, Math.min(track.totalDistanceM, offsetM));

  const i = findSegmentIndex(track, clamped);
  const a = pts[i]!;
  const b = pts[i + 1];

  if (!b) {
    return { lat: a[1], lng: a[0] };
  }

  const segLen = b[2] - a[2];
  const t = segLen > 0 ? (clamped - a[2]) / segLen : 0;

  return interpolate({ lat: a[1], lng: a[0] }, { lat: b[1], lng: b[0] }, t);
}

/** Rumo do percurso no offset dado — usado para orientar o ícone do veículo. */
export function headingAtOffset(
  track: RouteTrack,
  offsetM: number,
): number | null {
  const pts = track.points;
  if (pts.length < 2) return null;

  const i = findSegmentIndex(track, offsetM);
  const a = pts[i]!;
  const b = pts[i + 1] ?? pts[i - 1];
  if (!b) return null;

  return bearingDegrees({ lat: a[1], lng: a[0] }, { lat: b[1], lng: b[0] });
}

/**
 * Índice do segmento que contém `offsetM`. Busca binária sobre a cumulativa —
 * é o que mantém o custo em O(log n) mesmo num GPX de 20 mil pontos.
 */
export function findSegmentIndex(track: RouteTrack, offsetM: number): number {
  const pts = track.points;
  let lo = 0;
  let hi = pts.length - 1;

  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (pts[mid]![2] <= offsetM) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  // Devolve sempre um índice que tem um sucessor, exceto num percurso de 1 ponto.
  return Math.min(lo, Math.max(0, pts.length - 2));
}

// ---------------------------------------------------------------------------
// Índice espacial
// ---------------------------------------------------------------------------

const GRID_CELL_M = 250;

/**
 * Grade uniforme que mapeia célula → segmentos que a atravessam.
 *
 * Sem isso, achar o segmento mais próximo de um ping custa uma varredura em
 * todos os segmentos do percurso. Com 12 veículos a 1 Hz num percurso de
 * 20 mil pontos isso seria 240 mil testes de projeção por segundo, no servidor,
 * durante horas. Com a grade, cada ping olha algumas dezenas de candidatos.
 */
export class RouteIndex {
  readonly track: RouteTrack;
  private readonly cells = new Map<string, number[]>();
  private readonly originLat: number;
  private readonly originLng: number;
  private readonly cellDegLat: number;
  private readonly cellDegLng: number;

  constructor(track: RouteTrack) {
    this.track = track;

    const { minLat, minLng, maxLat, maxLng } = track.bbox;
    this.originLat = minLat;
    this.originLng = minLng;

    const midLat = (minLat + maxLat) / 2;
    this.cellDegLat = GRID_CELL_M / METERS_PER_DEG_LAT;
    this.cellDegLng =
      GRID_CELL_M /
      Math.max(1, METERS_PER_DEG_LAT * Math.cos((midLat * Math.PI) / 180));

    this.buildIndex();
  }

  /**
   * Chave da célula.
   *
   * Foi `iy * cols + ix`, e isso estava ERRADO: só é injetiva enquanto
   * `ix` está dentro de [0, cols). Um ponto fora da caixa envolvente do
   * percurso — um veículo que desviou algumas centenas de metros — produz `ix`
   * negativo ou grande demais, e a chave colide com outra linha da grade. O
   * efeito medido num percurso real: veículo a 800 m do traçado sendo colocado
   * a 52 km do lugar certo, porque a busca recebia um balde de segmentos de
   * outra parte do mapa e escolhia o melhor entre eles.
   *
   * Pior ainda, a colisão tornava inalcançável a varredura completa que existe
   * justamente como rede de segurança para pontos distantes: `candidatesNear`
   * quase nunca devolvia vazio.
   *
   * String é mais lenta que aritmética, e é o preço certo a pagar por uma
   * chave que não mente.
   */
  private cellKey(ix: number, iy: number): string {
    return `${ix},${iy}`;
  }

  private cellOf(lat: number, lng: number): { ix: number; iy: number } {
    return {
      ix: Math.floor((lng - this.originLng) / this.cellDegLng),
      iy: Math.floor((lat - this.originLat) / this.cellDegLat),
    };
  }

  private buildIndex(): void {
    const pts = this.track.points;

    // Constrói com Set e converte no fim. Deduplicar comparando só com o
    // último inserido deixava passar repetição em traçado que serpenteia
    // dentro de uma mesma célula — o índice inchava sem necessidade.
    const building = new Map<string, Set<number>>();

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;

      // Rasteriza o segmento: caminha por ele em passos de meia célula e
      // registra o segmento em cada célula tocada. Mais simples que um
      // algoritmo de linha exato e nunca deixa um buraco.
      const segLen = b[2] - a[2];
      const steps = Math.max(1, Math.ceil((segLen * 2) / GRID_CELL_M));

      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const lng = a[0] + (b[0] - a[0]) * t;
        const lat = a[1] + (b[1] - a[1]) * t;
        const { ix, iy } = this.cellOf(lat, lng);

        // Registra também nas 8 células vizinhas: um ponto consultado perto da
        // borda de uma célula precisa enxergar o segmento da célula ao lado.
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const key = this.cellKey(ix + dx, iy + dy);
            let bucket = building.get(key);
            if (!bucket) {
              bucket = new Set();
              building.set(key, bucket);
            }
            bucket.add(i);
          }
        }
      }
    }

    for (const [key, set] of building) {
      this.cells.set(key, [...set]);
    }
  }

  /**
   * Segmentos candidatos perto de um ponto, expandindo o raio se necessário.
   *
   * Depois de encontrar o primeiro anel com conteúdo, expande MAIS UM antes de
   * devolver. O motivo é geométrico: os anéis são quadrados (distância de
   * Chebyshev), não círculos. A diagonal do anel 4 está a ~1414 m enquanto a
   * lateral do anel 5 está a ~1250 m — parar no primeiro anel não-vazio pode
   * devolver um segmento diagonal distante e deixar de fora o segmento
   * ortogonal que é o verdadeiro mais próximo.
   */
  candidatesNear(p: LatLng, maxRings = 5): number[] {
    const { ix, iy } = this.cellOf(p.lat, p.lng);

    const found = new Set<number>();
    let ringsAfterFirstHit = 0;

    for (let ring = 0; ring <= maxRings; ring++) {
      for (let dx = -ring; dx <= ring; dx++) {
        for (let dy = -ring; dy <= ring; dy++) {
          // Só a casca do anel — o interior já foi visto na iteração anterior.
          if (ring > 0 && Math.abs(dx) !== ring && Math.abs(dy) !== ring) {
            continue;
          }
          const bucket = this.cells.get(this.cellKey(ix + dx, iy + dy));
          if (bucket) {
            for (const seg of bucket) found.add(seg);
          }
        }
      }

      if (found.size > 0) {
        ringsAfterFirstHit++;
        if (ringsAfterFirstHit >= 2) break;
      }
    }

    return [...found];
  }
}
