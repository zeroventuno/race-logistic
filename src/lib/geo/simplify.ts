import { localFrame, toLocalMeters, type LatLng } from "@/lib/geo/distance";

/**
 * Simplificação de linha (Ramer–Douglas–Peucker).
 *
 * Um GPX de prova costuma ter um ponto a cada segundo de gravação — 20 mil
 * vértices numa prova de 6 horas. Mandar isso para o browser desenhar custa
 * megabytes e trava o mapa no celular do motorista.
 *
 * O ponto importante: isto é usado APENAS para desenhar. A geometria completa
 * continua guardada e é ela que o cálculo de distância usa. Simplificar a
 * geometria de cálculo encurtaria o percurso e falsearia todos os
 * quilômetros — em 90 km, uma tolerância de 5 m tira centenas de metros.
 */
export function simplifyLine(points: LatLng[], toleranceM = 5): LatLng[] {
  if (points.length <= 2) return [...points];

  // Referencial plano único para toda a linha. Sobre a extensão de uma prova
  // a distorção é irrelevante para decidir o que descartar visualmente.
  const frame = localFrame(points[0]!);
  const xy = points.map((p) => toLocalMeters(frame, p));

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  // Pilha explícita em vez de recursão: com 20 mil pontos e uma linha quase
  // reta, a versão recursiva estoura a pilha do JavaScript.
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  const toleranceSq = toleranceM * toleranceM;

  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    if (last <= first + 1) continue;

    const a = xy[first]!;
    const b = xy[last]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;

    let maxDistSq = -1;
    let maxIndex = -1;

    for (let i = first + 1; i < last; i++) {
      const p = xy[i]!;
      let distSq: number;

      if (lenSq === 0) {
        const ex = p.x - a.x;
        const ey = p.y - a.y;
        distSq = ex * ex + ey * ey;
      } else {
        let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ex = p.x - (a.x + t * dx);
        const ey = p.y - (a.y + t * dy);
        distSq = ex * ex + ey * ey;
      }

      if (distSq > maxDistSq) {
        maxDistSq = distSq;
        maxIndex = i;
      }
    }

    if (maxDistSq > toleranceSq && maxIndex > 0) {
      keep[maxIndex] = 1;
      stack.push([first, maxIndex], [maxIndex, last]);
    }
  }

  const out: LatLng[] = [];
  for (let i = 0; i < points.length; i++) {
    if (keep[i]) out.push(points[i]!);
  }
  return out;
}

/**
 * Simplifica até caber num teto de pontos, afrouxando a tolerância aos poucos.
 *
 * Uma tolerância fixa não dá garantia de tamanho: 5 m devolve 400 pontos num
 * percurso liso e 9 mil num traçado urbano cheio de esquinas. O teto é o que
 * realmente importa para o navegador, então é ele que comanda.
 */
export function simplifyToBudget(
  points: LatLng[],
  maxPoints = 3000,
  startToleranceM = 3,
): { points: LatLng[]; toleranceM: number } {
  if (points.length <= maxPoints) {
    return { points: [...points], toleranceM: 0 };
  }

  let tolerance = startToleranceM;

  for (let attempt = 0; attempt < 12; attempt++) {
    const simplified = simplifyLine(points, tolerance);
    if (simplified.length <= maxPoints) {
      return { points: simplified, toleranceM: tolerance };
    }
    tolerance *= 2;
  }

  // Rede de segurança: amostragem uniforme. Feia, mas limitada — melhor que
  // devolver 20 mil pontos e travar o celular do motorista.
  const step = Math.ceil(points.length / maxPoints);
  const sampled = points.filter((_, i) => i % step === 0);
  const last = points[points.length - 1]!;
  if (sampled[sampled.length - 1] !== last) sampled.push(last);

  return { points: sampled, toleranceM: tolerance };
}
