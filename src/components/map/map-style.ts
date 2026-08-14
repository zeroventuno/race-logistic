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

/**
 * SOBRE A PALETA DO HANDOFF.
 *
 * O handoff de design especifica onze tokens de basemap (`--fr-map-bg`,
 * `--fr-map-water`, `--fr-map-motor`…) e pede um estilo VETORIAL que os
 * respeite. Não dá para cumprir isso com estes dois estilos: tile raster é
 * imagem pronta, e as cores dela já vieram assadas do servidor da CARTO.
 *
 * A alternativa seria um estilo vetorial, e todo provedor gratuito de tile
 * vetorial exige chave de API. Uma chave é uma cota que estoura, uma conta que
 * expira e um serviço que pode cair — no dia do evento, num trailer, com 4G.
 * A CARTO raster não pede nada e continua desenhando.
 *
 * Então o acordo é: o basemap fica APROXIMADO (o `light_all` e o `dark_all`
 * são muito próximos da paleta pedida), e tudo que é NOSSO em cima dele —
 * rota, marcador, alerta — segue o token ao pé da letra. Se um dia entrar
 * orçamento para tile vetorial, é aqui que ele entra, e só aqui.
 */

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
