"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BarraAlertaCritico } from "./BarraAlertaCritico";
import { ControleProva } from "./ControleProva";
import { JanelaGap } from "./JanelaGap";
import { ListaVeiculos } from "./ListaVeiculos";
import { MapaAoVivo } from "./MapaAoVivo";
import { PainelAlertas } from "./PainelAlertas";
import { SaudeConexao } from "./SaudeConexao";
import { alertNeedsAttention, type LiveSnapshot, type VehicleSort } from "./protocol";
import { ativarSom, somBloqueado, tocar } from "./som";
import { useLiveState } from "./useLiveState";

/**
 * O painel operacional ao vivo.
 *
 * A hierarquia da tela é a hierarquia da urgência, de cima para baixo e da
 * esquerda para a direita:
 *
 *   1. A barra fixa de alerta não reconhecido, que cobre tudo.
 *   2. A janela abertura ↔ fechamento, em corpo 60, porque é a decisão que o
 *      diretor toma o dia inteiro: já posso liberar esta rua?
 *   3. Os alertas ativos, à esquerda, com as ações a um clique.
 *   4. O mapa, no centro, que é contexto e não decisão.
 *   5. A lista de veículos, à direita, que responde perguntas de detalhe.
 *
 * Nada aqui pisca, gira ou muda de cor por decoração. A única animação da tela
 * é o pulso de um alerta que ninguém reconheceu — e ela é a única porque
 * qualquer outra competiria com ela.
 */

export interface PainelAoVivoProps {
  raceId: string;
  usuarioId: string;
  podeEditar: boolean;
  inicial: LiveSnapshot;
  renderPoints: [number, number][];
  /** Checklist obrigatório da prova (vem do servidor). */
  pronta: boolean;
  pendencias: string[];
}

