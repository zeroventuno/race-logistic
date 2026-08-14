"use client";

import { Botao } from "@/components/director/ui";

export function BotaoImprimir({ rotulo = "Imprimir" }: { rotulo?: string }) {
  return (
    <Botao
      type="button"
      variant="primary"
      size="lg"
      onClick={() => window.print()}
    >
      🖨 {rotulo}
    </Botao>
  );
}
