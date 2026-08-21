"use client";

import { useEffect, useRef, useState } from "react";

import { useT } from "@/lib/i18n/client";

/**
 * Abre a captura em tamanho grande, sobre um fundo embaçado.
 *
 * POR QUE ISTO PRECISA EXISTIR. As duas capturas entram na página a 0,437 e
 * 0,328 da escala original. O número grande da janela sobrevive; tudo que
 * torna a imagem uma PROVA — a lista de veículos, o quadro âmbar dizendo
 * "acelere o carro de fechamento", os rótulos dos botões de alerta — vira
 * textura ilegível. E a largura da coluna não cresce com o monitor: quem tem
 * uma tela de 27 polegadas continua olhando os mesmos ~700 px. O público desta
 * página é diretor de prova, não desenvolvedor de 25 anos.
 *
 * `<dialog>` NATIVO, e não uma div com z-index. O `showModal()` entrega de
 * graça, e correto, aquilo que uma sobreposição caseira quase sempre erra:
 * prender o foco dentro do diálogo, fechar no Esc, tornar o resto da página
 * inerte para leitor de tela, devolver o foco ao botão que abriu, e empilhar
 * na top layer sem disputar z-index com o mapa.
 *
 * O TAMANHO É "CABE NA TELA", e não 1:1 com barra de rolagem. Num monitor
 * grande — que é o caso de quem reclamou — 95vw passa dos 1600 px do arquivo,
 * então a imagem aparece no tamanho natural e o detalhe está todo lá. Em telas
 * menores ela encolhe para caber, o que ainda é o dobro do que era, e ninguém
 * precisa arrastar a imagem para ler.
 */
export function Lupa({
  src,
  alt,
  largura,
  altura,
  children,
}: {
  src: string;
  alt: string;
  largura: number;
  altura: number;
  children: React.ReactNode;
}) {
  const t = useT();
  const dialogo = useRef<HTMLDialogElement>(null);

  /**
   * A imagem grande só entra no DOM depois do primeiro clique.
   *
   * É o MESMO arquivo do quadro pequeno, então o navegador o serve do cache e
   * a abertura é instantânea — mas montá-la de saída faria o `<dialog>`
   * carregar em toda visita uma imagem que a maioria nunca abre.
   */
  const [jaAbriu, setJaAbriu] = useState(false);

  const abrir = () => {
    setJaAbriu(true);
    dialogo.current?.showModal();
  };

  // O Esc do navegador dispara `cancel`, não `close`, e sem isto o estado do
  // React não saberia que o diálogo fechou.
  useEffect(() => {
    const el = dialogo.current;
    if (!el) return;
    const aoFechar = () => el.close();
    el.addEventListener("cancel", aoFechar);
    return () => el.removeEventListener("cancel", aoFechar);
  }, []);

  return (
    <>
      {children}

      {/*
        O botão cobre o quadro inteiro em vez de ser um ícone no canto: numa
        imagem que a pessoa já está tentando enxergar, o alvo natural é a
        própria imagem. O ícone de lupa aparece no hover como pista visual, e
        o `aria-label` carrega a instrução para quem não vê o ícone.
      */}
      <button
        type="button"
        onClick={abrir}
        aria-label={t("landing.screens.zoom")}
        className="fr-lupa__gatilho"
      >
        <span className="fr-lupa__pista" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5M11 8v6M8 11h6" />
          </svg>
          {t("landing.screens.zoom")}
        </span>
      </button>

      <dialog
        ref={dialogo}
        className="fr-lupa__dialogo"
        // Clicar fora fecha. O alvo do clique é o próprio `<dialog>` só quando
        // ele cai no ::backdrop — a imagem e a barra são filhos e não passam
        // por aqui, então isto não fecha ao clicar na foto.
        onClick={(e) => {
          if (e.target === dialogo.current) dialogo.current?.close();
        }}
      >
        {jaAbriu ? (
          <>
            <img
              className="fr-lupa__img"
              src={src}
              alt={alt}
              width={largura}
              height={altura}
              style={{ maxWidth: `min(95vw, ${largura}px)` }}
            />
            <form method="dialog" className="fr-lupa__barra">
              <button type="submit" className="fr-lupa__fechar">
                {t("common.close")}
              </button>
            </form>
          </>
        ) : null}
      </dialog>
    </>
  );
}