export function PainelAoVivo({
  raceId,
  usuarioId,
  podeEditar,
  inicial,
  renderPoints,
  pronta,
  pendencias,
}: PainelAoVivoProps) {
  const { snapshot, connection, health, nowMs, atualizando, recarregar } = useLiveState({
    raceId,
    inicial,
    gravarHistorico: podeEditar,
  });

  const [ordem, setOrdem] = useState<VehicleSort>("prova");
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [focar, setFocar] = useState<{ lng: number; lat: number; token: number } | null>(
    null,
  );
  const [alturaBarra, setAlturaBarra] = useState(0);
  const [semSom, setSemSom] = useState(false);

  const tokenRef = useRef(0);

  const focarEm = useCallback((lng: number | null, lat: number | null) => {
    if (lng === null || lat === null) return;
    tokenRef.current += 1;
    setFocar({ lng, lat, token: tokenRef.current });
  }, []);

  // --- Aviso sonoro --------------------------------------------------------

  const jaVistosRef = useRef<Set<string>>(new Set());
  const primeiraPassadaRef = useRef(true);

  useEffect(() => {
    const pendentesAgora = snapshot.alerts.filter(alertNeedsAttention);
    const vistos = jaVistosRef.current;

    for (const a of pendentesAgora) {
      if (vistos.has(a.alertId)) continue;
      vistos.add(a.alertId);

      // A primeira passada só memoriza. Tocar aqui faria o painel gritar todo
      // recarregamento de página por alertas que o diretor já conhece — e um
      // alarme que toca quando nada aconteceu é um alarme que se aprende a
      // ignorar.
      if (!primeiraPassadaRef.current) {
        tocar(a.category === "medical" ? "critico" : "normal");
      }
    }

    // Alerta reconhecido sai do conjunto: se ele voltar a ficar sem
    // reconhecimento (troca de responsável, por exemplo), volta a avisar.
    const ativos = new Set(pendentesAgora.map((a) => a.alertId));
    for (const id of vistos) {
      if (!ativos.has(id)) vistos.delete(id);
    }

    primeiraPassadaRef.current = false;
  }, [snapshot.alerts]);

  // O navegador segura o áudio até um gesto. Em vez de esperar o diretor achar
  // o botão, o primeiro clique em qualquer lugar da tela destrava — em silêncio,
  // porque um bipe inesperado ao clicar num veículo é só susto.
  useEffect(() => {
    const destravar = () => {
      void ativarSom(false).then((ok) => setSemSom(!ok));
    };
    window.addEventListener("pointerdown", destravar, { once: true });
    setSemSom(somBloqueado());
    return () => window.removeEventListener("pointerdown", destravar);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setSemSom(somBloqueado()), 5000);
    return () => clearInterval(id);
  }, []);

  // --- Seleção -------------------------------------------------------------

  const veiculoPorId = useMemo(
    () => new Map(snapshot.vehicles.map((v) => [v.positionId, v])),
    [snapshot.vehicles],
  );

  const selecionarVeiculo = useCallback(
    (positionId: string | null) => {
      setSelecionado(positionId);
      if (!positionId) return;
      const v = veiculoPorId.get(positionId);
      if (v) focarEm(v.lng, v.lat);
    },
    [veiculoPorId, focarEm],
  );

  const alertasPendentes = snapshot.alerts.filter(alertNeedsAttention).length;

  return (
    <>
      <BarraAlertaCritico
        alerts={snapshot.alerts}
        usuarioId={usuarioId}
        podeEditar={podeEditar}
        nowMs={nowMs}
        onAbrir={(a) => focarEm(a.lng, a.lat)}
        aoAgir={recarregar}
        onAltura={setAlturaBarra}
      />

      <main
        className="mx-auto max-w-[1800px] px-3 py-4 sm:px-5"
        style={{ paddingTop: alturaBarra > 0 ? alturaBarra + 16 : undefined }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ControleProva
            raceId={raceId}
            status={snapshot.race.status}
            actualStart={snapshot.race.actualStart}
            finishedAt={snapshot.race.finishedAt}
            podeEditar={podeEditar}
            pronta={pronta}
            pendencias={pendencias}
            aoMudar={recarregar}
          />

          <SaudeConexao
            connection={connection}
            health={health}
            localNowMs={Date.now()}
            atualizando={atualizando}
            onRecarregar={recarregar}
            somBloqueado={semSom}
            onAtivarSom={() => void ativarSom(true).then((ok) => setSemSom(!ok))}
          />
        </div>

        {snapshot.warnings.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {snapshot.warnings.map((w) => (
              <li
                key={w}
                role="alert"
                className="rounded-lg border border-warn/45 bg-warn/10 px-3 py-2 text-sm text-warn"
              >
                {w}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4">
          <JanelaGap gap={snapshot.gap} race={snapshot.race} nowMs={nowMs} />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[23rem_minmax(0,1fr)_20rem]">
          <div className="flex h-[26rem] min-h-0 flex-col xl:h-[calc(100dvh-21rem)] xl:min-h-[30rem]">
            <PainelAlertas
              alerts={snapshot.alerts}
              vehicles={snapshot.vehicles}
              usuarioId={usuarioId}
              podeEditar={podeEditar}
              nowMs={nowMs}
              onFocarAlerta={(a) => focarEm(a.lng, a.lat)}
              aoAgir={recarregar}
            />
          </div>

          <div className="h-[24rem] overflow-hidden rounded-xl border border-border sm:h-[32rem] xl:h-[calc(100dvh-21rem)] xl:min-h-[30rem]">
            {renderPoints.length >= 2 ? (
              <MapaAoVivo
                renderPoints={renderPoints}
                vehicles={snapshot.vehicles}
                alerts={snapshot.alerts}
                occupiedSegment={snapshot.occupiedSegment}
                nowMs={nowMs}
                selecionado={selecionado}
                onSelecionar={selecionarVeiculo}
                focar={focar}
                className="h-full w-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-ink-muted">
                {/* i18n: precisa de chave — prova sem percurso ativo */}
                Esta prova não tem percurso ativo. Sem ele não há mapa, não há
                quilometragem e não há janela abertura ↔ fechamento.
              </div>
            )}
          </div>

          <div className="flex h-[26rem] min-h-0 flex-col xl:h-[calc(100dvh-21rem)] xl:min-h-[30rem]">
            <ListaVeiculos
              vehicles={snapshot.vehicles}
              nowMs={nowMs}
              laps={snapshot.race.laps}
              sort={ordem}
              onSort={setOrdem}
              selecionado={selecionado}
              onSelecionar={selecionarVeiculo}
            />
          </div>
        </div>

        <p className="mt-3 text-center text-[11px] text-ink-faint">
          {/* i18n: precisa de chave — nota de rodapé sobre relógio e fuso */}
          Idades medidas contra o relógio do servidor, não contra o deste
          computador. Horários no fuso da prova ({snapshot.race.timezone}).
          {alertasPendentes > 0 ? (
            <span className="ml-2 font-semibold text-critical">
              {alertasPendentes} alerta(s) sem reconhecer.
            </span>
          ) : null}
        </p>
      </main>
    </>
  );
}
