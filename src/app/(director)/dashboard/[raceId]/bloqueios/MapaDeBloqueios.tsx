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

export interface PontoNoMapa {
  id: string;
  lat: number;
  lng: number;
  ativo: boolean;
}

export interface MapaDeBloqueiosProps {
  rota: [number, number][];
  pontos: PontoNoMapa[];
  selecionado: string | null;
  onSelecionar: (id: string | null) => void;
  basemap?: string | null;
  className?: string;
}

export function MapaDeBloqueios({
  rota,
  pontos,
  selecionado,
  onSelecionar,
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
  rotaRef.current = rota;
  pontosRef.current = pontos;
  selecionadoRef.current = selecionado;
  onSelecionarRef.current = onSelecionar;

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
          geometry: { type: "LineString", coordinates: rotaRef.current },
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

    if (rotaRef.current.length > 1) enquadrar(map, rotaRef.current);

    if (gestosEmRef.current === map) return;
    gestosEmRef.current = map;

    map.on("click", CAMADA_ACERTO, (e: MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.id;
      if (typeof id === "string") onSelecionarRef.current(id);
    });
    map.on("click", (e) => {
      const emCima = map.queryRenderedFeatures(e.point, {
        layers: [CAMADA_ACERTO],
      });
      if (emCima.length === 0) onSelecionarRef.current(null);
    });
    map.on("mouseenter", CAMADA_ACERTO, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", CAMADA_ACERTO, () => {
      map.getCanvas().style.cursor = "";
    });
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

function enquadrar(map: MapLibreMap, rota: [number, number][]) {
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
