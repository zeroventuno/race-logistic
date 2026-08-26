"use client";

import type { FeatureCollection, LineString, Point } from "geojson";
import type {
  LayerSpecification,
  LngLatBoundsLike,
  MapLayerMouseEvent,
  MapLayerTouchEvent,
  MapMouseEvent,
  MapTouchEvent,
  Map as MapLibreMap,
} from "maplibre-gl";
import { useCallback, useEffect, useRef } from "react";

import { MapCanvas } from "@/components/map/MapCanvas";
import type { LatLng } from "@/lib/geo/distance";

/**
 * Mapa de desenho de percurso.
 *
 * Controlado por fora: os vértices vivem no editor, que é quem mantém o
 * histórico de desfazer. Este componente só traduz gestos em intenções.
 *
 * Três decisões que parecem detalhe e não são:
 *
 *  - CAMADA DE ACERTO INVISÍVEL. O círculo visível do vértice tem 5 px de raio.
 *    Arrastar isso com o dedo, num trailer chacoalhando, é impossível. Existe
 *    uma segunda camada de 16 px totalmente transparente só para receber o
 *    toque — o alvo fica grande sem que o desenho fique pesado.
 *
 *  - ARRASTAR NÃO ENTRA NO HISTÓRICO A CADA PIXEL. Durante o gesto o editor
 *    recebe `onPreview`; só ao soltar recebe `onCommit`. Sem isso, um Ctrl+Z
 *    desfaria um micromovimento do mouse em vez do movimento inteiro.
 *
 *  - EM MODO LEITURA, SÓ AS PONTAS GANHAM MARCADOR. O mesmo componente exibe o
 *    percurso importado, que chega com até 3 000 vértices; desenhar um círculo
 *    em cada um transformaria a linha numa fileira de bolinhas ilegível.
 */

const FONTE_LINHA = "percurso-desenho-linha";
const FONTE_VERTICES = "percurso-desenho-vertices";
const CAMADA_LINHA = "percurso-desenho-linha-traco";
const CAMADA_LINHA_HALO = "percurso-desenho-linha-halo";
const CAMADA_VERTICES = "percurso-desenho-vertices-circulo";
const CAMADA_VERTICES_ACERTO = "percurso-desenho-vertices-acerto";

const COR_LINHA = "#38bdf8";
const COR_FUNDO = "#0a0c10";
const COR_INK = "#e8ecf2";

export interface RouteDrawMapProps {
  vertices: LatLng[];
  selecionado: number | null;
  onSelecionar: (indice: number | null) => void;
  /** Mudança discreta: vira uma entrada de desfazer. */
  onCommit: (vertices: LatLng[]) => void;
  /** Mudança contínua durante o arrasto: não vira entrada de desfazer. */
  onPreview: (vertices: LatLng[]) => void;
  /** Muda de valor quando o editor quer reenquadrar (importou um GPX, p.ex.). */
  enquadrarEm?: number;
  centroInicial?: [number, number];
  zoomInicial?: number;
  className?: string;
  /** Somente leitura: mostra o traçado mas não aceita edição. */
  somenteLeitura?: boolean;
}

