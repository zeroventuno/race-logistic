"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BindScreen } from "@/components/driver/BindScreen";
import { OperationScreen } from "@/components/driver/OperationScreen";
import { I18nProvider } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/config";
import { DriverRuntime } from "@/lib/driver/runtime";
import { clearSession, loadSession, type StoredSession } from "@/lib/driver/storage";

/**
 * Casca do app do motorista.
 *
 * Duas responsabilidades, e nada além delas: decidir entre vincular e operar, e
 * manter UM ÚNICO motor vivo pelo tempo em que o app estiver aberto.
 *
 * A sessão é lida do `localStorage` num efeito, não no primeiro render, porque
 * o servidor não tem `localStorage` e a divergência quebraria a hidratação. O
 * preço é um instante neutro na tela — e é deliberadamente NEUTRO, não a tela de
 * vínculo: um motorista já vinculado que vê "digite o código" por meio segundo
 * assume que perdeu o vínculo e começa a digitar.
 *
 * O fuso usado nos horários é o da PROVA, que só é conhecido depois do vínculo.
 * Antes disso vale o do aparelho — na tela de vínculo não há horário nenhum.
 */

export interface DriverAppProps {
  locale: Locale;
}

export function DriverApp({ locale }: DriverAppProps) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [, forceRender] = useState(0);

  const runtimeRef = useRef<DriverRuntime | null>(null);

  useEffect(() => {
    setSession(loadSession());
    setHydrated(true);
  }, []);

  // O service worker garante que o app ABRE sem rede. Falha no registro (modo
  // privado, HTTP sem TLS numa rede local de teste) não pode impedir nada: a
  // fila offline vive no IndexedDB e não depende dele.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!session || runtimeRef.current) return;

    const runtime = new DriverRuntime(session);
    runtimeRef.current = runtime;
    runtime.start();
    forceRender((n) => n + 1);
  }, [session]);

  // Desmontagem do app: o motor precisa soltar o watch de GPS e a trava de
  // tela. Sem isto, navegar para fora e voltar deixaria dois watchers ativos.
  useEffect(() => {
    return () => {
      runtimeRef.current?.stop();
      runtimeRef.current = null;
    };
  }, []);

  const handleBound = useCallback(
    (next: StoredSession) => {
      const previous = session;
      setSession(next);

      if (runtimeRef.current && previous) {
        void runtimeRef.current.rebind(next, previous.position.id);
      }
    },
    [session],
  );

  const handleUnbind = useCallback(() => {
    runtimeRef.current?.stop();
    runtimeRef.current = null;
    clearSession();
    setSession(null);
  }, []);

  const timeZone =
    session?.race.timeZone ??
    (typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC");

  return (
    <I18nProvider locale={locale} timeZone={timeZone}>
      {!hydrated ? (
        <div className="flex min-h-dvh items-center justify-center bg-surface-0" />
      ) : !session || !runtimeRef.current ? (
        <BindScreen onBound={handleBound} />
      ) : (
        <OperationScreen
          runtime={runtimeRef.current}
          session={session}
          onUnbind={handleUnbind}
        />
      )}
    </I18nProvider>
  );
}
