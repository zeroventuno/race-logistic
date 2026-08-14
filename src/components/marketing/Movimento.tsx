"use client";

/**
 * Todo o JavaScript de cliente da landing cabe aqui.
 *
 * Nenhuma biblioteca, e uma regra que vale para tudo abaixo: NADA fica
 * escondido por padrão. Cada efeito só passa a esconder ou deslocar alguma
 * coisa depois que o próprio código provou que sabe desfazer o que fez. JS
 * bloqueado, erro de rede ou navegador antigo têm que resultar numa página
 * estática e inteira — nunca em metade do conteúdo preso em `opacity: 0`.
 *
 * Cinco responsabilidades:
 *
 *  1. REVELAÇÃO NA ROLAGEM. `data-fr-reveal` só é posto no `<html>` depois que
 *     o observer existe, e uma rede de segurança o remove se três segundos
 *     passarem sem nada ter sido revelado.
 *
 *  2. SINCRONIA DA MARCA COM O ARCO. Quando o herói tem vídeo, a marca assenta
 *     no segundo em que o arco do último quilômetro sai do quadro. O relógio é
 *     o `currentTime` do vídeo, não um `setTimeout` a partir do carregamento:
 *     autoplay costuma começar atrasado, e um cronômetro solto erraria o
 *     quadro exatamente na única transição que a página precisa acertar.
 *
 *  3. LEITURA DA ROLAGEM. Barra de progresso no topo, cabeçalho que assenta
 *     depois do herói, e a placa de quilometragem fixa no canto que diz em que
 *     trecho do road book o leitor está. Um `scroll` passivo, um
 *     `requestAnimationFrame`, uma única passada de leitura de layout.
 *
 *  4. PARALLAX. Só em imagem e fundo. Texto no máximo −0.06, porque acima
 *     disso a linha de base briga com a rolagem e cansa a leitura.
 *
 *  5. NÚMEROS QUE CONTAM E TRAÇO QUE DESENHA. O número medido sobe de zero
 *     UMA vez, quando entra na tela; a linha do desvio se desenha no mesmo
 *     gesto. É o único momento em que a página anima um dado — e ela anima
 *     justamente para dizer que ele foi medido, não escrito.
 *
 * Tudo isto é desligado por `prefers-reduced-motion`, com uma exceção
 * deliberada: o número aparece no valor final, não zerado. Respeitar a
 * preferência de movimento não pode virar esconder informação.
 */

import { useEffect } from "react";

import { SEGUNDO_DO_ARCO } from "@/components/marketing/midia";

/** Se o autoplay nunca começar, a marca entra assim mesmo. */
const ESPERA_MAXIMA_MS = 4000;

