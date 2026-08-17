"use client";

import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";

import { alertGlyphSvg } from "@/components/icons/alerta";
import { resolverBasemap } from "@/lib/map/basemaps";
import { prioridadeDoRotulo, rotulosVisiveis, type CaixaRotulo } from "./rotulos";
import { resolverTema } from "@/lib/tema-atual";
import { vehicleGlyphSvg } from "@/components/icons/vehicle";
import { MapCanvas } from "@/components/map/MapCanvas";
import { useT } from "@/lib/i18n/client";
import {
  ALERT_CATEGORY_META,
  ROLE_META,
  SIGNAL_META,
  type SignalHealth,
} from "@/lib/types";

import {
  alertIsActive,
  alertNeedsAttention,
  vehicleAgeSeconds,
  vehicleSignal,
  type LiveAlertView,
  type LiveVehicleView,
} from "./protocol";

/**
 * O mapa da direção.
 *
 * Diferente do mapa do motorista em duas coisas, e as duas vêm de quem olha:
 * aqui ninguém está dirigindo, então a câmera NUNCA se move sozinha — o diretor
 * enquadra o trecho que lhe interessa e ele fica lá, mesmo com 15 veículos
 * andando. E aqui todos os veículos importam igualmente, então nenhum é o
 * centro.
 *
 * A REGRA QUE GOVERNA O DESENHO DOS MARCADORES: um veículo sem sinal há três
 * minutos não pode parecer um veículo ao vivo. O marcador dele no mapa é uma
 * LEMBRANÇA, não uma posição — a 40 km/h, três minutos são dois quilômetros de
 * estrada em que ele pode estar em qualquer ponto. Por isso ele não some (some
 * seria dizer "não existe", que é pior), mas fica apagado, com contorno
 * tracejado, e ganha a idade escrita em cima. Quem olhar de relance tem que
 * conseguir separar as duas coisas sem ler nada.
 *
 * MARCADORES EM DOM, não em camada de símbolo: o estilo base é raster e não tem
 * `glyphs`, então camada com texto não renderiza. Com algumas dezenas de
 * veículos, marcador HTML é mais simples e ainda permite emoji, contorno e
 * animação de CSS.
 */

export interface MapaAoVivoProps {
  /** Mapa de fundo escolhido na prova. */
  basemap?: string | null;
  renderPoints: [number, number][];
  vehicles: LiveVehicleView[];
  alerts: LiveAlertView[];
  /** Trecho de estrada entre fechamento e abertura. `null` = não dá para saber. */
  occupiedSegment: [number, number][] | null;
  nowMs: number;
  selecionado: string | null;
  onSelecionar: (positionId: string | null) => void;
  /** Muda o `token` para reenquadrar no mesmo ponto de novo. */
  focar: { lng: number; lat: number; token: number } | null;
  /**
   * Enquadrar o percurso inteiro. É um número que só cresce: a ação é
   * "enquadre de novo", e um booleano não consegue pedir a mesma coisa duas
   * vezes seguidas.
   */
  enquadrarToken?: number;
  className?: string;
}

type Translate = ReturnType<typeof useT>;

/**
 * A rota, exatamente como o handoff especifica: casing de 9 px, traço de 4,5,
 * junta arredondada.
 *
 * A COR VEM DO FUNDO, não de um token global. A linha do percurso é a única
 * coisa nossa no mapa, e ela precisa sobreviver ao que estiver embaixo: azul
 * escuro some sobre satélite noturno, laranja some sobre topográfico bege. Por
 * isso cada fundo do catálogo carrega o próprio par de cores, já calibrado —
 * e trocar de fundo troca a rota junto, sem ninguém precisar lembrar.
 */
function corDaRota(basemap?: string | null): { linha: string; casing: string } {
  return resolverBasemap(basemap).rota[resolverTema()];
}

