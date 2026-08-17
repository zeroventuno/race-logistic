"use client";

import { useState, useTransition } from "react";

import { definirStatusDaProva } from "@/app/(director)/_actions/race";
import { Aviso, Botao } from "@/components/director/ui";
import { useT } from "@/lib/i18n/client";

/**
 * Marca a prova como pronta (`armed`) ou devolve para rascunho.
 *
 * Reversível de propósito e sem confirmação: numa véspera de prova o diretor
 * marca e desmarca isso várias vezes enquanto ajusta a equipe, e um diálogo de
 * confirmação em cada clique só ensinaria a clicar em "sim" sem ler.
 *
 * "Marcar como pronta" NÃO é `director.goLive`: pronta é o estado de véspera,
 * iniciar é o clique da largada.
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
  const t = useT();
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
              : t("director.resolveBlockingFirst")
          }
        >
          {pendente ? t("director.marking") : t("director.markReady")}
        </Botao>
      ) : (
        <Botao type="button" variant="ghost" onClick={executar} disabled={pendente}>
          {pendente ? t("director.reverting") : t("director.backToDraft")}
        </Botao>
      )}
    </div>
  );
}
