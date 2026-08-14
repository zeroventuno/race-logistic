"use client";

import { useState, useTransition } from "react";

import { definirStatusDaProva } from "@/app/(director)/_actions/race";
import { Aviso, Botao } from "@/components/director/ui";

/**
 * Marca a prova como pronta (`armed`) ou devolve para rascunho.
 *
 * Reversível de propósito e sem confirmação: numa véspera de prova o diretor
 * marca e desmarca isso várias vezes enquanto ajusta a equipe, e um diálogo de
 * confirmação em cada clique só ensinaria a clicar em "sim" sem ler.
 *
 * i18n: precisa de chaves — "Marcar prova como pronta", "Voltar para rascunho"
 * e o aviso de pendências. `director.goLive` é outra coisa (iniciar a prova).
 */
export function StatusProvaBotao({
  raceId,
  status,
  pronta,
}: {
  raceId: string;
  status: string;
  pronta: boolean;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const alvo = status === "armed" ? "draft" : "armed";

  const executar = () => {
    setErro(null);
    iniciar(async () => {
      const r = await definirStatusDaProva(raceId, alvo);
      if (r.erro) setErro(r.erro);
    });
  };

  if (status !== "draft" && status !== "armed") {
    return null;
  }

  return (
    <div className="space-y-3">
      {erro ? <Aviso tone="warn">{erro}</Aviso> : null}

      {alvo === "armed" ? (
        <Botao
          type="button"
          variant="primary"
          size="lg"
          onClick={executar}
          disabled={pendente || !pronta}
          title={
            pronta
              ? undefined
              : "Resolva as pendências obrigatórias primeiro."
          }
        >
          {pendente ? "Marcando…" : "Marcar prova como pronta"}
        </Botao>
      ) : (
        <Botao type="button" variant="ghost" onClick={executar} disabled={pendente}>
          {pendente ? "Voltando…" : "Voltar para rascunho"}
        </Botao>
      )}
    </div>
  );
}
