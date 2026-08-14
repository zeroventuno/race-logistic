/**
 * A marca na landing.
 *
 * A geometria vem de `@/brand/mark` — o mesmo polígono do favicon, dos ícones
 * do PWA e do timbre da folha de códigos. Copiar os vértices para cá criaria a
 * sétima bandeirola ligeiramente diferente do projeto, que é exatamente o que
 * aquele módulo existe para impedir.
 *
 * Aqui a aplicação é `rouge`: material comercial não tem estado operacional na
 * tela, então o vermelho não disputa significado com nada. Dentro do produto a
 * regra é outra e continua valendo.
 */

import { BRAND, PENNANT_ICON, PENNANT_WITH_POLE } from "@/brand/mark";

interface BandeirolaProps {
  /** Lado em px. */
  size?: number;
  /** Cor do símbolo. Padrão: o rouge da marca. */
  color?: string;
  /** Tremular como o arco de verdade. Desligado sob `prefers-reduced-motion`. */
  tremular?: boolean;
  className?: string;
  /**
   * Sem o mastro, para os letreiros DEITADOS.
   *
   * O mastro existe para sustentar a bandeirola quando o nome está empilhado:
   * ali o símbolo é uma coluna vertical ao lado de um bloco de duas linhas, e
   * a haste dá a ele a mesma altura do bloco.
   *
   * Deitado, o nome é uma linha só de 15 px, e a haste vira um risco vertical
   * solto na frente da palavra — mais alto que as letras e sem nada para
   * sustentar. Sem mastro, a flâmula ocupa a caixa inteira e casa com a altura
   * da caixa alta, que é onde ela deve casar.
   */
  semMastro?: boolean;
}

export function Bandeirola({
  size = 28,
  color = BRAND.color.rouge,
  tremular = false,
  className,
  semMastro = false,
}: BandeirolaProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {semMastro ? null : (
        <rect
          x={PENNANT_WITH_POLE.pole.x}
          y={PENNANT_WITH_POLE.pole.y}
          width={PENNANT_WITH_POLE.pole.width}
          height={PENNANT_WITH_POLE.pole.height}
          fill={color}
        />
      )}
      <polygon
        points={semMastro ? PENNANT_ICON : PENNANT_WITH_POLE.flag}
        fill={color}
        className={tremular ? "fr-flutter" : undefined}
      />
    </svg>
  );
}

interface AssinaturaProps {
  size?: number;
  /** Cor da parte "FLAMME" — "ROUGE" é sempre rouge. */
  color?: string;
  tremular?: boolean;
  className?: string;
  /**
   * Letreiro numa linha só, em vez das duas palavras empilhadas.
   *
   * É a forma do CABEÇALHO, e a razão é altura: empilhado, o letreiro define
   * a altura da barra e a barra come a foto do herói. Numa linha ele cabe na
   * altura de um botão, e a barra fica fina.
   *
   * Empilhado continua sendo a forma da marca em qualquer lugar onde ela tem
   * espaço — herói e rodapé —, porque é lá que o bloco de duas palavras com a
   * mesma largura funciona como desenho.
   */
  linha?: boolean;
}

/**
 * Assinatura em HTML, não em `<img>`.
 *
 * O SVG de `public/brand/signature.svg` traz o texto vetorizado em Helvetica —
 * ótimo para impresso, ruim aqui: não é selecionável, não é lido por leitor de
 * tela e não acompanha o zoom de fonte do sistema. Texto de verdade com o
 * símbolo ao lado resolve os três.
 */
export function Assinatura({
  size = 30,
  color,
  tremular = false,
  className,
  linha = false,
}: AssinaturaProps) {
  return (
    <span className={`fr-assinatura ${className ?? ""}`}>
      <Bandeirola size={size} tremular={tremular} />
      {/* O nome é lido daqui; as letras abaixo são desenho. Sem isto, o leitor
          de tela soletraria "F, L, A, M, M, E". */}
      <span
        className={`fr-assinatura__nome${linha ? " fr-assinatura__nome--linha" : ""}`}
        role="img"
        aria-label="Flamme Rouge"
        style={color ? { color } : undefined}
      >
        {linha ? (
          <>
            {/* Numa linha as duas palavras não precisam casar de largura, e a
                distribuição letra a letra só atrapalharia: o que dá ritmo aqui
                é a entreletra corrida. */}
            <span aria-hidden="true">Flamme </span>
            <span aria-hidden="true" className="fr-assinatura__rouge">
              Rouge
            </span>
          </>
        ) : (
          <>
            <Palavra texto="Flamme" classe="fr-assinatura__flamme" />
            <Palavra texto="Rouge" classe="fr-assinatura__rouge" />
          </>
        )}
      </span>
    </span>
  );
}

/**
 * Uma palavra do letreiro, letra a letra.
 *
 * As duas palavras precisam ocupar EXATAMENTE a mesma largura, formando um
 * bloco. Entreletra fixa não resolve: "Flamme" tem seis letras em peso leve e
 * "Rouge" tem cinco em peso pesado, e a diferença de largura muda a cada
 * tamanho de fonte — um valor calibrado no cabeçalho desalinha no herói.
 *
 * Distribuindo as letras com `space-between` dentro de uma coluna flex, a
 * coluna assume a largura da palavra mais larga e a outra estica até bater.
 * O alinhamento passa a ser uma consequência do layout, não um número que
 * alguém precisa manter.
 */
function Palavra({ texto, classe }: { texto: string; classe: string }) {
  return (
    <span className={`fr-assinatura__palavra ${classe}`} aria-hidden="true">
      {[...texto.toUpperCase()].map((letra, i) => (
        <span key={`${letra}-${i}`}>{letra}</span>
      ))}
    </span>
  );
}

/**
 * Endosso.
 *
 * O lime do TRAKR (#A6E51A) sobre branco dá 1,5:1 — ilegível. Como fundo de
 * uma palavra em asfalto, dá 11,9:1. A regra da marca (lime só no endosso,
 * nunca sozinho) e a regra de contraste apontam para a mesma solução.
 */
export function ChipTrakr({ className }: { className?: string }) {
  return (
    <span className={`fr-trakr ${className ?? ""}`}>
      <span>by</span>
      <span className="fr-trakr__chip">{"TRAKR"}</span>
    </span>
  );
}