export function RouteDrawMap({
  vertices,
  selecionado,
  onSelecionar,
  onCommit,
  onPreview,
  enquadrarEm,
  centroInicial,
  zoomInicial,
  className,
  somenteLeitura = false,
}: RouteDrawMapProps) {
  const mapRef = useRef<MapLibreMap | null>(null);
  const prontoRef = useRef(false);

  // Todo estado que os handlers do MapLibre leem passa por ref: eles são
  // registrados uma vez só, e uma closure capturada naquele instante veria para
  // sempre o primeiro array de vértices.
  const verticesRef = useRef(vertices);
  const selecionadoRef = useRef(selecionado);
  const somenteLeituraRef = useRef(somenteLeitura);
  const onCommitRef = useRef(onCommit);
  const onPreviewRef = useRef(onPreview);
  const onSelecionarRef = useRef(onSelecionar);

  verticesRef.current = vertices;
  selecionadoRef.current = selecionado;
  somenteLeituraRef.current = somenteLeitura;
  onCommitRef.current = onCommit;
  onPreviewRef.current = onPreview;
  onSelecionarRef.current = onSelecionar;

  /**
   * Em qual instância de mapa os gestos já foram instalados.
   *
   * `aoPronto` roda MAIS DE UMA VEZ por montagem, e isso não é defeito do
   * `MapCanvas`: `setStyle` derruba fontes e camadas, então quem desenha em
   * cima precisa ser chamado de novo para redesenhar. Só que gestos NÃO são
   * derrubados pelo `setStyle` — eles vivem no mapa, não no estilo —, e
   * registrá-los a cada chamada empilha um `click` em cima do outro.
   *
   * O efeito era um clique produzir DUAS entradas de histórico: o vértice
   * entrava uma vez só, mas o Ctrl+Z precisava de dois toques, e o primeiro
   * parecia não fazer nada.
   */
  const gestosEmRef = useRef<MapLibreMap | null>(null);

  const redesenhar = useCallback(() => {
    const map = mapRef.current;
    if (!map || !prontoRef.current) return;

    const pts = verticesRef.current;

    aplicarDados(map, FONTE_LINHA, linhaGeoJson(pts));
    aplicarDados(
      map,
      FONTE_VERTICES,
      verticesGeoJson(pts, selecionadoRef.current, somenteLeituraRef.current),
    );
  }, []);

  const aoPronto = useCallback(
    (map: MapLibreMap) => {
      mapRef.current = map;
      prontoRef.current = true;

      const soLeitura = somenteLeituraRef.current;

      // Fonte e camada SÃO re-adicionadas a cada chamada, porque o `setStyle`
      // as destrói. A guarda existe para o caso de `load` e `styledata`
      // chegarem na ordem oposta, em que o estilo ainda tem tudo de pé.
      garantirFonte(map, FONTE_LINHA, linhaGeoJson(verticesRef.current));
      garantirFonte(
        map,
        FONTE_VERTICES,
        verticesGeoJson(verticesRef.current, selecionadoRef.current, soLeitura),
      );

      // Halo escuro por baixo: sobre a parte clara do basemap uma linha ciano
      // de 3 px desaparece.
      garantirCamada(map, {
        id: CAMADA_LINHA_HALO,
        type: "line",
        source: FONTE_LINHA,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": COR_FUNDO,
          "line-width": 7,
          "line-opacity": 0.7,
        },
      });

      garantirCamada(map, {
        id: CAMADA_LINHA,
        type: "line",
        source: FONTE_LINHA,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": COR_LINHA, "line-width": 3 },
      });

      garantirCamada(map, {
        id: CAMADA_VERTICES,
        type: "circle",
        source: FONTE_VERTICES,
        paint: {
          "circle-radius": [
            "case",
            ["get", "selecionado"],
            9,
            ["get", "extremo"],
            7,
            5,
          ],
          "circle-color": ["case", ["get", "selecionado"], COR_INK, COR_LINHA],
          "circle-stroke-color": COR_FUNDO,
          "circle-stroke-width": 2,
        },
      });

      garantirCamada(map, {
        id: CAMADA_VERTICES_ACERTO,
        type: "circle",
        source: FONTE_VERTICES,
        paint: { "circle-radius": 16, "circle-opacity": 0 },
      });

      // Enquadramento inicial: o efeito de `enquadrarEm` roda antes de o mapa
      // existir, então sem isto um percurso já gravado abriria fora da tela.
      if (verticesRef.current.length > 0) {
        enquadrar(map, verticesRef.current, false);
      }

      if (soLeitura) return;

      // Daqui para baixo é gesto, e gesto sobrevive à troca de estilo.
      if (gestosEmRef.current === map) return;
      gestosEmRef.current = map;

      map.on("click", (e: MapMouseEvent) => {
        const emCima = map.queryRenderedFeatures(e.point, {
          layers: [CAMADA_VERTICES_ACERTO],
        });

        if (emCima.length > 0) {
          const idx = Number(emCima[0]?.properties?.indice ?? -1);
          onSelecionarRef.current(idx >= 0 ? idx : null);
          return;
        }

        const proximos = [
          ...verticesRef.current,
          { lat: e.lngLat.lat, lng: e.lngLat.lng },
        ];
        onCommitRef.current(proximos);
        onSelecionarRef.current(proximos.length - 1);
      });

      map.on("contextmenu", CAMADA_VERTICES_ACERTO, (e: MapLayerMouseEvent) => {
        e.preventDefault();
        const idx = Number(e.features?.[0]?.properties?.indice ?? -1);
        if (idx < 0) return;
        onCommitRef.current(verticesRef.current.filter((_, i) => i !== idx));
        onSelecionarRef.current(null);
      });

      map.on("mouseenter", CAMADA_VERTICES_ACERTO, () => {
        map.getCanvas().style.cursor = "grab";
      });
      map.on("mouseleave", CAMADA_VERTICES_ACERTO, () => {
        map.getCanvas().style.cursor = "";
      });

      instalarArrasto(map, {
        verticesRef,
        onPreviewRef,
        onCommitRef,
        onSelecionarRef,
      });
    },
    [],
  );

  useEffect(() => {
    redesenhar();
  }, [vertices, selecionado, redesenhar]);

  useEffect(() => {
    if (enquadrarEm === undefined) return;
    const map = mapRef.current;
    if (!map || !prontoRef.current) return;
    enquadrar(map, verticesRef.current, true);
  }, [enquadrarEm]);

  return (
    <MapCanvas
      onReady={aoPronto}
      onTeardown={() => {
        prontoRef.current = false;
        mapRef.current = null;
        gestosEmRef.current = null;
      }}
      initialCenter={centroInicial}
      initialZoom={zoomInicial}
      className={className}
    />
  );
}

/**
 * Fonte que suporta ser pedida de novo.
 *
 * Depois de um `setStyle` ela não existe mais e precisa voltar; antes dele,
 * pedir de novo faria o MapLibre lançar "There is already a source with ID".
 */
