import Link from "next/link";

/**
 * Os passos de montar uma prova.
 *
 * Existe porque a criação era uma tela solta: um formulário, um link pequeno
 * de voltar, e uma frase em prosa dizendo que "percurso e posições vêm nos
 * próximos passos". Dizer não é mostrar. Quem chega aqui pela primeira vez não
 * sabe se está no começo de três telas ou de dez, e essa dúvida é o que faz
 * alguém abandonar um cadastro que levaria um minuto.
 *
 * Três passos, e nenhum a mais: os que o painel EXIGE para a prova ir ao ar.
 * Códigos de vínculo saem sozinhos das posições e a folha de impressão é
 * consequência, não etapa — pô-los aqui alongaria a escada sem acrescentar
 * decisão.
 *
 * Os passos futuros NÃO são links. Antes de a prova existir não há para onde
 * navegar, e um passo clicável que não leva a lugar nenhum é pior que um passo
 * apagado.
 */

const PASSOS = [
  /* i18n: precisa de chave — os três passos e seus nomes. */
  { n: 1, nome: "Dados da prova" },
  { n: 2, nome: "Percurso" },
  { n: 3, nome: "Posições de apoio" },
] as const;

export function PassosDaProva({ atual }: { atual: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Passos para montar a prova">
      <Link
        href="/dashboard"
        className="inline-flex min-h-9 items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-ink-faint transition hover:text-ink"
      >
        <span aria-hidden>←</span>
        {/* i18n: precisa de chave — "Minhas provas" */}
        Minhas provas
      </Link>

      <ol className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2">
        {PASSOS.map((p, i) => {
          const feito = p.n < atual;
          const agora = p.n === atual;

          return (
            <li key={p.n} className="flex items-center gap-2">
              <span
                aria-current={agora ? "step" : undefined}
                className={`flex items-center gap-2 border px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] ${
                  agora
                    ? "border-ink bg-ink text-surface-0"
                    : feito
                      ? "border-border bg-surface-2 text-ink-muted"
                      : "border-border text-ink-faint"
                }`}
              >
                <span className="tnum">{feito ? "✓" : p.n}</span>
                {p.nome}
              </span>

              {i < PASSOS.length - 1 ? (
                <span aria-hidden className="text-ink-ghost">
                  →
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
