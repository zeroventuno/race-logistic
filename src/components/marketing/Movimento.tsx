"use client";

/**
 * Todo o JavaScript de cliente da landing cabe aqui.
 *
 * Duas responsabilidades, nenhuma biblioteca:
 *
 *  1. REVELAÇÃO NA ROLAGEM. O atributo `data-fr-reveal` só é posto no `<html>`
 *     depois que o observer existe. É essa ordem que garante que uma falha de
 *     JS — bloqueado, erro de rede, navegador antigo — deixe a página inteira
 *     visível em vez de deixar metade do conteúdo preso em `opacity: 0`. O
 *     CSS não esconde nada até alguém provar que sabe mostrar de volta.
 *
 *  2. SINCRONIA DA MARCA COM O ARCO. Quando o herói tem vídeo, a marca assenta
 *     no segundo em que o arco do último quilômetro sai do quadro. O relógio é
 *     o `currentTime` do vídeo, não um `setTimeout` a partir do carregamento:
 *     autoplay costuma começar atrasado, e um cronômetro solto erraria o
 *     quadro exatamente na única transição que a página precisa acertar.
 *
 * Sem vídeo, este módulo não mexe na marca — a animação CSS resolve sozinha.
 */

import { useEffect } from "react";

import { SEGUNDO_DO_ARCO } from "@/components/marketing/midia";

/** Se o autoplay nunca começar, a marca entra assim mesmo. */
const ESPERA_MAXIMA_MS = 4000;

export function Movimento() {
  useEffect(() => {
    const menosMovimento = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const limpezas: (() => void)[] = [];

    // ---- 1. revelação ------------------------------------------------------
    if (!menosMovimento && "IntersectionObserver" in window) {
      const alvos = document.querySelectorAll<HTMLElement>("[data-reveal]");
      if (alvos.length > 0) {
        const observer = new IntersectionObserver(
          (entradas) => {
            for (const entrada of entradas) {
              if (!entrada.isIntersecting) continue;
              entrada.target.classList.add("fr-visivel");
              observer.unobserve(entrada.target);
            }
          },
          // Margem negativa embaixo: o elemento revela quando entra de
          // verdade, não quando encosta a borda. Positiva em cima para não
          // "piscar" quem já está na tela ao carregar.
          { rootMargin: "0px 0px -12% 0px", threshold: 0.01 },
        );

        document.documentElement.setAttribute("data-fr-reveal", "on");
        alvos.forEach((alvo) => observer.observe(alvo));

        // Rede de segurança. Se três segundos com a página à vista se passarem
        // e NADA tiver sido revelado, o observer não está entregando — e a
        // escolha entre "sem animação" e "sem conteúdo" não tem discussão.
        const rede = window.setTimeout(() => {
          const revelou = document.querySelector(".fr-landing .fr-visivel");
          if (!revelou && document.visibilityState === "visible") {
            document.documentElement.removeAttribute("data-fr-reveal");
          }
        }, 3000);

        limpezas.push(() => {
          window.clearTimeout(rede);
          observer.disconnect();
          document.documentElement.removeAttribute("data-fr-reveal");
        });
      }
    }

    // ---- 2. marca no quadro do arco ---------------------------------------
    const heroi = document.getElementById("fr-heroi");
    const video = heroi?.querySelector("video") ?? null;

    if (heroi && video) {
      if (menosMovimento) {
        heroi.setAttribute("data-marca", "entrou");
      } else {
        heroi.setAttribute("data-marca", "espera");

        let entrou = false;
        const assentar = () => {
          if (entrou) return;
          entrou = true;
          heroi.setAttribute("data-marca", "entrou");
          video.removeEventListener("timeupdate", aoAvancar);
        };
        const aoAvancar = () => {
          if (video.currentTime >= SEGUNDO_DO_ARCO) assentar();
        };

        video.addEventListener("timeupdate", aoAvancar);
        const rede = window.setTimeout(assentar, ESPERA_MAXIMA_MS);

        limpezas.push(() => {
          window.clearTimeout(rede);
          video.removeEventListener("timeupdate", aoAvancar);
        });
      }
    }

    return () => limpezas.forEach((f) => f());
  }, []);

  return null;
}
