"use client";

import { IconDeviceDesktop, IconMoon, IconSun } from "@tabler/icons-react";
import { useEffect, useState } from "react";

/**
 * Alternador de tema.
 *
 * Três estados, não dois. "Sistema" é o padrão e precisa continuar existindo:
 * um diretor que trabalha de dia montando a prova e opera à noite no trailer
 * quer que a tela acompanhe, sem ter de lembrar de trocar duas vezes por dia.
 * Um botão de dois estados obriga a escolher um dos dois contextos para sempre.
 *
 * A escolha vai num cookie, não em `localStorage`, porque o servidor precisa
 * dela para pintar o `<html>` já no primeiro byte. Com `localStorage` o tema
 * só chega depois da hidratação, e a tela pisca branco antes de escurecer —
 * num painel operacional, um flash branco numa sala escura é agressivo.
 */

export type Tema = "system" | "light" | "dark";

const COOKIE = "race_theme";

const ORDEM: Tema[] = ["system", "light", "dark"];

const META: Record<Tema, { rotulo: string; Icone: typeof IconSun }> = {
  system: { rotulo: "Tema do sistema", Icone: IconDeviceDesktop },
  light: { rotulo: "Tema claro", Icone: IconSun },
  dark: { rotulo: "Tema escuro", Icone: IconMoon },
};

export function TemaBotao({ inicial = "system" }: { inicial?: Tema }) {
  const [tema, setTema] = useState<Tema>(inicial);
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  function aplicar(proximo: Tema) {
    setTema(proximo);

    const raiz = document.documentElement;
    if (proximo === "system") {
      raiz.removeAttribute("data-theme");
    } else {
      raiz.setAttribute("data-theme", proximo);
    }

    document.cookie = `${COOKIE}=${proximo}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }

  const { rotulo, Icone } = META[tema];
  const proximo = ORDEM[(ORDEM.indexOf(tema) + 1) % ORDEM.length]!;

  return (
    <button
      type="button"
      onClick={() => aplicar(proximo)}
      // Antes de montar, o rótulo descreveria um estado que pode não ser o
      // real (o servidor não sabe a preferência do sistema operacional).
      title={montado ? `${rotulo} — trocar para ${META[proximo].rotulo.toLowerCase()}` : rotulo}
      aria-label={rotulo}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-ink-muted transition hover:border-border-strong hover:text-ink"
    >
      <Icone size={17} stroke={1.8} aria-hidden="true" />
    </button>
  );
}

/**
 * Lê a preferência gravada. Usado no layout do servidor para estampar o
 * atributo antes do primeiro byte chegar ao navegador.
 */
export function temaDoCookie(valor: string | undefined): Tema {
  return valor === "light" || valor === "dark" ? valor : "system";
}