/** Duração da contagem de um número medido. */
const CONTAGEM_MS = 1100;

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

    // ---- 3. números que contam --------------------------------------------
    //
    // O valor final vive no `data-conta`; o texto do elemento é o valor final
    // JÁ ESCRITO no HTML do servidor. Quem não tem JS, tem observer negado ou
    // pediu menos movimento lê o número certo — a contagem só substitui um
    // número correto por outro número correto.
    const contadores = Array.from(
      document.querySelectorAll<HTMLElement>("[data-conta]"),
    );

    if (contadores.length > 0 && !menosMovimento && "IntersectionObserver" in window) {
      const contados = new WeakSet<Element>();
      const observer = new IntersectionObserver(
        (entradas) => {
          for (const entrada of entradas) {
            if (!entrada.isIntersecting) continue;
            const alvo = entrada.target as HTMLElement;
            if (contados.has(alvo)) continue;
            contados.add(alvo);
            contar(alvo);
            observer.unobserve(alvo);
          }
        },
        { threshold: 0.5 },
      );

      contadores.forEach((n) => observer.observe(n));
      limpezas.push(() => observer.disconnect());
    }

    // ---- 4. traço do diagrama ---------------------------------------------
    const tracos = Array.from(
      document.querySelectorAll<SVGPathElement>("[data-traco]"),
    );

    if (tracos.length > 0 && !menosMovimento && "IntersectionObserver" in window) {
      for (const traco of tracos) {
        const comprimento = traco.getTotalLength?.() ?? 0;
        if (!comprimento) continue;
        traco.style.strokeDasharray = String(comprimento);
        traco.style.strokeDashoffset = String(comprimento);
        traco.style.transition =
          "stroke-dashoffset 1.6s cubic-bezier(.22,.61,.36,1)";
      }

      const observer = new IntersectionObserver(
        (entradas) => {
          for (const entrada of entradas) {
            if (!entrada.isIntersecting) continue;
            (entrada.target as SVGPathElement).style.strokeDashoffset = "0";
            observer.unobserve(entrada.target);
          }
        },
        { threshold: 0.4 },
      );

      tracos.forEach((t) => observer.observe(t));
      limpezas.push(() => {
        observer.disconnect();
        // Desfaz o recorte: se o componente sair enquanto o traço está pela
        // metade, o que fica na tela é a linha inteira, não um toco.
        for (const traco of tracos) {
          traco.style.strokeDasharray = "";
          traco.style.strokeDashoffset = "";
          traco.style.transition = "";
        }
      });
    }

    // ---- 5. leitura da rolagem --------------------------------------------
    //
    // Um só ouvinte para progresso, cabeçalho, placa de km e parallax. Separar
    // em quatro daria quatro leituras de layout por quadro.
    const barra = document.querySelector<HTMLElement>("[data-progresso]");
    const topo = document.querySelector<HTMLElement>(".fr-topo");
    const placa = document.querySelector<HTMLElement>("[data-placa]");
    const placaTexto = document.querySelector<HTMLElement>("[data-placa-texto]");
    const capitulos = Array.from(
      document.querySelectorAll<HTMLElement>("[data-capitulo]"),
    );
    const camadas = menosMovimento
      ? []
      : Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));

    if (barra || topo || placa || camadas.length > 0) {
      let agendado = false;

      const medir = () => {
        agendado = false;
        const y = window.scrollY;
        const vh = window.innerHeight;
        const total = document.documentElement.scrollHeight - vh;

        if (barra) {
          const p = total > 0 ? Math.min(1, Math.max(0, y / total)) : 0;
          barra.style.transform = `scaleX(${p.toFixed(4)})`;
        }

        // O cabeçalho começa transparente sobre o herói escuro e assenta
        // depois dele. O limiar é a altura do herói, não um número mágico:
        // assentar cedo demais põe barra opaca em cima da foto.
        if (topo) {
          topo.dataset.assentado = y > 40 ? "sim" : "nao";
        }

        if (placa) {
          const visivel = y > vh * 0.6;
          placa.dataset.visivel = visivel ? "sim" : "nao";

          if (placaTexto && visivel) {
            let rotulo = capitulos[0]?.dataset.capitulo ?? "";
            for (const c of capitulos) {
              if (c.getBoundingClientRect().top <= vh * 0.42) {
                rotulo = c.dataset.capitulo ?? rotulo;
              }
            }
            if (rotulo && placaTexto.textContent !== rotulo) {
              placaTexto.textContent = rotulo;
            }
          }
        }

        for (const camada of camadas) {
          const taxa = Number.parseFloat(camada.dataset.parallax ?? "0");
          if (!Number.isFinite(taxa) || taxa === 0) continue;
          const r = camada.getBoundingClientRect();
          const deslocamento = (r.top + r.height / 2 - vh / 2) * -taxa;
          camada.style.transform = `translate3d(0,${deslocamento.toFixed(1)}px,0)`;
        }
      };

      const aoRolar = () => {
        if (agendado) return;
        agendado = true;
        requestAnimationFrame(medir);
      };

      window.addEventListener("scroll", aoRolar, { passive: true });
      window.addEventListener("resize", aoRolar);
      medir();

      limpezas.push(() => {
        window.removeEventListener("scroll", aoRolar);
        window.removeEventListener("resize", aoRolar);
        for (const camada of camadas) camada.style.transform = "";
      });
    }

    return () => limpezas.forEach((f) => f());
  }, []);

  return null;
}

/**
 * Sobe um número de zero até o valor medido.
 *
 * A vírgula é decimal e o separador vem do próprio HTML: o número já está
 * escrito na página no formato do idioma servido, e refazer a formatação aqui
 * significaria escolher uma localidade no cliente e discordar do servidor no
 * meio da animação. Então a contagem formata com `Intl` na localidade do
 * documento, e o valor final volta a ser exatamente o texto original.
 */
function contar(alvo: HTMLElement): void {
  const destino = Number.parseFloat(alvo.dataset.conta ?? "");
  if (!Number.isFinite(destino)) return;

  const casas = Number.parseInt(alvo.dataset.casas ?? "0", 10) || 0;
  const textoFinal = alvo.textContent ?? "";
  const idioma = document.documentElement.lang || undefined;
  const formatar = new Intl.NumberFormat(idioma, {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });

  const inicio = performance.now();

  const passo = (agora: number) => {
    const p = Math.min(1, (agora - inicio) / CONTAGEM_MS);
    // Desaceleração cúbica: o número chega e para, em vez de frear no fim.
    const suave = 1 - Math.pow(1 - p, 3);

    if (p < 1) {
      alvo.textContent = formatar.format(destino * suave);
      requestAnimationFrame(passo);
    } else {
      // Restaura o texto do servidor, não uma reformatação nossa.
      alvo.textContent = textoFinal;
    }
  };

  requestAnimationFrame(passo);
}