export function MapaAoVivo({
  basemap,
  enquadrarToken,
  renderPoints,
  vehicles,
  alerts,
  occupiedSegment,
  nowMs,
  selecionado,
  onSelecionar,
  focar,
  className,
}: MapaAoVivoProps) {
  const mapRef = useRef<MapLibreMap | null>(null);
  const prontoRef = useRef(false);
  const veiculoMarkers = useRef(new Map<string, maplibregl.Marker>());
  const alertaMarkers = useRef(new Map<string, maplibregl.Marker>());
  const enquadradoRef = useRef(false);
  // Quem está no mapa agora, para recalcular a colisão de rótulos quando a
  // câmera mexe. Guardado em ref e não em estado: isto muda a cada quadro de
  // arrasto, e um `setState` por quadro rerenderizaria o painel inteiro.
  const rotulaveisRef = useRef<
    Array<{ id: string; lng: number; lat: number; prioridade: number }>
  >([]);
  const focoRef = useRef<number>(-1);
  const [pronto, setPronto] = useState(false);
  const [demorou, setDemorou] = useState(false);
  const t = useT();

  /**
   * Enquadrar o percurso inteiro, quando o cartão de identidade pedir.
   *
   * O gatilho é um número que só cresce, e não um booleano: a ação é "enquadre
   * de novo", e o diretor pode querer isso duas vezes seguidas depois de
   * arrastar o mapa. Um booleano não sabe pedir a mesma coisa duas vezes.
   *
   * O valor inicial da referência é o token que chegou, não zero: assim a
   * montagem nunca dispara um enquadramento. O mapa já se enquadra sozinho ao
   * carregar o percurso, e refazer isso na montagem desfaria o zoom que o
   * diretor tivesse dado antes de o painel terminar de acordar.
   */
  const enquadrouRef = useRef(enquadrarToken ?? 0);

  useEffect(() => {
    const token = enquadrarToken ?? 0;
    if (token === enquadrouRef.current) return;
    enquadrouRef.current = token;

    const map = mapRef.current;
    if (map && renderPoints.length >= 2) enquadrar(map, renderPoints);
  }, [enquadrarToken, renderPoints]);

  /**
   * O mapa pode nunca ficar pronto — e um mapa vazio parece uma prova sem
   * veículos.
   *
   * O evento `load` do MapLibre só dispara depois do primeiro quadro
   * renderizado. Numa aba de fundo o navegador congela o `requestAnimationFrame`
   * e esse quadro nunca acontece; com WebGL indisponível ou o estilo bloqueado
   * por um proxy corporativo, também não. Nesses casos os marcadores não são
   * criados, e o painel exibe um retângulo vazio sobre o qual ninguém consegue
   * dizer se está errado ou se a prova ainda não começou.
   *
   * Depois de alguns segundos sem `load`, a tela passa a dizer isso em cima do
   * mapa. Os números e a lista de veículos continuam corretos — e é justamente
   * essa a frase que o diretor precisa ler.
   */
  useEffect(() => {
    if (pronto) return;
    const id = setTimeout(() => setDemorou(true), 8000);
    return () => clearTimeout(id);
  }, [pronto]);

  const selecionarRef = useRef(onSelecionar);
  selecionarRef.current = onSelecionar;

  // --- Percurso ------------------------------------------------------------

  const aplicarPercurso = useCallback(
    (map: MapLibreMap, pontos: [number, number][]) => {
      if (pontos.length < 2) return;

      const geo: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: pontos },
      };

      const fonte = map.getSource("percurso");
      if (fonte) {
        (fonte as maplibregl.GeoJSONSource).setData(geo);
      } else {
        map.addSource("percurso", { type: "geojson", data: geo });
        const cor = corDaRota(basemap);
        map.addLayer({
          id: "percurso-halo",
          type: "line",
          source: "percurso",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": cor.casing, "line-width": 9 },
        });
        map.addLayer({
          id: "percurso-linha",
          type: "line",
          source: "percurso",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": cor.linha, "line-width": 4.5 },
        });
      }

      if (!enquadradoRef.current) {
        enquadradoRef.current = true;
        enquadrar(map, pontos);
      }
    },
    [],
  );

  /**
   * O trecho que ainda está ocupado pela prova.
   *
   * Desenhado ACIMA da linha do percurso e mais grosso: é a tradução visual da
   * janela abertura ↔ fechamento, e responde a pergunta que o número sozinho
   * não responde — qual rua ainda não pode abrir. Quando o servidor não tem
   * certeza (dado velho, relógio suspeito, offsets faltando), ele manda `null`
   * e a faixa some por inteiro. Uma faixa desatualizada seria pior que nenhuma:
   * ela afirma exatamente a coisa que faria alguém liberar cedo demais.
   */
  const aplicarOcupado = useCallback(
    (map: MapLibreMap, pontos: [number, number][] | null) => {
      const geo: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: pontos && pontos.length >= 2 ? pontos : [],
        },
      };

      const fonte = map.getSource("trecho-ocupado");
      if (fonte) {
        (fonte as maplibregl.GeoJSONSource).setData(geo);
        return;
      }

      map.addSource("trecho-ocupado", { type: "geojson", data: geo });
      map.addLayer({
        id: "trecho-ocupado-linha",
        type: "line",
        source: "trecho-ocupado",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ffa726",
          "line-width": 9,
          "line-opacity": 0.35,
        },
      });
    },
    [],
  );

  // --- Marcadores ----------------------------------------------------------

  const sincronizarVeiculos = useCallback(
    (
      map: MapLibreMap,
      lista: LiveVehicleView[],
      agoraMs: number,
      selecionadoId: string | null,
      tr: Translate,
      comAlerta: Set<string>,
    ) => {
      const vistos = new Set<string>();

      for (const v of lista) {
        if (v.lat === null || v.lng === null) continue;
        vistos.add(v.positionId);

        let marker = veiculoMarkers.current.get(v.positionId);

        if (!marker) {
          const el = document.createElement("div");
          el.style.cursor = "pointer";
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            selecionarRef.current(v.positionId);
          });
          marker = new maplibregl.Marker({ element: el, anchor: "center" });
          marker.setLngLat([v.lng, v.lat]).addTo(map);
          veiculoMarkers.current.set(v.positionId, marker);
        } else {
          marker.setLngLat([v.lng, v.lat]);
        }

        pintarVeiculo(
          marker.getElement(),
          v,
          vehicleSignal(v, agoraMs),
          vehicleAgeSeconds(v, agoraMs),
          v.positionId === selecionadoId,
          tr,
        );
      }

      for (const [id, marker] of veiculoMarkers.current) {
        if (!vistos.has(id)) {
          marker.remove();
          veiculoMarkers.current.delete(id);
        }
      }

      rotulaveisRef.current = lista
        .filter((v) => v.lat !== null && v.lng !== null)
        .map((v) => ({
          id: v.positionId,
          lng: v.lng as number,
          lat: v.lat as number,
          prioridade: prioridadeDoRotulo({
            temAlerta: comAlerta.has(v.positionId),
            selecionado: v.positionId === selecionadoId,
            referencia: v.isReferenceLead || v.isReferenceSweep,
            ordemComboio: ROLE_META[v.role].convoyOrder,
          }),
        }));
    },
    [],
  );


  /**
   * Esconde os rótulos que se atropelariam.
   *
   * Roda depois de cada sincronização e a cada movimento da câmera, porque a
   * sobreposição é uma propriedade do ZOOM, não dos dados: os mesmos três
   * veículos que cabem lado a lado num zoom de rua viram uma mancha só no
   * zoom da prova inteira.
   *
   * A medida sai do DOM (`offsetWidth`) em vez de ser estimada pelo tamanho do
   * texto: o nome do veículo é escolhido pelo diretor e pode ser qualquer
   * coisa, de "M1" a "Ambulância do Corpo de Bombeiros".
   */
  const recalcularRotulos = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const caixas: CaixaRotulo[] = [];
    const elementos = new Map<string, HTMLElement>();

    for (const item of rotulaveisRef.current) {
      const marker = veiculoMarkers.current.get(item.id);
      const rotulo = marker
        ?.getElement()
        .querySelector<HTMLElement>("[data-rotulo]");
      if (!rotulo) continue;

      // Mede com o rótulo visível: um elemento em `display:none` mede zero, e
      // aí ele nunca mais voltaria a caber em lugar nenhum.
      rotulo.style.display = "";
      const largura = rotulo.offsetWidth;
      const altura = rotulo.offsetHeight;
      if (!largura || !altura) continue;

      const ponto = map.project([item.lng, item.lat]);
      elementos.set(item.id, rotulo);
      caixas.push({
        id: item.id,
        prioridade: item.prioridade,
        x: ponto.x,
        y: ponto.y,
        largura,
        altura,
      });
    }

    const visiveis = rotulosVisiveis(caixas);
    for (const [id, el] of elementos) {
      el.style.display = visiveis.has(id) ? "" : "none";
    }
  }, []);
  const sincronizarAlertas = useCallback(
    (map: MapLibreMap, lista: LiveAlertView[]) => {
      const vistos = new Set<string>();

      for (const a of lista) {
        if (a.lat === null || a.lng === null) continue;
        if (!alertIsActive(a)) continue;
        vistos.add(a.alertId);

        let marker = alertaMarkers.current.get(a.alertId);

        if (!marker) {
          const el = document.createElement("div");
          marker = new maplibregl.Marker({ element: el, anchor: "bottom" });
          marker.setLngLat([a.lng, a.lat]).addTo(map);
          alertaMarkers.current.set(a.alertId, marker);
        } else {
          marker.setLngLat([a.lng, a.lat]);
        }

        pintarAlerta(marker.getElement(), a);
      }

      for (const [id, marker] of alertaMarkers.current) {
        if (!vistos.has(id)) {
          marker.remove();
          alertaMarkers.current.delete(id);
        }
      }
    },
    [],
  );

  // --- Ciclo de vida -------------------------------------------------------

  const aoPronto = useCallback(
    (map: MapLibreMap) => {
      mapRef.current = map;
      prontoRef.current = true;
      setPronto(true);

      map.on("click", () => selecionarRef.current(null));

      aplicarPercurso(map, renderPoints);
      aplicarOcupado(map, occupiedSegment);
      sincronizarVeiculos(
        map,
        vehicles,
        nowMs,
        selecionado,
        t,
        new Set(
          alerts
            .filter(alertIsActive)
            .map((a) => a.raisedBy?.positionId)
            .filter((id): id is string => Boolean(id)),
        ),
      );
      sincronizarAlertas(map, alerts);
      recalcularRotulos();
    },
    // Montagem única: o mapa é criado uma vez e tudo depois é imperativo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (prontoRef.current && mapRef.current) {
      aplicarPercurso(mapRef.current, renderPoints);
    }
  }, [renderPoints, aplicarPercurso]);

  useEffect(() => {
    if (prontoRef.current && mapRef.current) {
      aplicarOcupado(mapRef.current, occupiedSegment);
    }
  }, [occupiedSegment, aplicarOcupado]);

  useEffect(() => {
    if (!prontoRef.current || !mapRef.current) return;

    // Quem levantou alerta ainda aberto. É a primeira prioridade do rótulo:
    // o veículo que pediu socorro não pode ser o que some do mapa.
    const comAlerta = new Set(
      alerts
        .filter(alertIsActive)
        .map((a) => a.raisedBy?.positionId)
        .filter((id): id is string => Boolean(id)),
    );

    sincronizarVeiculos(mapRef.current, vehicles, nowMs, selecionado, t, comAlerta);
    recalcularRotulos();
  }, [
    vehicles,
    alerts,
    nowMs,
    selecionado,
    sincronizarVeiculos,
    recalcularRotulos,
    t,
  ]);

  useEffect(() => {
    if (prontoRef.current && mapRef.current) {
      sincronizarAlertas(mapRef.current, alerts);
    }
  }, [alerts, sincronizarAlertas]);

  // A câmera só se move por ação EXPLÍCITA (clique numa linha da lista ou no km
  // de um alerta). O `token` permite repetir o enquadramento no mesmo ponto —
  // clicar duas vezes na mesma linha tem que voltar a centrar, não virar nada.
  useEffect(() => {
    if (!focar || !prontoRef.current || !mapRef.current) return;
    if (focar.token === focoRef.current) return;
    focoRef.current = focar.token;

    mapRef.current.easeTo({
      center: [focar.lng, focar.lat],
      zoom: Math.max(mapRef.current.getZoom(), 13.5),
      duration: 600,
    });
  }, [focar]);

  /**
   * A sobreposição muda com o ZOOM, não só com os dados: os mesmos veículos que
   * cabem lado a lado numa rua viram uma mancha no enquadramento da prova
   * inteira. Então recalcula a cada movimento da câmera.
   *
   * Agendado num quadro de animação porque `move` dispara dezenas de vezes por
   * segundo durante o arrasto, e medir o DOM em cada disparo trava o arrasto.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let agendado = false;
    const aoMover = () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(() => {
        agendado = false;
        recalcularRotulos();
      });
    };

    map.on("move", aoMover);
    map.on("zoom", aoMover);
    return () => {
      map.off("move", aoMover);
      map.off("zoom", aoMover);
    };
  }, [pronto, recalcularRotulos]);

  useEffect(() => {
    const veiculos = veiculoMarkers.current;
    const alertas = alertaMarkers.current;
    return () => {
      for (const m of veiculos.values()) m.remove();
      veiculos.clear();
      for (const m of alertas.values()) m.remove();
      alertas.clear();
    };
  }, []);

  return (
    <div className={`relative ${className ?? ""}`}>
      <MapCanvas
        basemap={basemap}
        onReady={aoPronto}
        className="h-full w-full"
        initialZoom={12}
      />

      {!pronto && demorou ? (
        <div className="pointer-events-none absolute inset-x-3 top-3 border border-warn/60 bg-surface-1/95 px-3 py-2 text-sm text-warn">
          <p className="font-semibold">{t("map.slowTitle")}</p>
          <p className="mt-0.5 text-ink-muted">
            {t("map.slowBody")}
          </p>
        </div>
      ) : null}

      <LegendaSinal />
    </div>
  );
}

function LegendaSinal() {
  const t = useT();
  const estados: SignalHealth[] = ["live", "delayed", "stale", "lost"];

  return (
    // Acima da escala do MapLibre, que fica colada no canto.
    <div className="vidro pointer-events-none absolute bottom-11 left-3 flex flex-wrap gap-x-3 gap-y-1 px-3 py-2 text-[11px] text-ink-muted">
      {estados.map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-3 w-3 rounded-full border-2"
            style={{
              borderColor: SIGNAL_META[s].color,
              borderStyle: s === "stale" || s === "lost" ? "dashed" : "solid",
              background: "var(--color-surface-3)",
              opacity: s === "lost" ? 0.5 : 1,
            }}
          />
          {t(`signal.${s}`)}
        </span>
      ))}
    </div>
  );
}

function enquadrar(map: MapLibreMap, pontos: [number, number][]): void {
  const primeiro = pontos[0];
  if (!primeiro) return;

  const limites = new maplibregl.LngLatBounds(primeiro, primeiro);
  for (const p of pontos) limites.extend(p);

  map.fitBounds(limites, { padding: 56, animate: true, duration: 500 });
}

/**
 * Pinta o marcador de um veículo.
 *
 * A hierarquia visual está em três canais independentes de propósito, para
 * sobreviver a daltonismo e a projetor ruim: COR do preenchimento diz o papel,
 * COR e ESTILO do contorno dizem a saúde do sinal, e OPACIDADE + selo de idade
 * dizem "este ponto é uma lembrança". Um veículo perdido perde brilho, ganha
 * tracejado e ganha texto — três motivos para não ser confundido com um ao
 * vivo, e nenhum deles depende de distinguir verde de vermelho.
 */
