/**
 * O diagrama do teste: 0,05 km em linha reta, 37,3 km pela estrada.
 *
 * A geometria é a de um percurso de ida e volta — as duas pernas correm lado a
 * lado, separadas pela largura da pista. É o caso mais comum e o mais cruel:
 * dois veículos que se enxergam pela janela do carro estão a trinta e sete
 * quilômetros um do outro pela única estrada que existe.
 *
 * TODO O TEXTO É HTML, NENHUM É SVG. Rótulo dentro de SVG encolhe junto com o
 * desenho: 12 px num viewBox de 720 viram 5,6 px num celular de 375, ilegíveis
 * e invisíveis para o leitor de tela. Aqui o desenho carrega a geometria e a
 * legenda em HTML carrega os números — que continuam selecionáveis, respeitam
 * o tamanho de fonte do sistema e são lidos em voz alta na ordem certa.
 */

const ROTA = [
  "M 64 318 Q 150 306 232 316", // largada → ambulância
  "Q 270 321 300 313", // ambulância → acidente (1,5 km)
  "Q 380 292 470 312", // acidente → adiante
  "Q 545 328 596 316",
  "Q 634 308 636 292", // retorno
  "Q 638 272 600 268",
  "Q 500 256 400 264",
  "Q 348 268 300 268", // → moto, na perna de volta
  "Q 220 268 168 276",
  "Q 122 284 112 236",
  "Q 106 200 140 176", // → chegada
].join(" ");

/** Do acidente até a moto, pela estrada: o caminho longo, em rouge. */
const PELA_ESTRADA = [
  "M 300 313",
  "Q 380 292 470 312",
  "Q 545 328 596 316",
  "Q 634 308 636 292",
  "Q 638 272 600 268",
  "Q 500 256 400 264",
  "Q 348 268 300 268",
].join(" ");

/** Da ambulância até o acidente: o caminho curto, o que o sistema escolheu. */
const AMBULANCIA_ATE_ACIDENTE = "M 232 316 Q 270 321 300 313";

export function DesvioDiagrama() {
  return (
    <figure className="fr-diagrama">
      {/* viewBox recortado no conteúdo, não no papel: o traçado ocupa y 140–335,
          e uma caixa de 400 de altura desperdiçava metade em branco — que num
          celular de 375 vira um desenho de 90 px dentro de um bloco de 160. */}
      <svg
        viewBox="24 118 656 252"
        className="fr-diagrama__svg"
        role="img"
        aria-label="Esquema de um percurso de ida e volta. O ponto do acidente fica na perna de ida; a moto está na perna de volta, a 50 metros em linha reta mas a 37,3 quilômetros pela estrada. A ambulância está 1,5 quilômetro atrás do acidente, na mesma perna e no mesmo sentido."
      >
        {/* Leito da estrada */}
        <path
          d={ROTA}
          fill="none"
          stroke="#c9d0d6"
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={ROTA}
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeDasharray="7 9"
          strokeLinecap="round"
        />

        {/* O caminho que a moto teria que fazer. */}
        <path
          className="fr-tracado"
          style={{ "--fr-len": 820 } as React.CSSProperties}
          d={PELA_ESTRADA}
          fill="none"
          stroke="#d92d20"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* O caminho que a ambulância fez. */}
        <path
          d={AMBULANCIA_ATE_ACIDENTE}
          fill="none"
          stroke="#12171c"
          strokeWidth="5"
          strokeLinecap="round"
        />

        {/* Linha reta entre a moto e o acidente: o número que engana. */}
        <line
          x1="300"
          y1="270"
          x2="300"
          y2="311"
          stroke="#616c77"
          strokeWidth="2"
          strokeDasharray="4 4"
        />

        {/* Largada e chegada */}
        <circle cx="64" cy="318" r="5" fill="#12171c" />
        <g>
          <rect x="138" y="150" width="2.6" height="28" fill="#12171c" />
          <polygon points="140,152 168,152 159,161 168,170 140,170" fill="#12171c" />
        </g>

        {/* Acidente: cruz em rouge. Dentro do produto esta cor significa
            exatamente isto, e aqui ela não significa outra coisa. */}
        <g transform="translate(300 313)">
          <circle r="12" fill="#ffffff" stroke="#d92d20" strokeWidth="3" />
          <path
            d="M -5 -5 L 5 5 M 5 -5 L -5 5"
            stroke="#d92d20"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        </g>

        {/* Moto: círculo vazado. */}
        <circle
          cx="300"
          cy="268"
          r="8"
          fill="#ffffff"
          stroke="#12171c"
          strokeWidth="3"
        />

        {/* Ambulância: quadrado cheio. */}
        <rect x="225" y="309" width="14" height="14" fill="#12171c" rx="1" />
      </svg>

      <figcaption className="fr-diagrama__legenda">
        <ul className="fr-legenda">
          <li className="fr-legenda__item">
            <span className="fr-legenda__marca fr-legenda__marca--moto" aria-hidden="true" />
            <span>
              <b className="fr-num">0,05</b>
              <span className="fr-unit">km</span> em linha reta entre a moto e o
              acidente. É este o número que um sistema de proximidade geométrica
              usa — e por ele a moto seria a escolhida.
            </span>
          </li>
          <li className="fr-legenda__item">
            <span className="fr-legenda__marca fr-legenda__marca--rota" aria-hidden="true" />
            <span>
              <b className="fr-num fr-num--rouge">37,3</b>
              <span className="fr-unit">km</span> pela estrada, no mesmo
              instante: a moto está na perna de volta e teria que refazer o
              retorno inteiro contra o fluxo da prova.
            </span>
          </li>
          <li className="fr-legenda__item">
            <span className="fr-legenda__marca fr-legenda__marca--amb" aria-hidden="true" />
            <span>
              <b className="fr-num">1,5</b>
              <span className="fr-unit">km</span> atrás, na mesma perna e no
              mesmo sentido: a ambulância, que foi quem o sistema acionou.
            </span>
          </li>
        </ul>
        <p className="fr-diagrama__nota">
          Esquema fora de escala. Números medidos num percurso real de teste.
        </p>
      </figcaption>
    </figure>
  );
}
