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

/** Os papéis que entram em quase toda prova, na ordem em que se pensa neles. */
const ATALHOS: PositionRole[] = [
  "lead_car",
  "sweep_car",
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
          <div className="mt-4 flex flex-wrap gap-2">
            {ATALHOS.map((role) => (
              <Botao
                key={role}
                type="button"
                variant="secondary"
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
                className="block text-sm font-medium text-ink-muted"
              >
                {/* i18n: precisa de chave — rótulo "Papel" */}
                Papel
              </label>
              <select
                id="papel-lote"
                value={papel}
                onChange={(e) => setPapel(e.target.value as PositionRole)}
                className="mt-1.5 min-h-11 rounded-lg border border-border bg-surface-0 px-3 text-ink"
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
                className="block text-sm font-medium text-ink-muted"
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
                className="tnum mt-1.5 min-h-11 w-24 rounded-lg border border-border bg-surface-0 px-3 text-ink"
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
            {/* i18n: precisa de chave — explicação do código automático e da
                referência marcada sozinha */}
            Cada posição nasce com um código de vínculo único e um nome que você
            pode trocar depois. O primeiro carro de abertura e a primeira
            vassoura já entram marcados como referência.
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
          {/* i18n: precisa de chave — estado vazio de posições (título e os dois
              parágrafos que explicam o que é uma posição) */}
          <h2 className="text-lg font-semibold text-ink">
            Nenhuma posição cadastrada
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Uma posição é um papel na prova (&ldquo;Moto 3&rdquo;,
            &ldquo;Ambulância 1&rdquo;), não um aparelho. O celular é vinculado
            depois, pelo código — e pode ser trocado no meio da prova se a
            bateria morrer, sem perder o histórico.
          </p>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Comece pelo carro de abertura e pela vassoura: são eles que definem
            a janela que a direção acompanha.
          </p>
        </Cartao>
      ) : (
        <div className="space-y-4">
          {!temAbertura || !temFechamento ? (
            /* i18n: precisa de chave — aviso de referências faltando */
            <Aviso tone="warn" titulo="Faltam referências da janela">
              {!temAbertura
                ? t("director.needsLead")
                : t("director.needsSweep")}
              . Sem as duas, o painel não consegue calcular o tempo entre a
              frente e o fim do pelotão.
            </Aviso>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-muted">
              {/* i18n: precisa de chave — "a ordem da lista é a ordem do painel
                  ao vivo" */}
              <span className="tnum font-semibold text-ink">
                {posicoes.length}
              </span>{" "}
              {t("race.positions").toLowerCase()} · a ordem da lista é a ordem
              em que elas aparecem no painel ao vivo.
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