export function garantirFonte(
  map: MapLibreMap,
  id: string,
  data: FeatureCollection,
): void {
  if (map.getSource(id)) {
    aplicarDados(map, id, data);
    return;
  }
  map.addSource(id, { type: "geojson", data });
}

/** Mesma ideia para camada. */
export function garantirCamada(map: MapLibreMap, spec: LayerSpecification): void {
  if (map.getLayer(spec.id)) return;
  map.addLayer(spec);
}

function aplicarDados(
  map: MapLibreMap,
  id: string,
  data: FeatureCollection,
): void {
  const fonte = map.getSource(id);
  if (fonte && "setData" in fonte) {
    (fonte as { setData: (d: FeatureCollection) => void }).setData(data);
  }
}

/** Enquadra o mapa no traçado, com margem para os controles não taparem. */
export function enquadrar(
  map: MapLibreMap,
  pontos: LatLng[],
  animar: boolean,
): void {
  if (pontos.length === 0) return;

  const duration = animar ? 400 : 0;

  if (pontos.length === 1) {
    const p = pontos[0]!;
    map.easeTo({ center: [p.lng, p.lat], zoom: 14, duration });
    return;
  }

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const p of pontos) {
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
  }

  const bounds: LngLatBoundsLike = [
    [minLng, minLat],
    [maxLng, maxLat],
  ];

  map.fitBounds(bounds, { padding: 48, duration, maxZoom: 15 });
}

interface RefsDeArrasto {
  verticesRef: { current: LatLng[] };
  onPreviewRef: { current: (v: LatLng[]) => void };
  onCommitRef: { current: (v: LatLng[]) => void };
  onSelecionarRef: { current: (i: number | null) => void };
}

/**
 * Arrasto de vértice, mouse e toque.
 *
 * `preventDefault` no início é o que impede o mapa de fazer pan junto — sem
 * isso o vértice segue o ponteiro e o mapa desliza embaixo, dobrando o
 * movimento e deixando o vértice em qualquer lugar menos onde a pessoa soltou.
 */
function instalarArrasto(map: MapLibreMap, refs: RefsDeArrasto): void {
  let arrastando: number | null = null;

  const mover = (lngLat: { lng: number; lat: number }) => {
    if (arrastando === null) return;
    const alvo = arrastando;
    refs.onPreviewRef.current(
      refs.verticesRef.current.map((p, i) =>
        i === alvo ? { lat: lngLat.lat, lng: lngLat.lng } : p,
      ),
    );
  };

  const aoMoverMouse = (e: MapMouseEvent) => mover(e.lngLat);
  const aoMoverToque = (e: MapTouchEvent) => mover(e.lngLat);

  const encerrar = () => {
    if (arrastando === null) return;
    arrastando = null;
    map.off("mousemove", aoMoverMouse);
    map.off("touchmove", aoMoverToque);
    map.getCanvas().style.cursor = "";
    map.dragPan.enable();
    // O último preview já carrega a geometria final; o commit existe só para
    // marcar o ponto de desfazer do gesto inteiro.
    refs.onCommitRef.current(refs.verticesRef.current);
  };

  const iniciar = (indice: number) => {
    arrastando = indice;
    refs.onSelecionarRef.current(indice);
    map.dragPan.disable();
    map.getCanvas().style.cursor = "grabbing";
  };

  map.on("mousedown", CAMADA_VERTICES_ACERTO, (e: MapLayerMouseEvent) => {
    e.preventDefault();
    const idx = Number(e.features?.[0]?.properties?.indice ?? -1);
    if (idx < 0) return;
    iniciar(idx);
    map.on("mousemove", aoMoverMouse);
    map.once("mouseup", encerrar);
  });

  map.on("touchstart", CAMADA_VERTICES_ACERTO, (e: MapLayerTouchEvent) => {
    // Dois dedos é zoom, não arrasto de vértice.
    if (e.points.length !== 1) return;
    e.preventDefault();
    const idx = Number(e.features?.[0]?.properties?.indice ?? -1);
    if (idx < 0) return;
    iniciar(idx);
    map.on("touchmove", aoMoverToque);
    map.once("touchend", encerrar);
    map.once("touchcancel", encerrar);
  });
}

function linhaGeoJson(pontos: LatLng[]): FeatureCollection<LineString> {
  if (pontos.length < 2) {
    return { type: "FeatureCollection", features: [] };
  }
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: pontos.map((p) => [p.lng, p.lat]),
        },
      },
    ],
  };
}

function verticesGeoJson(
  pontos: LatLng[],
  selecionado: number | null,
  somenteLeitura: boolean,
): FeatureCollection<Point> {
  const indices = somenteLeitura
    ? pontos.length > 1
      ? [0, pontos.length - 1]
      : pontos.length === 1
        ? [0]
        : []
    : pontos.map((_, i) => i);

  return {
    type: "FeatureCollection",
    features: indices.map((i) => ({
      type: "Feature",
      properties: {
        indice: i,
        selecionado: i === selecionado,
        extremo: i === 0 || i === pontos.length - 1,
      },
      geometry: {
        type: "Point",
        coordinates: [pontos[i]!.lng, pontos[i]!.lat],
      },
    })),
  };
}