function pintarVeiculo(
  raiz: HTMLElement,
  v: LiveVehicleView,
  sinal: SignalHealth,
  idadeSegundos: number | null,
  selecionado: boolean,
  t: Translate,
): void {
  const meta = ROLE_META[v.role];
  const referencia = v.isReferenceLead || v.isReferenceSweep;
  // Ponto, não botão. O marcador de 30/38 px cobria a curva em que o veículo
  // estava — com uma dúzia deles no mesmo trecho o mapa virava uma fileira de
  // discos encostados e sumia o percurso por baixo. A cor já diz o papel de
  // relance; o pictograma é para quando o olho pousa. As duas referências da
  // janela continuam maiores que o resto, que é a única hierarquia que este
  // mapa precisa sustentar.
  const tamanho = referencia ? 26 : 20;
  const apagado = sinal === "stale" || sinal === "lost" || sinal === "never";

  raiz.style.display = "flex";
  raiz.style.flexDirection = "column";
  raiz.style.alignItems = "center";
  raiz.style.gap = "2px";
  raiz.style.userSelect = "none";

  let chip = raiz.querySelector<HTMLDivElement>("[data-chip]");
  let selo = raiz.querySelector<HTMLSpanElement>("[data-selo]");
  let rotulo = raiz.querySelector<HTMLSpanElement>("[data-rotulo]");

  if (!chip) {
    chip = document.createElement("div");
    chip.dataset.chip = "1";
    chip.style.position = "relative";
    chip.style.display = "flex";
    chip.style.alignItems = "center";
    chip.style.justifyContent = "center";
    chip.style.borderRadius = "9999px";
    chip.style.lineHeight = "1";

    selo = document.createElement("span");
    selo.dataset.selo = "1";
    selo.style.position = "absolute";
    selo.style.top = "-6px";
    selo.style.right = "-10px";
    selo.style.borderRadius = "9999px";
    selo.style.padding = "0 4px";
    selo.style.fontSize = "8px";
    selo.style.fontWeight = "700";
    selo.style.lineHeight = "12px";
    selo.style.border = "1px solid #0a0c10";
    chip.appendChild(selo);

    rotulo = document.createElement("span");
    rotulo.dataset.rotulo = "1";
    rotulo.style.maxWidth = "110px";
    rotulo.style.overflow = "hidden";
    rotulo.style.textOverflow = "ellipsis";
    rotulo.style.whiteSpace = "nowrap";
    rotulo.style.borderRadius = "4px";
    rotulo.style.padding = "1px 4px";
    rotulo.style.fontSize = "10px";
    rotulo.style.fontWeight = "600";
    rotulo.style.background = "rgb(10 12 16 / .78)";
    rotulo.style.color = "#e8ecf2";

    raiz.appendChild(chip);
    raiz.appendChild(rotulo);
  }

  if (!selo || !rotulo) return;

  chip.style.width = `${tamanho}px`;
  chip.style.height = `${tamanho}px`;
  chip.style.fontSize = referencia ? "12px" : "10px";
  chip.style.background = meta.color;
  chip.style.borderWidth = referencia ? "2.5px" : "2px";
  chip.style.borderStyle = apagado ? "dashed" : "solid";
  chip.style.borderColor = SIGNAL_META[sinal].color;
  chip.style.opacity = sinal === "lost" || sinal === "never" ? "0.45" : apagado ? "0.7" : "1";
  chip.style.filter = sinal === "lost" || sinal === "never" ? "grayscale(0.55)" : "none";
  chip.style.boxShadow = selecionado
    ? "0 0 0 3px #e8ecf2, 0 0 0 6px rgb(56 189 248 / .5)"
    : "0 1px 4px rgb(0 0 0 / .6)";

  // O pictograma fica num nó próprio para não apagar o selo a cada pintura.
  //
  // `innerHTML` com SVG gerado por nós, nunca com dado de usuário: o rótulo do
  // veículo entra por `textContent` mais abaixo, justamente para não abrir essa
  // porta.
  let icone = chip.querySelector<HTMLSpanElement>("[data-icone]");
  if (!icone) {
    icone = document.createElement("span");
    icone.dataset.icone = "1";
    icone.style.display = "flex";
    chip.insertBefore(icone, selo);
  }
  const chaveIcone = `${v.role}:${referencia ? "ref" : "normal"}`;
  if (icone.dataset.papel !== chaveIcone) {
    icone.innerHTML = vehicleGlyphSvg(v.role, "#0a0c10", referencia ? 15 : 12);
    icone.dataset.papel = chaveIcone;
  }

  // O selo só existe quando há o que confessar: idade que já compromete a
  // posição, veículo fora do percurso, ou aparelho nunca vinculado.
  if (sinal === "never") {
    selo.textContent = "?";
    selo.style.display = "block";
    selo.style.background = SIGNAL_META.never.color;
    selo.style.color = "#0a0c10";
  } else if (apagado && idadeSegundos !== null) {
    selo.textContent = idadeCurta(idadeSegundos);
    selo.style.display = "block";
    selo.style.background = SIGNAL_META[sinal].color;
    selo.style.color = "#0a0c10";
  } else if (v.offRoute) {
    selo.textContent = "⟂";
    selo.style.display = "block";
    selo.style.background = "var(--color-warn)";
    selo.style.color = "#0a0c10";
  } else {
    selo.style.display = "none";
  }

  rotulo.textContent = v.label;
  rotulo.style.opacity = apagado ? "0.75" : "1";
  rotulo.style.borderLeft = v.isReferenceLead
    ? "3px solid var(--role-lead)"
    : v.isReferenceSweep
      ? "3px solid var(--role-sweep)"
      : "none";

  const descricao = `${v.label} · ${t(`roles.${v.role}.short`)} · ${t(`signal.${sinal}`)}`;
  raiz.title =
    idadeSegundos === null
      ? descricao
      : `${descricao} · ${Math.round(idadeSegundos)} s`;
  raiz.setAttribute("aria-label", descricao);
}

