"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useT } from "@/lib/i18n/client";

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
 * O MAPA É A TELA. Antes esta página era uma grade de três colunas com o mapa
 * espremido no meio, e por baixo dela havia uma suposição errada: a de que o
 * mapa é mais um painel. Não é. Ele é o único lugar onde a prova acontece —
 * "onde está o fechamento" é uma pergunta sobre a estrada, e respondê-la numa
 * janelinha de 40% da largura obriga o diretor a dar zoom para enxergar o que
 * já deveria estar enxergando.
 *
 * Agora o mapa ocupa a viewport inteira e TUDO flutua sobre ele em vidro. O
 * ganho não é estético: os números continuam à vista enquanto o olho segue um
 * veículo, em vez de estarem numa coluna que exige desviar a atenção.
 *
 * A hierarquia continua sendo a da urgência, e ela sobreviveu à mudança:
 *
 *   1. A barra fixa de alerta não reconhecido, que cobre tudo, inclusive isto.
 *   2. À ESQUERDA, o que decide: identidade da prova e a janela abertura ↔
 *      fechamento, que é a pergunta do dia inteiro — já posso liberar esta rua?
 *   3. À DIREITA, o que exige ação e o que responde detalhe: alertas em cima,
 *      veículos embaixo.
 *   4. EMBAIXO, numa faixa só, o que é referência e nunca decisão: legenda,
 *      escala, avisos não bloqueantes e zoom.
 *
 * Aquela faixa de baixo é UM flex com `flex-wrap`, de propósito. Posicionar os
 * três blocos absolutamente — um à esquerda, um no meio, um à direita — é o
 * que se faria naturalmente, e é o que colide em tela curta ou em janela
 * estreita: o aviso âmbar passa por baixo do zoom e some. Com um flex só, eles
 * se empurram.
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

  const t = useT();
  const [ordem, setOrdem] = useState<VehicleSort>("prova");
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [focar, setFocar] = useState<{ lng: number; lat: number; token: number } | null>(
    null,
  );
  const [enquadrarToken, setEnquadrarToken] = useState(0);
  const [alturaBarra, setAlturaBarra] = useState(0);

  /*
   * A JANELA ENCOLHE QUANDO A TELA ROLA.
   *
   * Um sentinela de um pixel no topo da área rolável. Enquanto ele está
   * visível, a pessoa está no começo e o cartão aparece inteiro; quando sai de
   * vista, ela desceu para ver mapa ou veículos, e o cartão vira uma linha —
   * número e distância para o alvo — grudada no alto.
   *
   * `IntersectionObserver` e não ouvinte de rolagem: o ouvinte dispara a cada
   * quadro e obriga a ler posição de rolagem no meio do desenho, que é o
   * caminho conhecido para engasgar a rolagem num aparelho modesto. O
   * observador avisa só na transição.
   *
   * NA TELA LARGA ISTO NUNCA LIGA: lá o `main` não rola — é `overflow-hidden` —
   * então o sentinela nunca sai de vista e `compacta` fica falso sozinho. Sem
   * media query no JavaScript, e sem duas verdades para manter em sincronia.
   */
  const sentinela = useRef<HTMLDivElement>(null);
  const [compacta, setCompacta] = useState(false);

  useEffect(() => {
    const alvo = sentinela.current;
    if (!alvo) return;

    const observador = new IntersectionObserver(
      ([entrada]) => setCompacta(!entrada?.isIntersecting),
      { threshold: 0 },
    );
    observador.observe(alvo);
    return () => observador.disconnect();
  }, []);
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

      {/*
        NO ESTREITO ISTO É UMA PILHA; NO LARGO, UM PALCO.

        Acima de 64rem tudo continua como era: o mapa em tela cheia e os
        cartões flutuando por cima. Abaixo, vira coluna que rola — porque com
        390px de largura não existe "por cima" que caiba, e a tela precisa ser
        lida por um diretor que ficou só com o celular.

        A ORDEM NO CELULAR NÃO É A DA TELA GRANDE. O alerta crítico já está
        resolvido fora daqui, na barra fixa que fica acima de tudo, então o que
        sobra é ordenado por utilidade: primeiro a janela e o controle da
        prova, depois alertas e veículos, e o MAPA POR ÚLTIMO. Cento e dez
        quilômetros de percurso num celular não se leem — ele é o elemento que
        menos informa e mais ocupa, e deixá-lo no topo empurraria todo o resto
        para fora da primeira tela.
      */}
      <main
        className="relative flex w-full flex-1 flex-col overflow-y-auto bg-surface-0 lg:block lg:min-h-[36rem] lg:overflow-hidden"
        style={{ paddingTop: alturaBarra > 0 ? alturaBarra : undefined }}
      >
        {/* Um pixel invisível no alto da pilha. Só existe para o observador ter
            o que observar — ver a nota em `compacta`. */}
        <div ref={sentinela} aria-hidden className="order-1 h-px w-full shrink-0" />

        {/* O mapa por baixo de tudo. Sem percurso não há mapa — e não há
            quilometragem nem janela —, então o lugar dele recebe a explicação
            em vez de um retângulo cinza. */}
        <div className="relative order-4 h-[55vh] min-h-[16rem] w-full shrink-0 lg:absolute lg:inset-0 lg:order-none lg:h-auto lg:min-h-0">
          {renderPoints.length >= 2 ? (
            <MapaAoVivo
              basemap={snapshot.race.basemap}
              enquadrarToken={enquadrarToken}
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
              {t("live.noRoute")}
            </div>
          )}
        </div>

        {/* Vinheta: escurece as bordas para os cartões de vidro terem contra o
            que se apoiar, sem escurecer o miolo do mapa, que é onde os
            veículos estão. Não intercepta clique. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] hidden lg:block"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 50%, transparent 34%, var(--color-vignette) 100%)",
          }}
        />

        {/* Faixa de estado no alto do mapa.
            Fica sobre um gradiente, não sobre uma barra sólida: uma faixa
            opaca em cima de um mapa em tela cheia devolve a moldura que a
            tela inteira existe para tirar. O gradiente escurece o suficiente
            para o texto se sustentar e deixa a estrada aparecer por baixo. */}
        <div
          className="pointer-events-none order-1 flex justify-start px-3 py-3 sm:px-5 lg:absolute lg:inset-x-0 lg:top-0 lg:z-20"
          style={{
            background:
              "linear-gradient(180deg, var(--color-vignette), transparent)",
          }}
        >
          <div className="pointer-events-auto">
            <SaudeConexao
              connection={connection}
              health={health}
              localNowMs={Date.now()}
              atualizando={atualizando}
              onRecarregar={recarregar}
              somBloqueado={semSom}
              onAtivarSom={() =>
                void ativarSom(true).then((ok) => setSemSom(!ok))
              }
            />
          </div>
        </div>

        {/* --- Coluna esquerda: o que decide ------------------------------ */}
        {/* GRUDA NO ALTO enquanto o resto rola, e só no estreito: `lg:static`
            devolve a coluna flutuante na tela larga, onde nada rola e portanto
            nada precisa grudar.

            O fundo sólido entra apenas quando compacta — expandida ela está no
            topo, sem nada por baixo para vazar. */}
        <div
          className={`coluna-flutuante order-2 w-full px-3 pb-3 lg:static lg:left-3 lg:w-[22rem] lg:px-0 lg:pb-0 xl:left-5 ${
            compacta
              ? "sticky top-0 z-30 bg-surface-0 pt-2 lg:bg-transparent lg:pt-0"
              : ""
          }`}
        >
          {/* O controle da prova sai do caminho quando a faixa encolhe: ele é
              preparação e encerramento, não leitura de corrida em movimento, e
              grudado no alto comeria a altura que o mapa precisa. */}
          <div className={compacta ? "hidden lg:block" : ""}>
          <div className="vidro p-4">
            <ControleProva
              raceId={raceId}
              status={snapshot.race.status}
              actualStart={snapshot.race.actualStart}
              finishedAt={snapshot.race.finishedAt}
              podeEditar={podeEditar}
              pronta={pronta}
              pendencias={pendencias}
              aoMudar={recarregar}
              onEnquadrar={() => setEnquadrarToken((n) => n + 1)}
            />
          </div>

          </div>

          <JanelaGap
            gap={snapshot.gap}
            race={snapshot.race}
            nowMs={nowMs}
            compacta={compacta}
          />
        </div>

        {/* --- Coluna direita: o que exige ação, e o detalhe --------------- */}
        <div className="coluna-flutuante coluna-flutuante--alta order-3 w-full px-3 pb-3 lg:right-3 lg:w-[21rem] lg:px-0 lg:pb-0 xl:right-5">
          <PainelAlertas
            alerts={snapshot.alerts}
            vehicles={snapshot.vehicles}
            usuarioId={usuarioId}
            podeEditar={podeEditar}
            nowMs={nowMs}
            onFocarAlerta={(a) => focarEm(a.lng, a.lat)}
            aoAgir={recarregar}
          />

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

        {/* --- Faixa de baixo: referência, nunca decisão ------------------- */}
        <div className="pointer-events-none order-5 flex flex-wrap items-end justify-between gap-2 px-3 pb-4 pt-3 lg:absolute lg:inset-x-3 lg:bottom-[5.5rem] lg:z-20 lg:px-0 lg:pb-0 lg:pt-0 xl:inset-x-5">
          <p className="vidro pointer-events-auto px-3 py-2 font-mono text-[0.6rem] uppercase leading-relaxed tracking-[0.14em] text-ink-faint">
            {t("live.clockNote", { timezone: snapshot.race.timezone })}
            {alertasPendentes > 0 ? (
              <span className="ml-2 font-semibold text-critical">
                {t("live.moreUnacknowledged", { count: alertasPendentes })}
              </span>
            ) : null}
          </p>

          {snapshot.warnings.length > 0 ? (
            <ul className="pointer-events-auto max-w-[35rem] flex-1 basis-[18rem] space-y-1">
              {snapshot.warnings.map((w) => (
                <li
                  key={w}
                  role="alert"
                  className="border border-warn-line bg-warn-dim px-3 py-2 text-sm text-warn-ink backdrop-blur-md"
                >
                  {w}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </main>
    </>
  );
}
