"use client";

import { useState, useTransition } from "react";

import {
  atualizarPosicao,
  definirReferencia,
  moverPosicao,
  regerarCodigo,
  removerPosicao,
} from "@/app/(director)/_actions/positions";
import { Aviso, Botao, Campo, Selo, entradaClasse } from "@/components/director/ui";
import { formatBindCode } from "@/lib/codes/bind-code";
import { VehicleIcon } from "@/components/icons/vehicle";
import { useT } from "@/lib/i18n/client";
import { ROLE_META, type PositionRole, type RacePosition } from "@/lib/types";

const PAPEIS = Object.keys(ROLE_META) as PositionRole[];

/**
 * Uma linha da lista de posições.
 *
 * Tudo que o diretor faz com pressa — subir, descer, marcar abertura, gerar
 * outro código — é um clique direto na linha, sem abrir nada. A edição dos
 * dados cadastrais (motorista, telefone, placa) é que expande no lugar, porque
 * é a única coisa aqui que se faz sentado, na véspera.
 *
 * Nenhum modal: numa tela de operação, empilhar diálogo sobre diálogo é como
 * esconder a lista atrás da tarefa. A remoção pede confirmação trocando o
 * próprio botão por um par "confirmar / cancelar" na mesma linha.
 */
export function PosicaoLinha({
  raceId,
  posicao,
  primeira,
  ultima,
  podeEditar,
}: {
  raceId: string;
  posicao: RacePosition;
  primeira: boolean;
  ultima: boolean;
  podeEditar: boolean;
}) {
  const t = useT();
  const [editando, setEditando] = useState(false);
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [pendente, iniciar] = useTransition();

  const meta = ROLE_META[posicao.role];
  const revogado = posicao.bind_code_revoked_at !== null;
  // O banco não devolve `bind_code` para quem não pode editar a prova (o grant
  // é por coluna). Código vazio sem revogação é falta de acesso, não falta de
  // código — dizer "gere outro" a um observador seria mentira.
  const semAcesso = !revogado && posicao.bind_code === "";
  const expirado =
    !revogado &&
    posicao.bind_code_expires_at !== null &&
    new Date(posicao.bind_code_expires_at).getTime() < Date.now();

  const executar = (fn: () => Promise<{ erro?: string }>) => {
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if (r.erro) setErro(r.erro);
    });
  };

  const salvar = (formData: FormData) => {
    setErro(null);
    iniciar(async () => {
      const r = await atualizarPosicao(raceId, posicao.id, {
        label: String(formData.get("label") ?? ""),
        role: String(formData.get("role") ?? posicao.role),
        driverName: String(formData.get("driverName") ?? ""),
        driverPhone: String(formData.get("driverPhone") ?? ""),
        vehiclePlate: String(formData.get("vehiclePlate") ?? ""),
        isDispatchable: formData.get("isDispatchable") === "on",
      });
      if (r.erro) setErro(r.erro);
      else setEditando(false);
    });
  };

  const copiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(formatBindCode(posicao.bind_code));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Sem permissão de área de transferência o código continua visível na
      // tela e no painel de impressão — não vale interromper ninguém por isso.
    }
  };

  return (
    <li className="border border-border bg-surface-1">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3 p-4">
        {podeEditar ? (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              aria-label={t("positions.moveUp", { position: posicao.label })}
              disabled={primeira || pendente}
              onClick={() =>
                executar(() => moverPosicao(raceId, posicao.id, "cima"))
              }
              className="flex h-7 w-8 items-center justify-center rounded border border-border text-ink-muted transition hover:border-border-strong hover:text-ink disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={t("positions.moveDown", { position: posicao.label })}
              disabled={ultima || pendente}
              onClick={() =>
                executar(() => moverPosicao(raceId, posicao.id, "baixo"))
              }
              className="flex h-7 w-8 items-center justify-center rounded border border-border text-ink-muted transition hover:border-border-strong hover:text-ink disabled:opacity-30"
            >
              ↓
            </button>
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span aria-hidden style={{ color: meta.color }}>
              <VehicleIcon role={posicao.role} size={19} />
            </span>
            <span className="font-semibold text-ink">{posicao.label}</span>
            <span className="text-xs text-ink-faint">
              {t(`roles.${posicao.role}.label`)}
            </span>
            {posicao.is_reference_lead ? (
              <Selo tone="ok">{t("roles.lead_car.short")}</Selo>
            ) : null}
            {posicao.is_reference_sweep ? (
              <Selo tone="ok">{t("roles.sweep_car.short")}</Selo>
            ) : null}
          </div>

          <p className="mt-1 text-sm text-ink-muted">
            {posicao.driver_name || t("positions.noDriver")}
            {posicao.driver_phone ? (
              <>
                {" · "}
                <a
                  href={`tel:${posicao.driver_phone}`}
                  className="tnum underline underline-offset-4 hover:text-ink"
                >
                  {posicao.driver_phone}
                </a>
              </>
            ) : null}
            {posicao.vehicle_plate ? ` · ${posicao.vehicle_plate}` : ""}
          </p>
        </div>

        <div className="flex flex-col items-start gap-1">
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-faint">
            {t("positions.code")}
          </span>
          {revogado ? (
            <span className="text-sm text-warn">{t("positions.codeRevoked")}</span>
          ) : semAcesso ? (
            <span
              className="text-sm text-ink-faint"
              title={t("positions.codeHidden")}
            >
              —
            </span>
          ) : (
            <button
              type="button"
              onClick={copiarCodigo}
              title={t("positions.copyCode")}
              className="tnum font-mono text-xl font-semibold tracking-wider text-ink transition hover:text-info"
            >
              {formatBindCode(posicao.bind_code)}
            </button>
          )}
          {expirado ? (
            <span className="text-xs text-warn">expirado — gere outro</span>
          ) : null}
          {copiado ? <span className="text-xs text-ok">copiado</span> : null}
        </div>
      </div>

      {podeEditar ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2">
          <BotaoDeLinha
            ativo={posicao.is_reference_lead}
            pendente={pendente}
            onClick={() =>
              executar(() =>
                definirReferencia(
                  raceId,
                  posicao.is_reference_lead ? null : posicao.id,
                  "lead",
                ),
              )
            }
          >
            {posicao.is_reference_lead
              ? `✓ ${t("roles.lead_car.short")}`
              : t("positions.markLead")}
          </BotaoDeLinha>

          <BotaoDeLinha
            ativo={posicao.is_reference_sweep}
            pendente={pendente}
            onClick={() =>
              executar(() =>
                definirReferencia(
                  raceId,
                  posicao.is_reference_sweep ? null : posicao.id,
                  "sweep",
                ),
              )
            }
          >
            {posicao.is_reference_sweep
              ? `✓ ${t("roles.sweep_car.short")}`
              : t("positions.markSweep")}
          </BotaoDeLinha>

          <BotaoDeLinha
            pendente={pendente}
            onClick={() => executar(() => regerarCodigo(raceId, posicao.id))}
          >
            {t("positions.regenerateCode")}
          </BotaoDeLinha>

          <BotaoDeLinha
            pendente={pendente}
            onClick={() => setEditando((v) => !v)}
          >
            {editando ? t("common.close") : t("common.edit")}
          </BotaoDeLinha>

          <span className="ml-auto flex items-center gap-2">
            {confirmandoRemocao ? (
              <>
                <span className="text-sm text-ink-muted">
                  {t("positions.confirmRemove")}
                </span>
                <BotaoDeLinha
                  pendente={pendente}
                  onClick={() =>
                    executar(() => removerPosicao(raceId, posicao.id))
                  }
                >
                  {t("common.yes")}
                </BotaoDeLinha>
                <BotaoDeLinha
                  pendente={pendente}
                  onClick={() => setConfirmandoRemocao(false)}
                >
                  {t("common.cancel")}
                </BotaoDeLinha>
              </>
            ) : (
              <BotaoDeLinha
                pendente={pendente}
                onClick={() => setConfirmandoRemocao(true)}
              >
                {t("common.remove")}
              </BotaoDeLinha>
            )}
          </span>
        </div>
      ) : null}

      {erro ? (
        <div className="px-4 pb-4">
          <Aviso tone="warn">{erro}</Aviso>
        </div>
      ) : null}

      {editando && podeEditar ? (
        <form action={salvar} className="border-t border-border p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              label={t("positions.label")}
              htmlFor={`label-${posicao.id}`}
              obrigatorio
            >
              <input
                id={`label-${posicao.id}`}
                name="label"
                type="text"
                maxLength={60}
                defaultValue={posicao.label}
                className={entradaClasse(null)}
              />
            </Campo>

            <Campo label={t("positions.role")} htmlFor={`role-${posicao.id}`}>
              <select
                id={`role-${posicao.id}`}
                name="role"
                defaultValue={posicao.role}
                className={entradaClasse(null)}
              >
                {PAPEIS.map((p) => (
                  // `<option>` não renderiza SVG — só texto.
                  <option key={p} value={p}>
                    {t(`roles.${p}.label`)}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo
              label={t("positions.driverName")}
              htmlFor={`driver-${posicao.id}`}
            >
              <input
                id={`driver-${posicao.id}`}
                name="driverName"
                type="text"
                maxLength={120}
                defaultValue={posicao.driver_name ?? ""}
                className={entradaClasse(null)}
              />
            </Campo>

            <Campo
              label={t("positions.driverPhone")}
              htmlFor={`phone-${posicao.id}`}
              hint={t("positions.driverPhoneHint")}
            >
              <input
                id={`phone-${posicao.id}`}
                name="driverPhone"
                type="tel"
                inputMode="tel"
                maxLength={30}
                defaultValue={posicao.driver_phone ?? ""}
                className={`${entradaClasse(null)} tnum`}
                placeholder="+39 333 000 0000"
              />
            </Campo>

            <Campo label={t("positions.plate")} htmlFor={`plate-${posicao.id}`}>
              <input
                id={`plate-${posicao.id}`}
                name="vehiclePlate"
                type="text"
                maxLength={15}
                defaultValue={posicao.vehicle_plate ?? ""}
                className={`${entradaClasse(null)} uppercase`}
                placeholder="AB123CD"
              />
            </Campo>

            <div className="flex items-center">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
                <input
                  type="checkbox"
                  name="isDispatchable"
                  defaultChecked={posicao.is_dispatchable}
                  className="h-5 w-5"
                />
                {t("positions.dispatchable")}
              </label>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Botao type="submit" variant="primary" disabled={pendente}>
              {pendente ? t("common.saving") : t("common.save")}
            </Botao>
            <Botao
              type="button"
              variant="quiet"
              onClick={() => setEditando(false)}
            >
              {t("common.cancel")}
            </Botao>
          </div>
        </form>
      ) : null}
    </li>
  );
}

function BotaoDeLinha({
  children,
  onClick,
  pendente,
  ativo,
}: {
  children: React.ReactNode;
  onClick: () => void;
  pendente: boolean;
  ativo?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pendente}
      className={`min-h-9 border px-3 text-xs transition disabled:opacity-50 ${
        ativo
          ? "border-ok/40 bg-ok/10 text-ok"
          : "border-border text-ink-muted hover:border-border-strong hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