function pintarAlerta(el: HTMLElement, a: LiveAlertView): void {
  const meta = ALERT_CATEGORY_META[a.category];
  const gritando = alertNeedsAttention(a);

  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.width = gritando ? "44px" : "36px";
  el.style.height = gritando ? "44px" : "36px";
  el.style.borderRadius = "10px";

  el.style.border = "2px solid #0a0c10";
  el.style.background =
    a.category === "medical" ? "var(--color-critical)" : "var(--color-warn)";
  // SVG gerado por nós, nunca dado do banco — a nota do alerta entra por
  // `title` mais abaixo, justamente para não abrir essa porta.
  if (el.dataset.categoria !== a.category) {
    el.innerHTML = alertGlyphSvg(a.category, "#0a0c10", gritando ? 24 : 20);
    el.dataset.categoria = a.category;
  }

  // O mesmo pulso do painel de alertas. Um acidente que ninguém reconheceu tem
  // que se mexer no mapa exatamente como se mexe na lista — são a mesma coisa
  // vista de dois lugares, e dar a elas ênfases diferentes ensina o olho a
  // confiar em uma e ignorar a outra.
  el.classList.toggle("alert-pulse", gritando);

  el.title = a.note ?? meta.label;
}

/** Idade em duas ou três letras, para caber num selo de 9 px. */
function idadeCurta(segundos: number): string {
  if (segundos < 60) return `${Math.round(segundos)}s`;
  if (segundos < 3600) return `${Math.round(segundos / 60)}m`;
  return `${Math.round(segundos / 3600)}h`;
}
