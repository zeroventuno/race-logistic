/**
 * Os créditos, no rodapé de toda tela.
 *
 * Em mono minúsculo e na cor mais apagada da paleta, de propósito: crédito de
 * autoria é informação permanente, e informação permanente compete com
 * informação que muda. Numa tela de operação, o que muda é o que importa.
 *
 * A tela Ao vivo é a exceção de posição, não de presença — lá não existe
 * rodapé, então o crédito entra na faixa de referência que já está no pé do
 * mapa, junto com a nota do relógio.
 */

const ANO_INICIAL = 2026;

export function Creditos({ className }: { className?: string }) {
  return (
    <p
      className={`font-mono text-[0.6rem] uppercase tracking-[0.18em] text-ink-ghost ${className ?? ""}`}
    >
      Flamme Rouge · uma ferramenta{" "}
      <span className="text-ink-faint">Ventuno</span> · {ANO_INICIAL}
    </p>
  );
}
