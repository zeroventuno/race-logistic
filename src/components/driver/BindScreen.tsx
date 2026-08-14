"use client";

import { useEffect, useRef, useState } from "react";

import { formatBindCode } from "@/lib/codes/bind-code";
import { useFormat, useT } from "@/lib/i18n/client";
import type { DriverErrorCode } from "@/lib/driver/protocol";
import { saveRoute, saveSession, type StoredSession } from "@/lib/driver/storage";
import { bindDevice } from "@/lib/driver/transport";
import type { TranslationKey } from "@/lib/i18n/translate";

/**
 * Tela de vínculo.
 *
 * A cena real: o motorista está no carro, muitas vezes já com o motor ligado,
 * lendo seis caracteres de um papel impresso ou de uma mensagem no grupo. Ele
 * tem uma mão livre. Cada decisão desta tela sai daí.
 *
 *  - CAMPO ÚNICO E ENORME, com o código formatado enquanto digita. O hífen
 *    aparece sozinho porque é assim que o código está escrito no papel.
 *
 *  - NORMALIZAÇÃO VISÍVEL. Quem digita "O" vê "0" aparecer. O alfabeto do
 *    código não tem O nem I; corrigir em silêncio no servidor deixaria o
 *    motorista olhando para uma tela que discorda do que ele vai enviar.
 *
 *  - COLAR FUNCIONA. O código chega por WhatsApp na maioria das vezes, e o
 *    gesto natural é colar — inclusive com espaços e hífen no meio.
 *
 *  - A MENSAGEM DE ERRO VEM DO CÓDIGO, NÃO DO TEXTO DO SERVIDOR. O servidor
 *    responde em português; o motorista pode ser alemão. O `DriverErrorCode` é
 *    o contrato estável, e é ele que vira texto traduzido aqui.
 */

/** Mesmo alfabeto Crockford Base32 de `bind-code.ts`, para filtrar a digitação. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Cada motivo de recusa vira uma chave de tradução. */
const ERROR_KEYS: Partial<Record<DriverErrorCode, TranslationKey>> = {
  invalid_code: "driver.bindNotFound",
  rate_limited: "driver.bindTooManyAttempts",
};

export interface BindScreenProps {
  onBound: (session: StoredSession) => void;
  /** Preenchido quando o vínculo anterior foi derrubado pela direção. */
  revokedMessage?: string | null;
}

export function BindScreen({ onBound, revokedMessage }: BindScreenProps) {
  const t = useT();
  const fmt = useFormat();

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (retryAfter == null || retryAfter <= 0) return;
    const timer = setInterval(() => {
      setRetryAfter((s) => (s == null || s <= 1 ? null : s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [retryAfter]);

  const normalized = normalizeTyping(code);
  const complete = normalized.length === 6;
  const blocked = retryAfter != null && retryAfter > 0;

  async function submit() {
    if (!complete || busy || blocked) return;

    setBusy(true);
    setError(null);

    const result = await bindDevice(normalized, describeDevice());

    if (!result.ok) {
      setBusy(false);

      if (result.kind === "network") {
        setError(t("common.offline"));
        return;
      }

      if (result.code === "rate_limited" && result.retryAfterSeconds) {
        setRetryAfter(result.retryAfterSeconds);
      }

      const key = ERROR_KEYS[result.code];
      // Sem chave para este código (prova encerrada, falha de servidor), o
      // texto do servidor é melhor que nada — e vem marcado no relatório.
      setError(key ? t(key) : result.message);
      return;
    }

    const session: StoredSession = {
      token: result.value.token,
      position: result.value.position,
      race: result.value.race,
      boundAtMs: Date.now(),
    };

    // Percurso e sessão gravados ANTES de trocar de tela: se o app for morto
    // no instante seguinte, o motorista volta vinculado e com o mapa.
    saveSession(session);
    await saveRoute(result.value.route);

    setBusy(false);
    onBound(session);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-5 py-10">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
          {t("meta.appName")}
        </p>
        <h1 className="titulo mt-2 font-semibold text-ink text-3xl">{t("driver.bindTitle")}</h1>
        <p className="mt-2 text-sm text-ink-muted">{t("driver.bindSubtitle")}</p>
      </header>

      {revokedMessage ? (
        <p
          role="status"
          className="border border-warn/40 bg-warn-dim/30 px-4 py-3 text-sm text-ink"
        >
          {t("driver.revoked")}
        </p>
      ) : null}

      <div>
        <label
          htmlFor="bind-code"
          className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-muted"
        >
          {t("positions.code")}
        </label>

        <input
          id="bind-code"
          ref={inputRef}
          value={formatWhileTyping(normalized)}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="go"
          maxLength={9}
          placeholder={t("driver.bindPlaceholder")}
          aria-describedby="bind-help"
          className="touch-target mt-2 w-full border-2 border-border-strong bg-surface-1 px-4 py-5 text-center font-mono text-4xl tracking-[0.25em] text-ink outline-none placeholder:text-ink-faint focus:border-info"
        />

        {/* i18n: precisa de chave — dica sobre colar e sobre O/I virarem 0/1 */}
        <p id="bind-help" className="mt-2 text-xs text-ink-faint">
          Pode colar. As letras O e I são lidas como 0 e 1 — o código não usa
          essas letras.
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="border border-critical/50 bg-critical-dim/30 px-4 py-3 text-sm text-ink"
        >
          {error}
          {blocked ? (
            <span className="tnum mt-1 block text-ink-muted">
              {fmt.duration(retryAfter)}
            </span>
          ) : null}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={!complete || busy || blocked}
        className="font-mono uppercase tracking-[0.12em] touch-target w-full bg-info px-6 py-4 text-lg font-semibold text-surface-0 transition disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-ink-faint"
      >
        {busy ? t("common.loading") : t("driver.bindAction")}
      </button>

      {/* i18n: precisa de chave — instrução de manter a tela aberta */}
      <p className="text-center text-xs text-ink-faint">
        Mantenha esta tela aberta durante a prova. A posição é enviada
        automaticamente, mesmo com sinal ruim.
      </p>
    </main>
  );
}

/** Aplica o alfabeto e os apelidos de digitação, sem truncar antes da hora. */
function normalizeTyping(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .split("")
    .filter((ch) => ALPHABET.includes(ch))
    .slice(0, 6)
    .join("");
}

function formatWhileTyping(normalized: string): string {
  if (normalized.length <= 3) return normalized;
  return formatBindCode(normalized.padEnd(6, " ")).trimEnd();
}

/**
 * Rótulo do aparelho, para a direção conseguir dizer "o celular vinculado ao
 * carro 3 é um iPhone" quando o motorista jura que está transmitindo.
 */
function describeDevice(): string {
  if (typeof navigator === "undefined") return "desconhecido";

  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) {
    const model = /;\s([^;)]+)\sBuild\//.exec(ua)?.[1];
    return model ? `Android · ${model}` : "Android";
  }
  return "Navegador";
}
