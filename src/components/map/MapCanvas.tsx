"use client";

import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

import type { TranslationKey } from "@/lib/i18n/translate";
import { resolverBasemap, type BasemapId } from "@/lib/map/basemaps";
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
  /**
   * Qual mapa de fundo. Vem da prova; um valor desconhecido ou desligado por
   * licença cai no padrão sem reclamar, porque ficar sem mapa no dia do
   * evento é pior que ficar com o mapa errado.
   */
  basemap?: BasemapId | string | null;
  /**
   * Chamado quando o fundo escolhido não consegue carregar tile e o mapa cai
   * para o padrão. Quem recebe decide como avisar — aqui não se interrompe
   * ninguém.
   */
  onFundoIndisponivel?: (nomeChave: TranslationKey) => void;
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
  basemap,
  onFundoIndisponivel,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onReadyRef = useRef(onReady);
  const onTeardownRef = useRef(onTeardown);
  const [failed, setFailed] = useState(false);
  const tema = useTemaResolvido();
  // Qual par fundo+tema está pintado. Comparar isto é mais direto do que
  // inferir pela cor de fundo do estilo, que era o que se fazia antes e
  // deixava de funcionar assim que dois fundos compartilhassem a mesma cor.
  const estiloAtualRef = useRef<string | null>(null);
  const avisouRef = useRef(false);

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
        style: resolverBasemap(basemap).estilo(resolverTema()),
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

    // Os dois embaixo: o alto da tela pertence à faixa de estado e às colunas
    // flutuantes. Um controle de zoom escondido atrás de um cartão é um botão
    // que existe e não dá para apertar.
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: !lockBearing }),
      "bottom-right",
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
    //
    // Quando o fundo ESCOLHIDO é que não carrega — chave vencida, cota
    // estourada, provedor fora do ar —, cai para o padrão sem chave em vez de
    // deixar o diretor olhando um retângulo cinza. Uma vez só: sem a trava, um
    // provedor fora do ar dispara isto a cada tile e o mapa fica trocando de
    // estilo em laço.
    map.on("error", (e) => {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[MapCanvas]", e.error?.message ?? e);
      }

      const escolhido = resolverBasemap(basemap);
      if (avisouRef.current || escolhido.id === resolverBasemap(null).id) return;

      const ehTile = String(e.error?.message ?? "")
        .toLowerCase()
        .match(/tile|fetch|network|403|404|429/);
      if (!ehTile) return;

      avisouRef.current = true;
      estiloAtualRef.current = null;
      map.setStyle(resolverBasemap(null).estilo(resolverTema()), { diff: false });
      onFundoIndisponivel?.(escolhido.nomeChave);
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

    const alvo = `${resolverBasemap(basemap).id}:${tema}`;
    if (estiloAtualRef.current === alvo) return;
    estiloAtualRef.current = alvo;

    const redesenhar = () => {
      map.off("styledata", redesenhar);
      onReadyRef.current?.(map);
    };
    map.on("styledata", redesenhar);
    map.setStyle(resolverBasemap(basemap).estilo(tema), { diff: false });

    return () => {
      map.off("styledata", redesenhar);
    };
  }, [tema, basemap]);

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
