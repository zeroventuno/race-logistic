"use client";

import { useState, useTransition } from "react";

import { definirCota } from "./actions";

/**
 * O campo que solta ou tranca uma conta.
 *
 * SEM BOTÃO DE SALVAR. O valor é um número pequeno numa tabela de contas; um
 * botão por linha encheria a tela de "Salvar" e faria a ação mais comum —
 * subir de 1 para 2 — custar dois cliques e uma mira. Grava ao sair do campo,
 * e no Enter.
 *
 * O ESTADO VOLTA SOZINHO SE A GRAVAÇÃO FALHAR. Deixar o número novo na tela
 * depois de o servidor recusar mostraria uma cota que não existe, e o dono
 * decidiria em cima dela.
 */
export function CotaCampo({
  userId,
  cota,
  usadas,
}: {
  userId: string;
  cota: number;
  usadas: number;
}) {
  const [valor, setValor] = useState(String(cota));
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const gravar = () => {
    const n = Number(valor);

    if (!Number.isInteger(n) || n < 0) {
      setValor(String(cota));
      setErro(null);
      return;
    }
    if (n === cota) return;

    setErro(null);
    iniciar(async () => {
      const r = await definirCota(userId, n);
      if (r.erro) {
        setErro(r.erro);
        setValor(String(cota));
      }
    });
  };

  // Já usou tudo que tinha? A linha merece um sinal, porque é a única razão
  // pela qual alguém entra nesta tela: descobrir quem está esbarrando no teto.
  const noTeto = usadas >= cota;

  return (
    <div className="flex items-center gap-2">
      <span className="tnum text-sm text-ink-muted">{usadas} /</span>
      <input
        type="number"
        min={0}
        max={999}
        step={1}
        value={valor}
        disabled={pendente}
        onChange={(e) => setValor(e.target.value)}
        onBlur={gravar}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setValor(String(cota));
            e.currentTarget.blur();
          }
        }}
        aria-label="Cota de provas"
        className={`tnum h-9 w-16 border bg-surface-0 px-2 text-sm text-ink disabled:opacity-50 ${
          noTeto ? "border-warn" : "border-border"
        }`}
      />
      {pendente ? (
        <span className="text-xs text-ink-faint">…</span>
      ) : noTeto ? (
        <span className="text-xs text-warn">no teto</span>
      ) : null}
      {erro ? <span className="text-xs text-critical">{erro}</span> : null}
    </div>
  );
}
