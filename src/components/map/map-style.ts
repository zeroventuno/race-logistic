import type { StyleSpecification } from "maplibre-gl";

/**
 * Estilo base do mapa.
 *
 * Tiles raster da CARTO (dark matter), sem chave de API. A escolha é
 * deliberada em três frentes:
 *
 *  - SEM TOKEN. Nada de Mapbox/Google: o sistema tem que subir e funcionar sem
 *    ninguém criar conta em lugar nenhum, e sem uma cota que estoura no meio
 *    de uma prova.
 *
 *  - FUNDO ESCURO. O mapa é o plano de fundo de marcadores coloridos. Um
 *    basemap claro e saturado compete com eles; um escuro e dessaturado deixa
 *    os veículos serem a única coisa brilhante na tela.
 *
 *  - RASTER, NÃO VETORIAL. Vetorial seria mais bonito, mas depende de um
 *    serviço de estilo que exige chave. Raster é mais burro e mais robusto.
 *
 * A atribuição é obrigatória pelos termos da OSM e da CARTO, e está no estilo
 * — não em algum canto do JSX que alguém pode remover sem perceber.
 */
export const DARK_BASEMAP: StyleSpecification = {
  version: 8,
  sources: {
    basemap: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#0a0c10" },
    },
    {
      id: "basemap",
      type: "raster",
      source: "basemap",
      paint: {
        // Escurece e dessatura ainda mais: o basemap é contexto, não conteúdo.
        "raster-brightness-max": 0.82,
        "raster-saturation": -0.25,
        "raster-contrast": 0.05,
      },
    },
  ],
};

/** Variante clara, para quando o mapa é impresso ou visto sob sol direto. */
export const LIGHT_BASEMAP: StyleSpecification = {
  version: 8,
  sources: {
    basemap: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#f2f4f7" },
    },
    { id: "basemap", type: "raster", source: "basemap" },
  ],
};
