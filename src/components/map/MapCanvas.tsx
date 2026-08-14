"use client";

import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

import { DARK_BASEMAP, LIGHT_BASEMAP } from "@/components/map/map-style";
import { resolverTema, useTemaResolvido } from "@/lib/tema-atual";

import "maplibre-gl/dist/maplibre-gl.css";

export interface MapCanvasProps {
  /** Chamado uma vez, quando o mapa terminou de carregar o estilo. */
  onReady?: (map: MapLibreMap) => void;
  /** Chamado na desmontagem, antes do mapa ser destruído. */
  onTeardown?: (map: MapLibreMap) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
  className?: string;
  /** Desliga a rotação — num painel operacional, norte sempre para cima. */
  lockBearing?: boolean;
}

/**
 * Casca do MapLibre.
 *
 * Cuida só do ciclo de vida do mapa, que é onde estão as armadilhas do
 * MapLibre em React:
 *
 *  - O mapa NÃO pode ser recriado a cada render. Ele vive num ref e é montado
 *    uma única vez; tudo que muda depois é aplicado imperativamente sobre a
 *    instância existente. Recriar significa piscar a tela toda vez que um
 *    veículo se move.
 *
 *  - `onReady` só dispara depois do evento `load`. Chamar `addSource` antes
 *    disso lança exceção, e é o erro mais comum quando dados chegam por
 *    Realtime durante a montagem do mapa.
 *
 *  - O callback vive num ref para que um `onReady` inline (função nova a cada
 *    render, como todo mundo escreve) não remonte o mapa.
 *
 *  - `ResizeObserver` porque o mapa fica em painel redimensionável, e o
 *    MapLibre só recalcula o canvas quando mandam.
 */
export function MapCanvas({
  onReady,
  onTeardown,
  initialCenter = [7.6, 44.9],
  initialZoom = 11,
  className,
  lockBearing = true,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onReadyRef = useRef(onReady);
  const onTeardownRef = useRef(onTeardown);
  const [failed, setFailed] = useState(false);
  const tema = useTemaResolvido();

  onReadyRef.current = onReady;
  onTeardownRef.current = onTeardown;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container,
        // Lido direto, não pelo estado: no primeiro render o hook ainda
        // devolve "dark" para não divergir da hidratação, e montar o mapa
        // escuro para trocar 16 ms depois pisca a tela inteira.
        style: resolverTema() === "light" ? LIGHT_BASEMAP : DARK_BASEMAP,
        center: initialCenter,
        zoom: initialZoom,
        attributionControl: { compact: true },
        pitchWithRotate: false,
        dragRotate: !lockBearing,
        touchZoomRotate: true,
        // Um mapa operacional não deve "deslizar" depois do arrasto: o diretor
        // aponta para um ponto e espera que ele fique onde ele soltou.
        dragPan: { linearity: 0.3, maxSpeed: 1400, deceleration: 3000 },
      });
    } catch {
      setFailed(true);
      return;
    }

    if (lockBearing) {
      map.touchZoomRotate.disableRotation();
    }

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: !lockBearing }),
      "top-right",
    );
    map.addControl(
      new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }),
      "bottom-left",
    );

    mapRef.current = map;

    const handleLoad = () => onReadyRef.current?.(map);
    map.on("load", handleLoad);

    // Erro de tile não pode derrubar o painel: sem internet, o mapa fica cinza
    // mas os marcadores e os números continuam corretos, que é o que importa.
    map.on("error", (e) => {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[MapCanvas]", e.error?.message ?? e);
      }
    });

    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container);

    return () => {
      observer.disconnect();
      onTeardownRef.current?.(map);
      map.off("load", handleLoad);
      map.remove();
      mapRef.current = null;
    };
    // Montagem única de propósito — mudanças posteriores são imperativas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Troca de basemap quando o tema muda.
   *
   * `setStyle` derruba fontes e camadas próprias — o traçado do percurso é uma
   * delas —, então `onReady` é chamado de novo depois do `styledata` para
   * quem desenhou em cima do mapa redesenhar. Os marcadores não entram nessa
   * conta: são elementos DOM ancorados pelo MapLibre, e sobrevivem à troca.
   *
   * `diff: false` porque os dois estilos têm a mesma `source` com URLs
   * diferentes, e o diff do MapLibre não troca a URL de uma fonte existente —
   * o estilo mudaria de cor de fundo e continuaria baixando os tiles antigos.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const estilo = tema === "light" ? LIGHT_BASEMAP : DARK_BASEMAP;
    const atual = map.getStyle()?.layers?.find((l) => l.id === "background");
    const corAtual =
      atual && atual.type === "background"
        ? (atual.paint as { "background-color"?: string })["background-color"]
        : undefined;
    const corAlvo = tema === "light" ? "#f2f4f7" : "#0a0c10";
    if (corAtual === corAlvo) return;

    const redesenhar = () => {
      map.off("styledata", redesenhar);
      onReadyRef.current?.(map);
    };
    map.on("styledata", redesenhar);
    map.setStyle(estilo, { diff: false });

    return () => {
      map.off("styledata", redesenhar);
    };
  }, [tema]);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-surface-1 p-6 text-center text-sm text-ink-muted ${className ?? ""}`}
      >
        <div>
          <p className="font-medium text-ink">Mapa indisponível</p>
          <p className="mt-1">
            Este navegador não suporta WebGL. Os dados de posição continuam
            corretos nas listas e nos números.
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}
