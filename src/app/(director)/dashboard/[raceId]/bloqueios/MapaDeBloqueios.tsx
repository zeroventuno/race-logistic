"use client";

import type { Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";
import { useCallback, useEffect, useRef } from "react";

import { MapCanvas } from "@/components/map/MapCanvas";

/**
 * Onde fica cada ponto de bloqueio.
 *
 * A tela nasceu sem mapa, com a justificativa de que quem poda a lista está
 * comparando um papel com outro papel. Era meia verdade: a lista da prefeitura
 * traz NOMES, e o que o sistema detecta traz nomes e quilômetros — mas quem
 * nunca dirigiu aquele trecho não liga "km 37,4" a lugar nenhum, e sem isso a
 * decisão de manter ou desligar um ponto vira sorteio.
 *
 * O mapa não é enfeite aqui: é a única coisa que responde "que cruzamento é
 * esse". Seleção anda nos dois sentidos — clicar no ponto marca a linha,
 * clicar na linha aproxima o ponto.
 */

const FONTE_ROTA = "bloqueios-rota";
const FONTE_PONTOS = "bloqueios-pontos";
const CAMADA_ROTA = "bloqueios-rota-traco";
const CAMADA_PONTOS = "bloqueios-pontos-circulo";
const CAMADA_ACERTO = "bloqueios-pontos-acerto";
const CAMADA_ROTA_ACERTO = "bloqueios-rota-acerto";

export interface PontoNoMapa {
  id: string;
  lat: number;
  lng: number;
  ativo: boolean;
}

export interface MapaDeBloqueiosProps {
  /** `[lng, lat, metros percorridos]` — a quilometragem vem junto. */
  rota: [number, number, number][];
  pontos: PontoNoMapa[];
  selecionado: string | null;
  onSelecionar: (id: string | null) => void;
  /** Tocar num ponto liga e desliga. */
  onAlternar: (id: string) => void;
  /** Tocar no traçado, longe de qualquer ponto, cria um ali. */
  onCriar: (offsetM: number) => void;
  basemap?: string | null;
  className?: string;
}

export function MapaDeBloqueios({
  rota,
  pontos,
  selecionado,
  onSelecionar,
  onAlternar,
  onCriar,
  basemap,
  className,
}: MapaDeBloqueiosProps) {
  const mapRef = useRef<MapLibreMap | null>(null);
  const prontoRef = useRef(false);
  const gestosEmRef = useRef<MapLibreMap | null>(null);

  const rotaRef = useRef(rota);
  const pontosRef = useRef(pontos);
  const selecionadoRef = useRef(selecionado);
  const onSelecionarRef = useRef(onSelecionar);
  const onAlternarRef = useRef(onAlternar);
  const onCriarRef = useRef(onCriar);
  rotaRef.current = rota;
  pontosRef.current = pontos;
  selecionadoRef.current = selecionado;
  onSelecionarRef.current = onSelecionar;
  onAlternarRef.current = onAlternar;
  onCriarRef.current = onCriar;

  const redesenhar = useCallback(() => {
    const map = mapRef.current;
    if (!map || !prontoRef.current) return;

    const fonte = map.getSource(FONTE_PONTOS);
    if (fonte && "setData" in fonte) {
      (fonte as { setData: (d: unknown) => void }).setData(
        pontosGeoJson(pontosRef.current, selecionadoRef.current),
      );
    }
  }, []);

  const aoPronto = useCallback((map: MapLibreMap) => {
    mapRef.current = map;
    prontoRef.current = true;

    // Fonte e camada morrem no `setStyle`; gestos não. Mesma separação do
    // editor de percurso, e pela mesma razão.
    if (!map.getSource(FONTE_ROTA)) {
      map.addSource(FONTE_ROTA, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: rotaRef.current.map(([lng, lat]) => [lng, lat]),
          },
        },
      });
    }
    if (!map.getSource(FONTE_PONTOS)) {
      map.addSource(FONTE_PONTOS, {
        type: "geojson",
        data: pontosGeoJson(pontosRef.current, selecionadoRef.current),
      });
    }

    if (!map.getLayer(CAMADA_ROTA)) {
      map.addLayer({
        id: CAMADA_ROTA,
        type: "line",
        source: FONTE_ROTA,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#1f6fb2", "line-width": 3, "line-opacity": 0.85 },
      });
    }

    if (!map.getLayer(CAMADA_PONTOS)) {
      map.addLayer({
        id: CAMADA_PONTOS,
        type: "circle",
        source: FONTE_PONTOS,
        paint: {
          "circle-radius": ["case", ["get", "selecionado"], 9, 6],
          // Desligado fica OCO: some do relatório, mas continua no mapa para
          // quem quiser reativar. Apagar do desenho esconderia a decisão.
          "circle-color": [
            "case",
            ["get", "selecionado"],
            "#12171C",
            ["get", "ativo"],
            "#1f6fb2",
            "#ffffff",
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": ["case", ["get", "ativo"], 2, 2],
          "circle-opacity": ["case", ["get", "ativo"], 1, 0.9],
        },
      });
    }

    if (!map.getLayer(CAMADA_ACERTO)) {
      // Alvo invisível maior que o desenho: o círculo tem 6 px e ninguém
      // acerta 6 px com o dedo.
      map.addLayer({
        id: CAMADA_ACERTO,
        type: "circle",
        source: FONTE_PONTOS,
        paint: { "circle-radius": 16, "circle-opacity": 0 },
      });
    }

    if (!map.getLayer(CAMADA_ROTA_ACERTO)) {
      // Faixa larga e invisível sobre o traçado. A linha tem 3 px; acertar 3 px
      // para criar um ponto seria um teste de pontaria, não uma ferramenta.
      map.addLayer({
        id: CAMADA_ROTA_ACERTO,
        type: "line",
        source: FONTE_ROTA,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-width": 24, "line-opacity": 0 },
      });
    }

    if (rotaRef.current.length > 1) enquadrar(map, rotaRef.current);

    if (gestosEmRef.current === map) return;
    gestosEmRef.current = map;

    /*
     * UM ÚNICO TRATADOR DE CLIQUE, com prioridade explícita.
     *
     * Registrar um `click` por camada deixaria a ordem de disparo a cargo da
     * ordem de pintura do MapLibre — e um ponto EM CIMA do traçado dispararia
     * os dois: alternaria o estado e criaria um vizinho a dois metros. A
     * decisão de qual gesto foi feito é uma só, e é tomada aqui.
     */
    map.on("click", (e) => {
      const noPonto = map.queryRenderedFeatures(e.point, {
        layers: [CAMADA_ACERTO],
      });

      if (noPonto.length > 0) {
        const id = noPonto[0]?.properties?.id;
        if (typeof id === "string") {
          onSelecionarRef.current(id);
          onAlternarRef.current(id);
        }
        return;
      }

      const naRota = map.queryRenderedFeatures(e.point, {
        layers: [CAMADA_ROTA_ACERTO],
      });

      if (naRota.length > 0) {
        const offsetM = offsetNoTracado(rotaRef.current, e.lngLat.lng, e.lngLat.lat);
        if (offsetM !== null) onCriarRef.current(offsetM);
        return;
      }

      onSelecionarRef.current(null);
    });

    for (const camada of [CAMADA_ACERTO, CAMADA_ROTA_ACERTO]) {
      map.on("mouseenter", camada, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", camada, () => {
        map.getCanvas().style.cursor = "";
      });
    }
  }, []);

  useEffect(() => {
    redesenhar();
  }, [pontos, selecionado, redesenhar]);

  // Selecionar pela lista aproxima o ponto, sem trocar o zoom de quem já
  // estava olhando de perto.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !prontoRef.current || !selecionado) return;

    const p = pontosRef.current.find((x) => x.id === selecionado);
    if (!p) return;

    map.easeTo({
      center: [p.lng, p.lat],
      zoom: Math.max(map.getZoom(), 14),
      duration: 500,
    });
  }, [selecionado]);

  return (
    <MapCanvas
      onReady={aoPronto}
      onTeardown={() => {
        prontoRef.current = false;
        mapRef.current = null;
        gestosEmRef.current = null;
      }}
      basemap={basemap}
      lockBearing
      className={className}
    />
  );
}

