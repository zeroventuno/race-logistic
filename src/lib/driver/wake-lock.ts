"use client";

/**
 * Trava de tela.
 *
 * Sem isto o celular apaga a tela em 30 s, o navegador suspende os timers e a
 * captura de GPS vira uma amostra esparsa — o veículo "some" do mapa da direção
 * sem que ninguém tenha feito nada errado. Prender o celular no suporte com a
 * tela ligada é como esses apps são usados na prática.
 *
 * A trava é perdida sempre que a aba deixa de ser visível (é o navegador que
 * decide, não nós), então ela precisa ser reconquistada quando a aba volta.
 * Esquecer isso é o bug clássico: funciona no teste de 2 minutos e falha quando
 * o motorista atende uma ligação.
 */

export interface WakeLockController {
  release: () => void;
}

export function keepScreenAwake(onChange: (active: boolean) => void): WakeLockController {
  let sentinel: WakeLockSentinel | null = null;
  let released = false;

  const request = async () => {
    if (released) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      onChange(false);
      return;
    }

    try {
      sentinel = await navigator.wakeLock.request("screen");
      onChange(true);
      sentinel.addEventListener("release", () => {
        onChange(false);
        sentinel = null;
      });
    } catch {
      // iOS < 16.4, aba em segundo plano, bateria em modo de economia. Não é
      // erro recuperável e não é fatal: a UI mostra que a trava está inativa
      // para o motorista saber que precisa aumentar o tempo de tela nos
      // ajustes do aparelho.
      onChange(false);
    }
  };

  const onVisibility = () => {
    if (document.visibilityState === "visible") void request();
  };

  void request();
  document.addEventListener("visibilitychange", onVisibility);

  return {
    release: () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release().catch(() => undefined);
      sentinel = null;
      onChange(false);
    },
  };
}
