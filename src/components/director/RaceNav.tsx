"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Navegação entre as etapas de preparação da prova.
 *
 * As etapas têm ordem (prova → percurso → posições → códigos) mas não são um
 * assistente travado: no dia anterior o diretor pula entre elas o tempo todo,
 * corrigindo um telefone aqui e trocando o traçado ali. O ponto ao lado do
 * rótulo diz o que já está resolvido sem obrigar ninguém a voltar para conferir.
 */
export function RaceNav({
  raceId,
  itens,
}: {
  raceId: string;
  itens: Array<{ path: string; label: string; done: boolean | null }>;
}) {
  const pathname = usePathname();
  const base = `/dashboard/${raceId}`;

  return (
    <nav
      aria-label="Etapas da prova"
      className="-mb-px flex gap-1 overflow-x-auto"
    >
      {itens.map((item) => {
        const href = item.path ? `${base}/${item.path}` : base;
        const ativo = item.path
          ? pathname.startsWith(href)
          : pathname === base;

        return (
          <Link
            key={item.path || "resumo"}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm transition ${
              ativo
                ? "border-info font-semibold text-ink"
                : "border-transparent text-ink-muted hover:border-border-strong hover:text-ink"
            }`}
          >
            {item.done === null ? null : (
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${
                  item.done ? "bg-ok" : "bg-warn"
                }`}
              />
            )}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