function pontosGeoJson(pontos: PontoNoMapa[], selecionado: string | null) {
  return {
    type: "FeatureCollection" as const,
    features: pontos.map((p) => ({
      type: "Feature" as const,
      properties: { id: p.id, ativo: p.ativo, selecionado: p.id === selecionado },
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
    })),
  };
}

/**
 * O quilômetro do traçado mais próximo do clique.
 *
 * Projeta sobre o SEGMENTO, não sobre o vértice mais próximo. Com amostragem
 * de 80 m, cair no vértice erraria até 40 m — o suficiente para o ponto criado
 * ficar do outro lado de um cruzamento.
 */
function offsetNoTracado(
  rota: [number, number, number][],
  lng: number,
  lat: number,
): number | null {
  if (rota.length < 2) return null;

  // Aproximação plana: na escala de metros a curvatura não muda nada.
  const cos = Math.cos((lat * Math.PI) / 180);
  const x = (l: number) => l * cos * 111_320;
  const y = (l: number) => l * 110_540;

  const px = x(lng);
  const py = y(lat);

  let melhorD2 = Infinity;
  let melhorOffset: number | null = null;

  for (let i = 1; i < rota.length; i++) {
    const [aLng, aLat, aOff] = rota[i - 1]!;
    const [bLng, bLat, bOff] = rota[i]!;

    const ax = x(aLng);
    const ay = y(aLat);
    const dx = x(bLng) - ax;
    const dy = y(bLat) - ay;
    const len2 = dx * dx + dy * dy;

    // Fração ao longo do segmento, presa em [0, 1] para não projetar fora dele.
    const t =
      len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));

    const qx = ax + t * dx;
    const qy = ay + t * dy;
    const d2 = (px - qx) * (px - qx) + (py - qy) * (py - qy);

    if (d2 < melhorD2) {
      melhorD2 = d2;
      melhorOffset = aOff + t * (bOff - aOff);
    }
  }

  return melhorOffset;
}

function enquadrar(map: MapLibreMap, rota: [number, number, number][]) {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of rota) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }

  if (!Number.isFinite(minLng)) return;

  map.fitBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
    { padding: 32, duration: 0 },
  );
}
