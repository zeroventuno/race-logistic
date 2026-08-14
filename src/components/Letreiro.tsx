import { Bandeirola } from "@/components/marketing/marca";

/**
 * O letreiro deitado: bandeirinha + FLAMME ROUGE numa linha.
 *
 * Existe porque as telas de dentro do produto não enxergam `marketing.css` —
 * ele é importado só pela casca da landing, de propósito, para o visual da
 * página de venda nunca vazar para o painel. O resultado é que o cabeçalho do
 * app vinha escrevendo "FLAMME ROUGE" em texto mono liso, sem símbolo e sem o
 * contraste de peso que é a marca inteira.
 *
 * O CONTRASTE DE PESO É O DESENHO. "Flamme" em 300 e "Rouge" em 700 não é
 * detalhe tipográfico: é o que faz duas palavras genéricas lerem como um nome.
 * Em 600 contra 700, que era o que estava no ar, a diferença some — e sem ela
 * sobra caixa alta espaçada, que é o que todo mundo faz.
 *
 * SEM MASTRO, sempre. Deitado, a haste vira um risco vertical solto na frente
 * da palavra, mais alto que as letras e sem nada para sustentar.
 */

export interface LetreiroProps {
  /**
   * Cor da bandeirinha.
   *
   * `rouge` só nas duas portas do produto — entrar e criar conta. Passada a
   * porta é `currentColor`, que faz o símbolo herdar a cor do texto e
   * acompanhar tema e foco sozinho, sem regra a mais. E, mais importante, sem
   * gastar vermelho: lá dentro ele significa uma pessoa no chão.
   */
  tom?: "rouge" | "tinta";
  /** Corpo do texto em px. A bandeirinha acompanha. */
  size?: number;
  className?: string;
}

export function Letreiro({
  tom = "tinta",
  size = 13,
  className,
}: LetreiroProps) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 ${className ?? ""}`}
      role="img"
      aria-label="Flamme Rouge"
    >
      <Bandeirola
        size={Math.round(size * 1.25)}
        color={tom === "rouge" ? undefined : "currentColor"}
        semMastro
      />
      <span
        aria-hidden="true"
        className="font-[family-name:var(--font-wordmark)] uppercase leading-none"
        style={{ fontSize: size, letterSpacing: "0.3em" }}
      >
        <span style={{ fontWeight: 300 }}>Flamme </span>
        <span style={{ fontWeight: 700 }}>Rouge</span>
      </span>
    </span>
  );
}
