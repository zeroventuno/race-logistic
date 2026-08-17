/**
 * Os créditos, no rodapé de toda tela.
 *
 * Em mono minúsculo e na cor mais apagada da paleta, de propósito: crédito de
 * autoria é informação permanente, e informação permanente compete com
 * informação que muda. Numa tela de operação, o que muda é o que importa.
 *
 * A tela Ao vivo é a exceção de posição, não de presença — lá não existe
 * rodapé, então o crédito entra na faixa de referência que já está no pé do
 * mapa, junto com a nota do relógio.
 */

"use client";

import { useT } from "@/lib/i18n/client";

const ANO_INICIAL = 2026;

export function Creditos({ className }: { className?: string }) {
  const t = useT();

  return (
    <p
      className={`font-mono text-[0.6rem] uppercase tracking-[0.18em] text-ink-ghost ${className ?? ""}`}
    >
      {t("meta.appName")} · {t("landing.footer.credits")}{" "}
      <a
        href="https://zeroventuno.com"
        target="_blank"
        // `noreferrer` junto do `noopener`: sem ele a página de destino recebe
        // no cabeçalho a URL de onde o clique veio — que aqui pode ser o painel
        // de uma prova, com o id dela no endereço.
        rel="noopener noreferrer"
        className="text-ink-faint underline decoration-transparent underline-offset-4 transition hover:text-ink hover:decoration-current"
      >
        Ventuno
      </a>{" "}
      · {ANO_INICIAL}
    </p>
  );
}
