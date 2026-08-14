/**
 * O tema RESOLVIDO, no cliente, e quando ele muda.
 *
 * `@/lib/tema` guarda a PREFERÊNCIA — três estados, sendo um deles "acompanhe
 * o sistema". Isto aqui responde outra pergunta: neste instante, a tela está
 * clara ou escura? Quem precisa saber é quem pinta alguma coisa fora do CSS,
 * e hoje isso é só o mapa: o MapLibre não lê variável de tema, ele recebe uma
 * URL de tile e pronto.
 *
 * Duas fontes, nesta ordem:
 *   1. `data-theme` no `<html>` — a escolha explícita, que vence sempre.
 *   2. `prefers-color-scheme` — quando não há escolha explícita.
 *
 * E duas formas de mudar, as duas observadas:
 *   1. o botão de tema, que mexe no atributo → `MutationObserver`;
 *   2. o relógio do sistema operacional ao anoitecer → `matchMedia`.
 *
 * Sem a segunda, quem deixou em "sistema" veria o painel escurecer às 18h e o
 * mapa continuar claro até recarregar a página.
 */

"use client";

import { useEffect, useState } from "react";

export type TemaResolvido = "light" | "dark";

export function resolverTema(): TemaResolvido {
  if (typeof document === "undefined") return "dark";

  const explicito = document.documentElement.getAttribute("data-theme");
  if (explicito === "light" || explicito === "dark") return explicito;

  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function useTemaResolvido(): TemaResolvido {
  // Escuro no primeiro render, sempre: é o padrão do produto e é o que o
  // servidor pintou. Começar pelo valor real aqui causaria divergência de
  // hidratação, porque o servidor não conhece o sistema operacional de
  // ninguém.
  const [tema, setTema] = useState<TemaResolvido>("dark");

  useEffect(() => {
    const atualizar = () => setTema(resolverTema());
    atualizar();

    const observer = new MutationObserver(atualizar);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const consulta = window.matchMedia("(prefers-color-scheme: light)");
    consulta.addEventListener("change", atualizar);

    return () => {
      observer.disconnect();
      consulta.removeEventListener("change", atualizar);
    };
  }, []);

  return tema;
}
