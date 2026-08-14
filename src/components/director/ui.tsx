import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

/**
 * Peças visuais das telas de preparação da prova.
 *
 * Sem `"use client"`: são componentes sem estado, então servem tanto ao layout
 * renderizado no servidor quanto aos painéis interativos. Quem importa decide
 * em qual grafo o módulo entra.
 *
 * SOBRE COR. `globals.css` reserva vermelho para socorro, âmbar para "o sistema
 * não sabe" e verde para "confirmado". Estas telas acontecem na véspera, não
 * durante a prova, então elas usam:
 *   - verde  → item de preparação concluído (é literalmente "confirmado");
 *   - âmbar  → falta um dado que o sistema precisa ter, ou o arquivo tem algo
 *              suspeito (é literalmente "o sistema não sabe");
 *   - vermelho → nunca. Nada aqui é socorro, e gastar o vermelho num erro de
 *              formulário faria o diretor aprender a ignorá-lo justamente na
 *              tela onde ele significa acidente.
 */

type Tone = "neutral" | "ok" | "warn" | "info";

const TONE_BADGE: Record<Tone, string> = {
  neutral: "border-border bg-surface-2 text-ink-muted",
  ok: "border-ok/40 bg-ok/10 text-ok",
  warn: "border-warn/40 bg-warn/10 text-warn",
  info: "border-info/40 bg-info/10 text-info",
};

export function Selo({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] ${TONE_BADGE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "quiet";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-info text-surface-0 font-semibold hover:bg-info/85 disabled:bg-info/40",
  secondary:
    "border border-border-strong bg-surface-2 text-ink hover:border-info hover:bg-surface-3",
  ghost: "border border-border bg-transparent text-ink-muted hover:text-ink hover:border-border-strong",
  quiet: "bg-transparent text-ink-muted hover:text-ink underline underline-offset-4",
};

const SIZE = {
  md: "min-h-11 px-5 text-xs tracking-[0.14em]",
  lg: "min-h-14 px-7 text-sm tracking-[0.14em]",
  sm: "min-h-9 px-3.5 text-[0.6875rem] tracking-[0.16em]",
} as const;

/** Comum a botão e link-botão: mono, caixa alta, canto vivo. */
const BOTAO_BASE =
  "inline-flex items-center justify-center gap-2 font-mono uppercase transition";

export function Botao({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: keyof typeof SIZE;
}) {
  return (
    <button
      {...props}
      className={`${BOTAO_BASE} disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT[variant]} ${SIZE[size]} ${className}`}
    />
  );
}

export function BotaoLink({
  href,
  variant = "secondary",
  size = "md",
  className = "",
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: Variant;
  size?: keyof typeof SIZE;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      {...props}
      className={`${BOTAO_BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`}
    >
      {children}
    </Link>
  );
}

export function Cartao({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-border bg-surface-1 ${className}`}>
      {children}
    </section>
  );
}

/**
 * Bloco de aviso. `role="alert"` só no tom âmbar: leitor de tela interrompendo
 * a leitura para anunciar uma dica informativa é ruído, para um problema é
 * exatamente o comportamento desejado.
 */
export function Aviso({
  tone = "info",
  titulo,
  children,
  className = "",
}: {
  tone?: Tone;
  titulo?: string;
  children?: ReactNode;
  className?: string;
}) {
  const border =
    tone === "warn"
      ? "border-warn/45 bg-warn/8"
      : tone === "ok"
        ? "border-ok/45 bg-ok/8"
        : "border-border bg-surface-2";

  return (
    <div
      role={tone === "warn" ? "alert" : undefined}
      className={`border px-4 py-3 text-sm ${border} ${className}`}
    >
      {titulo ? (
        <p
          className={`font-semibold ${tone === "warn" ? "text-warn" : tone === "ok" ? "text-ok" : "text-ink"}`}
        >
          {titulo}
        </p>
      ) : null}
      {children ? (
        <div className={`text-ink-muted ${titulo ? "mt-1" : ""}`}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

const CAMPO_BASE =
  "w-full min-h-11 border bg-surface-0 px-3 py-2 text-ink placeholder:text-ink-faint focus:outline-none focus-visible:outline-2 focus-visible:outline-info";

export function Campo({
  label,
  htmlFor,
  hint,
  erro,
  obrigatorio,
  children,
  className = "",
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  erro?: string | null;
  obrigatorio?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="block font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-muted"
      >
        {label}
        {obrigatorio ? (
          <span className="ml-1 text-ink-faint" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      <div className="mt-1.5">{children}</div>
      {erro ? (
        <p className="mt-1.5 text-sm text-warn" role="alert">
          {erro}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

export function entradaClasse(erro?: string | null): string {
  return `${CAMPO_BASE} ${erro ? "border-warn" : "border-border"}`;
}

/** Título de seção com um contador opcional à direita. */
export function TituloSecao({
  children,
  acao,
}: {
  children: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-[family-name:var(--font-wordmark)] titulo text-2xl font-semibold text-ink">
        {children}
      </h2>
      {acao}
    </div>
  );
}
