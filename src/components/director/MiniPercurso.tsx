/**
 * A miniatura do traçado, na lista de provas.
 *
 * Serve para uma coisa só: reconhecer a prova sem ler o nome. Quem organiza
 * três eventos por ano decora o formato do circuito muito antes de decorar o
 * nome que deu ao arquivo, e numa lista de provas parecidas ("Giro de teste",
 * "Giro de teste 2") o desenho é o que diferencia.
 *
 * SEM MAPA. É a linha nua sobre o fundo escuro — nada de tiles, que a 132 px
 * seriam ruído, e nada de rede, que numa lista de vinte provas seriam vinte
 * requisições para desenhar vinte selos.
 *
 * O componente é de SERVIDOR, e isso é o ponto: `render_points` pode ter
 * algumas centenas de pares por prova, e é aqui que eles morrem. Para o
 * navegador vai só o atributo `d` já reduzido — algumas centenas de bytes.
 */

export const LARGURA = 132;
export const ALTURA = 88;
export const MARGEM = 8;

/** Pontos no desenho final. Acima disso, a 132 px, vira uma mancha. */
const MAX_PONTOS = 64;

export interface MiniPercursoProps {
  /** `render_points` da tabela: pares [lng, lat] já simplificados. */
  pontos: [number, number][];
  /**
   * O que escrever quando a prova ainda não tem traçado. Vem de fora já
   * traduzido: este componente é puro e não tem tradutor próprio.
   */
  rotuloSemPercurso: string;
  className?: string;
}

export function MiniPercurso({
  pontos,
  rotuloSemPercurso,
  className,
}: MiniPercursoProps) {
  const d = caminho(pontos);

  if (!d) {
    return (
      <div
        aria-hidden
        className={`flex items-center justify-center border border-border bg-surface-3 ${className ?? ""}`}
        style={{ width: LARGURA, height: ALTURA }}
      >
        <span className="font-mono text-[0.5625rem] uppercase tracking-[0.18em] text-ink-faint">
          {rotuloSemPercurso}
        </span>
      </div>
    );
  }

  return (
    <svg
      aria-hidden
      className={className}
      width={LARGURA}
      height={ALTURA}
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      style={{ background: "#0c0f12" }}
    >
      {/* Duas passadas: o casing escuro embaixo mantém a linha legível quando
          ela se cruza — que é o caso de todo circuito. */}
      <path
        d={d}
        fill="none"
        stroke="rgb(10 13 16 / 0.7)"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={d}
        fill="none"
        stroke="var(--route-line)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Projeta os pares [lng, lat] na caixa da miniatura.
 *
 * Não é uma projeção cartográfica: numa caixa de 132 px, a diferença entre
 * Mercator e uma regra de três é menor que um pixel. O que importa é preservar
 * a PROPORÇÃO — esticar o desenho para preencher a caixa transformaria um
 * circuito redondo num oval e destruiria justamente a coisa que faz a
 * miniatura funcionar, que é o formato ser reconhecível.
 *
 * A latitude é invertida porque no mundo ela cresce para cima e em SVG o eixo
 * Y cresce para baixo.
 */
export function caminho(pontos: [number, number][]): string | null {
  if (!Array.isArray(pontos) || pontos.length < 2) return null;

  const limpos = pontos.filter(
    (p): p is [number, number] =>
      Array.isArray(p) &&
      p.length >= 2 &&
      Number.isFinite(p[0]) &&
      Number.isFinite(p[1]),
  );
  if (limpos.length < 2) return null;

  const passo = Math.max(1, Math.ceil(limpos.length / MAX_PONTOS));
  const amostra = limpos.filter((_, i) => i % passo === 0);
  // O último ponto entra sempre: num circuito é ele que fecha a volta, e
  // perdê-lo por causa do passo deixa uma falha visível no desenho.
  const ultimo = limpos[limpos.length - 1]!;
  if (amostra[amostra.length - 1] !== ultimo) amostra.push(ultimo);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [lng, lat] of amostra) {
    if (lng < minX) minX = lng;
    if (lng > maxX) maxX = lng;
    if (lat < minY) minY = lat;
    if (lat > maxY) maxY = lat;
  }

  const larguraGeo = maxX - minX;
  const alturaGeo = maxY - minY;
  // Percurso degenerado (todos os pontos no mesmo lugar) não tem forma.
  if (larguraGeo <= 0 && alturaGeo <= 0) return null;

  const util = { w: LARGURA - MARGEM * 2, h: ALTURA - MARGEM * 2 };
  const escala = Math.min(
    larguraGeo > 0 ? util.w / larguraGeo : Infinity,
    alturaGeo > 0 ? util.h / alturaGeo : Infinity,
  );

  const sobraX = (util.w - larguraGeo * escala) / 2;
  const sobraY = (util.h - alturaGeo * escala) / 2;

  return amostra
    .map(([lng, lat], i) => {
      const x = MARGEM + sobraX + (lng - minX) * escala;
      const y = MARGEM + sobraY + (maxY - lat) * escala;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}
