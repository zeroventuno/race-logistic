"use client";

import { useState, useTransition } from "react";

import { adicionarPosicoes } from "@/app/(director)/_actions/positions";
import { PosicaoLinha } from "@/components/director/PosicaoLinha";
import {
  Aviso,
  Botao,
  BotaoLink,
  Cartao,
  TituloSecao,
} from "@/components/director/ui";
import { VehicleIcon } from "@/components/icons/vehicle";
import { useT } from "@/lib/i18n/client";
import { ROLE_META, type PositionRole, type RacePosition } from "@/lib/types";

const PAPEIS = Object.keys(ROLE_META) as PositionRole[];

/**
 * Os papéis que entram em quase toda prova.
 *
 * Os três primeiros são a ORDEM DO COMBOIO e vêm juntos porque são os que toda
 * prova tem: abertura interdita a via, fechamento a devolve ao trânsito, e a
 * vassoura vem atrás recolhendo quem abandonou, com a rua já reaberta. Depois
 * vêm os que circulam sem posição fixa.
 *
 * A vassoura faltava aqui, e a falta era pior do que parece: ela é o único
 * papel que toda prova tem e que o diretor precisava caçar no seletor de baixo.
 */
const ATALHOS: PositionRole[] = [
  "lead_car",
  "sweep_car",
  "broom_wagon",
  "moto",
  "ambulance",
  "support_car",
];

export function PosicoesPainel({
  raceId,
  posicoes,
  podeEditar,
}: {
  raceId: string;
  posicoes: RacePosition[];
  podeEditar: boolean;
}) {
  const t = useT();
  const [papel, setPapel] = useState<PositionRole>("moto");
  const [quantidade, setQuantidade] = useState(1);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const adicionar = (role: PositionRole, qtd: number) => {
    setErro(null);
    iniciar(async () => {
      const r = await adicionarPosicoes(raceId, role, qtd);
      if (r.erro) setErro(r.erro);
    });
  };

  const temAbertura = posicoes.some((p) => p.is_reference_lead);
  const temFechamento = posicoes.some((p) => p.is_reference_sweep);

  return (
    <div className="space-y-6">
      {podeEditar ? (
        <Cartao className="p-5">
          <TituloSecao>{t("positions.add")}</TituloSecao>

          {/* Atalhos primeiro: 90% dos cadastros são "mais uma moto". */}
          {/* GRADE, não fila que quebra.
              Com seis atalhos, deixar o navegador embrulhar produz uma segunda
              linha com um ou dois botões soltos — que é o que dá a impressão de
              layout quebrado. Numa grade eles dividem a largura por igual e a
              linha fecha sempre: seis colunas na tela larga, três no tablet,
              duas no celular. O botão fica mais largo que o texto, e tudo bem:
              alvo maior num painel é vantagem. */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {ATALHOS.map((role) => (
              <Botao
                key={role}
                type="button"
                variant="secondary"
                size="sm"
                className="min-w-0"
                onClick={() => adicionar(role, 1)}
                disabled={pendente}
              >
                <span aria-hidden style={{ color: ROLE_META[role].color }}>
                  <VehicleIcon role={role} size={16} />
                </span>
                +1 {t(`roles.${role}.short`)}
              </Botao>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-border pt-5">
            <div>
              <label
                htmlFor="papel-lote"
                className="block font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-muted"
              >
                {t("positions.role")}
              </label>
              <select
                id="papel-lote"
                value={papel}
                onChange={(e) => setPapel(e.target.value as PositionRole)}
                className="mt-1.5 min-h-11 border border-border bg-surface-0 px-3 text-ink"
              >
                {PAPEIS.map((p) => (
                  // `<option>` só aceita texto: um SVG dentro dele é ignorado
                  // pelo navegador. O rótulo sozinho basta, porque a lista já
                  // está aberta e o contexto é o próprio seletor de papel.
                  <option key={p} value={p}>
                    {t(`roles.${p}.label`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="qtd-lote"
                className="block font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-muted"
              >
                {t("positions.quantity")}
              </label>
              <input
                id="qtd-lote"
                type="number"
                min={1}
                max={40}
                step={1}
                value={quantidade}
                onChange={(e) =>
                  setQuantidade(
                    Math.max(1, Math.min(40, Number(e.target.value) || 1)),
                  )
                }
                className="tnum mt-1.5 min-h-11 w-24 border border-border bg-surface-0 px-3 text-ink"
              />
            </div>

            <Botao
              type="button"
              variant="primary"
              onClick={() => adicionar(papel, quantidade)}
              disabled={pendente}
            >
              {pendente
                ? t("common.loading")
                : `${t("common.add")} ${quantidade} × ${t(`roles.${papel}.short`)}`}
            </Botao>
          </div>

          <p className="mt-3 text-xs text-ink-faint">
            {t("positions.addHint")}
          </p>

          {erro ? (
            <Aviso tone="warn" className="mt-4">
              {erro}
            </Aviso>
          ) : null}
        </Cartao>
      ) : null}

      {posicoes.length === 0 ? (
        <Cartao className="p-6">
          <h2 className="titulo font-semibold text-ink text-xl">
            {t("positions.emptyTitle")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            {t("positions.emptyBody")}
          </p>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            {t("positions.emptyStart")}
          </p>
        </Cartao>
      ) : (
        <div className="space-y-4">
          {!temAbertura || !temFechamento ? (
            <Aviso tone="warn" titulo={t("positions.missingRefsTitle")}>
              {!temAbertura
                ? t("director.needsLead")
                : t("director.needsSweep")}
              . {t("positions.missingRefsBody")}
            </Aviso>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-muted">
              <span className="tnum font-semibold text-ink">
                {posicoes.length}
              </span>{" "}
              {t("race.positions").toLowerCase()} · {t("positions.orderHint")}
            </p>
            <BotaoLink
              href={`/dashboard/${raceId}/posicoes/codigos`}
              variant="secondary"
            >
              {t("positions.print")}
            </BotaoLink>
          </div>

          <ul className="space-y-3">
            {posicoes.map((p, i) => (
              <PosicaoLinha
                key={p.id}
                raceId={raceId}
                posicao={p}
                primeira={i === 0}
                ultima={i === posicoes.length - 1}
                podeEditar={podeEditar}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
