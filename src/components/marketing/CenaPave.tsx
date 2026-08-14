/**
 * Cena do herói, desenhada.
 *
 * Existe por um motivo prático: a filmagem definitiva ainda não foi aprovada, e
 * um herói que só funciona depois que o vídeo chega não pode ser revisado nem
 * publicado. Esta cena ocupa o mesmo palco, com a mesma proporção e o mesmo
 * movimento — POV de dentro do carro, pavé passando, arco do último quilômetro
 * cruzando por cima da câmera. Quando o vídeo entrar, ela vira o fundo que
 * aparece se o `<video>` falhar.
 *
 * O PAVÉ EM PERSPECTIVA, E POR QUE ELE FECHA O LOOP.
 * As juntas ficam em progressão geométrica a partir do ponto de fuga:
 * d(k) = d0 · r^k. Uma escala de exatamente `r` em torno do ponto de fuga leva
 * cada junta para o lugar da junta seguinte — o quadro final é idêntico ao
 * inicial e o loop não tem emenda. É também a perspectiva correta: junta longe
 * anda devagar, junta perto anda rápido, sem nenhum truque de opacidade para
 * disfarçar a virada.
 *
 * O arco usa o mesmo centro de escala, com um atraso negativo para a primeira
 * passagem acontecer logo depois do carregamento — é essa passagem que o herói
 * escuta para assentar a marca.
 */

const VP_X = 600;
const VP_Y = 190;
const RAZAO = 1.28;
const LARGURA_POR_PROFUNDIDADE = 2.6;

/** Juntas do calçamento, do horizonte até bem depois da borda inferior. */
function juntas() {
  const linhas: { y: number; meia: number; k: number }[] = [];
  let d = 3;
  let k = 0;
  while (d < 400) {
    linhas.push({ y: VP_Y + d, meia: d * LARGURA_POR_PROFUNDIDADE, k });
    d *= RAZAO;
    k += 1;
  }
  return linhas;
}

const JUNTAS = juntas();

/** Frações da meia-largura onde ficam as juntas verticais, alternadas por fila. */
const TRAVES = [0.16, 0.42, 0.7, 0.94];

export function CenaPave({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 514"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Vista de dentro do carro de direção: estrada de paralelepípedo, ciclistas à frente e o arco do último quilômetro passando por cima."
    >
      <defs>
        <linearGradient id="fr-ceu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d262f" />
          <stop offset="60%" stopColor="#3c4a56" />
          <stop offset="100%" stopColor="#6a7783" />
        </linearGradient>
        <linearGradient id="fr-asfalto" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#39424b" />
          <stop offset="100%" stopColor="#1f262d" />
        </linearGradient>
        <linearGradient id="fr-neblina" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4c5a66" stopOpacity="1" />
          <stop offset="100%" stopColor="#4c5a66" stopOpacity="0" />
        </linearGradient>
        <clipPath id="fr-estrada">
          <polygon points="600,190 1560,560 -360,560" />
        </clipPath>
      </defs>

      {/* Céu de Flandres: encoberto, sem sol de cartão-postal. */}
      <rect width="1200" height="200" fill="url(#fr-ceu)" />

      {/* Campo dos dois lados. */}
      <rect y="188" width="1200" height="326" fill="#2b3339" />
      <rect y="188" width="1200" height="26" fill="#39434a" />

      <g clipPath="url(#fr-estrada)">
        <polygon points="600,190 1560,560 -360,560" fill="url(#fr-asfalto)" />

        <g className="fr-cena__pave">
          {JUNTAS.map(({ y, meia, k }) => (
            <g key={k}>
              <line
                x1={VP_X - meia}
                y1={y}
                x2={VP_X + meia}
                y2={y}
                stroke="#5a6672"
                strokeWidth={Math.max(0.6, meia * 0.012)}
                opacity="0.75"
              />
              {TRAVES.map((f) => {
                const deslocamento = k % 2 === 0 ? 0 : 0.13;
                const proximaY = y * 1 + (y - VP_Y) * (RAZAO - 1);
                return [-1, 1].map((lado) => (
                  <line
                    key={`${f}-${lado}`}
                    x1={VP_X + lado * (f + deslocamento) * meia}
                    y1={y}
                    x2={VP_X + lado * (f + deslocamento) * meia * RAZAO}
                    y2={proximaY}
                    stroke="#5a6672"
                    strokeWidth={Math.max(0.5, meia * 0.01)}
                    opacity="0.45"
                  />
                ));
              })}
            </g>
          ))}
        </g>

        {/* Neblina no horizonte: some a linha em que as juntas nascem. */}
        <rect y="188" width="1200" height="58" fill="url(#fr-neblina)" />
      </g>

      {/* Ciclistas: pequenos e distantes de propósito. A cena vende o ponto de
          vista, não a anatomia da bicicleta. */}
      <g fill="#141a20" opacity="0.92">
        <g transform="translate(560 252) scale(0.62)">
          <Ciclista />
        </g>
        <g transform="translate(636 258) scale(0.7)">
          <Ciclista />
        </g>
        <g transform="translate(592 268) scale(0.86)">
          <Ciclista />
        </g>
        <g transform="translate(510 276) scale(0.8)">
          <Ciclista />
        </g>
        <g transform="translate(672 286) scale(1)">
          <Ciclista />
        </g>
      </g>

      {/* Arco do último quilômetro. Mesmo ponto de fuga, mesma escala — ele
          passa por cima da câmera, não cresce parado no lugar. */}
      <g className="fr-cena__arco">
        <rect x="536" y="178" width="6" height="26" fill="#0f1418" />
        <rect x="658" y="178" width="6" height="26" fill="#0f1418" />
        <rect x="530" y="172" width="140" height="13" fill="#d92d20" />
        <polygon points="536,174 560,174 553,178.5 560,183 536,183" fill="#fff" />
        <text
          x="608"
          y="183.4"
          textAnchor="middle"
          fontSize="8.6"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.6"
          fill="#ffffff"
        >
          1 KM
        </text>
      </g>

      {/* Coluna do para-brisa e capô: o enquadramento é de dentro do carro. */}
      <path d="M0 514 L0 470 Q 600 432 1200 470 L1200 514 Z" fill="#0d1216" />
      <path
        d="M0 470 Q 600 432 1200 470"
        fill="none"
        stroke="#2c353d"
        strokeWidth="2"
      />
    </svg>
  );
}

/** Silhueta de ciclista vista por trás. Quatro formas, nenhuma pretensão. */
function Ciclista() {
  return (
    <>
      <ellipse cx="0" cy="14" rx="2.6" ry="7" />
      <ellipse cx="0" cy="1" rx="4.6" ry="5.2" />
      <circle cx="0" cy="-5.4" r="2.8" />
      <rect x="-5.4" y="-1.6" width="10.8" height="1.7" rx="0.8" />
    </>
  );
}
