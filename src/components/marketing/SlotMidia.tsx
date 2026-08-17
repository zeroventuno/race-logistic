/**
 * Espaço reservado de mídia.
 *
 * Enquanto `src` é `null`, o slot desenha a própria ficha técnica: proporção,
 * teto de peso, formatos e o que o quadro precisa provar. Serve para três
 * coisas ao mesmo tempo — o layout pode ser revisado sem os ativos, o
 * responsável pela produção lê a especificação no lugar exato onde ela vale, e
 * ninguém confunde "ainda não chegou" com "está quebrado".
 *
 * A caixa é reservada por `aspect-ratio` desde o primeiro quadro: quando a
 * imagem definitiva entrar, nada abaixo dela se move.
 */

import type { SlotImagem } from "@/components/marketing/midia";

interface Props {
  slot: SlotImagem;
  /** Rótulo curto mostrado no espaço reservado. */
  rotulo: string;
  className?: string;
  /** A primeira imagem visível não deve ser adiada. */
  prioridade?: boolean;
  /**
   * Taxa de parallax da imagem dentro da caixa, entre 0.10 e 0.28.
   *
   * O deslocamento vem de `Movimento`. Para ele ter para onde ir, a imagem
   * é desenhada 18% mais alta que a caixa, que fica com `overflow: hidden` —
   * é o mesmo truque de sempre, e é por isso que a taxa não pode subir muito:
   * acima de ~0.28 o excedente acaba e aparece uma faixa vazia na borda.
   */
  parallax?: number;
}

export function SlotImagemView({
  slot,
  rotulo,
  alt,
  className,
  prioridade,
  parallax,
}: Props & { alt: string }) {
  return (
    <div
      className={`fr-slot ${parallax ? "fr-slot--parallax " : ""}${className ?? ""}`}
      style={{ aspectRatio: slot.proporcao }}
    >
      {slot.src ? (
        // eslint-disable-next-line @next/next/no-img-element -- ativos estáticos
        // já exportados no corte certo; o pipeline de otimização do Next não
        // acrescenta nada e acrescentaria um salto de layout.
        <img
          className="fr-slot__img"
          data-parallax={parallax}
          src={slot.src}
          alt={alt}
          width={slot.larguraRef}
          height={Math.round(
            slot.larguraRef /
              (Number(slot.proporcao.split("/")[0]) /
                Number(slot.proporcao.split("/")[1])),
          )}
          loading={prioridade ? "eager" : "lazy"}
          decoding="async"
        />
      ) : (
        <div className="fr-slot__vazio">
          <span className="fr-slot__titulo">{rotulo}</span>
          <span className="fr-slot__ficha">
            {slot.proporcao.replace("/", ":")} · máx {slot.maxKB} KB ·{" "}
            {slot.formatos.join(" / ")} · {slot.larguraRef} px
            <br />
            <span aria-hidden="true">{slot.briefing}</span>
          </span>
        </div>
      )}
    </div>
  );
}
