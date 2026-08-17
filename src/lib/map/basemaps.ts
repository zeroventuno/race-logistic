import type { StyleSpecification } from "maplibre-gl";

/**
 * O catálogo de mapas de fundo.
 *
 * UMA LISTA CURADA, NUNCA UMA URL LIVRE. O que o cliente escolhe é um
 * identificador daqui; a URL do tile, a atribuição e as cores da rota vêm
 * junto. Deixar o cliente colar um endereço de tile pareceria mais flexível e
 * seria pior em três frentes: qualquer servidor passaria a receber a posição
 * dos veículos pelo referer, ninguém garantiria contraste da rota sobre o
 * fundo escolhido, e a atribuição legal do provedor sumiria.
 *
 * CADA FUNDO CARREGA AS CORES DA PRÓPRIA ROTA. Este é o ponto que faz a
 * escolha ser segura: a linha do percurso é a única coisa no mapa que é nossa,
 * e ela precisa sobreviver ao fundo. Azul-escuro sobre satélite noturno
 * desaparece; branco sobre asfalto claro desaparece. Então a cor da rota não é
 * global — é propriedade do fundo, calibrada para ele.
 *
 * SOBRE LICENÇA — leia antes de acrescentar um item.
 *
 * Tile "gratuito" quase nunca quer dizer "livre para produto comercial". Os
 * tiles padrão do OpenStreetMap, por exemplo, são custeados por doação e a
 * política de uso deles pede explicitamente que produtos não os consumam em
 * escala. Um provedor de satélite ou topográfico costuma separar uso pessoal
 * de uso comercial, e a diferença é contrato, não configuração.
 *
 * Por isso todo item tem `licenca`, e itens sem licença verificada nascem com
 * `disponivel: false` — aparecem no código, não na tela. Ligar um deles é uma
 * decisão de negócio (checar os termos, eventualmente assinar), não uma
 * mudança de front-end.
 */

export type BasemapId = "asfalto" | "satelite" | "topografico";

export interface Basemap {
  id: BasemapId;
  /** Nome curto, como aparece para quem escolhe. */
  nome: string;
  /** O que este fundo mostra que os outros não mostram. */
  descricao: string;
  /**
   * Falso enquanto a licença comercial não estiver verificada.
   *
   * O item continua no catálogo — some da interface. É deliberado: apagar o
   * código faz a próxima pessoa reescrever a mesma pesquisa do zero.
   */
  disponivel: boolean;
  /** O que precisa ser checado, ou o que já foi. */
  licenca: string;
  /** Precisa de chave do cliente (BYOK). Nenhum dos ligados hoje precisa. */
  exigeChave: boolean;
  /**
   * Cores da rota sobre este fundo, por tema.
   *
   * `casing` é o contorno; ele existe para a rota não sumir quando cruza uma
   * via da mesma largura, e é sempre o oposto do fundo.
   */
  rota: {
    light: { linha: string; casing: string };
    dark: { linha: string; casing: string };
  };
  /** Constrói o estilo do MapLibre. `chave` só é usada por quem exige. */
  estilo: (tema: "light" | "dark", chave?: string) => StyleSpecification;
}

const ATRIBUICAO_OSM =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** Estilo raster de três subdomínios, que é o formato de quase todo provedor. */
function raster(
  tiles: string[],
  fundo: string,
  attribution: string,
  maxzoom = 19,
): StyleSpecification {
  return {
    version: 8,
    sources: {
      basemap: { type: "raster", tiles, tileSize: 256, maxzoom, attribution },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": fundo } },
      { id: "basemap", type: "raster", source: "basemap" },
    ],
  };
}

export const BASEMAPS: Record<BasemapId, Basemap> = {
  asfalto: {
    id: "asfalto",
    nome: "Asfalto",
    descricao:
      "Traçado limpo, sem relevo. É o que menos disputa atenção com os veículos — a escolha certa para prova urbana e para tela projetada na sala de direção.",
    disponivel: true,
    licenca:
      "CARTO basemaps sobre dados do OpenStreetMap, com atribuição obrigatória (já embutida no estilo). É o fundo que este produto usa desde o começo.",
    exigeChave: false,
    rota: {
      // Azul fechado sobre papel claro; contorno branco para a linha não sumir
      // quando cruza uma rodovia igualmente clara.
      light: { linha: "#1f6fb2", casing: "rgb(255 255 255 / 0.85)" },
      dark: { linha: "#78bef0", casing: "rgb(10 13 16 / 0.6)" },
    },
    estilo: (tema) =>
      tema === "light"
        ? raster(
            [
              "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
              "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
              "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
            ],
            "#efede7",
            `${ATRIBUICAO_OSM} · © <a href="https://carto.com/attributions">CARTO</a>`,
          )
        : raster(
            [
              "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
            ],
            "#0a0d10",
            `${ATRIBUICAO_OSM} · © <a href="https://carto.com/attributions">CARTO</a>`,
          ),
  },

  satelite: {
    id: "satelite",
    nome: "Satélite",
    descricao:
      "Imagem aérea. Serve para conferir se a estrada do GPX é mesmo a estrada da prova, e para reconhecer um ponto de apoio pelo que existe no chão.",
    disponivel: false,
    licenca:
      "PENDENTE. Imagem de satélite quase nunca é livre para produto comercial — Esri, Mapbox e Google licenciam por contrato e por volume. Antes de ligar: escolher o provedor, ler os termos de uso comercial e decidir quem paga (nós ou o cliente, via chave própria).",
    exigeChave: true,
    rota: {
      // Sobre foto aérea o azul some no telhado e no asfalto. Só cor quente
      // com contorno preto sobrevive — é a mesma razão por que traçado de
      // percurso em foto de prova é sempre laranja ou amarelo.
      light: { linha: "#ff8a00", casing: "rgb(0 0 0 / 0.72)" },
      dark: { linha: "#ffa726", casing: "rgb(0 0 0 / 0.8)" },
    },
    estilo: () => {
      throw new Error(
        "Satélite ainda não tem provedor definido. Ver `licenca` em BASEMAPS.satelite.",
      );
    },
  },

  topografico: {
    id: "topografico",
    nome: "Topográfico",
    descricao:
      "Curva de nível, inclinação e estrada vicinal. É o único fundo que mostra a subida antes de ela acontecer — para prova de montanha, é o que muda a conversa no rádio.",
    disponivel: false,
    licenca:
      "PENDENTE. OpenTopoMap é comunitário e a política de uso pede que produtos não consumam em escala. Thunderforest (Outdoors/Landscape) é a alternativa desenhada para ciclismo e cobra por chave. Institutos nacionais (IGN, Swisstopo) são melhores nos Alpes e têm termos próprios por país.",
    exigeChave: true,
    rota: {
      // Fundo topográfico já é bege e verde com muitas linhas finas; o rouge
      // é a única faixa do espectro que não está sendo usada pelo relevo.
      light: { linha: "#d92d20", casing: "rgb(255 255 255 / 0.9)" },
      dark: { linha: "#ff6b5c", casing: "rgb(10 13 16 / 0.7)" },
    },
    estilo: () => {
      throw new Error(
        "Topográfico ainda não tem provedor definido. Ver `licenca` em BASEMAPS.topografico.",
      );
    },
  },
};

/** O fundo que vale quando nada foi escolhido, ou quando o escolhido caiu. */
export const BASEMAP_PADRAO: BasemapId = "asfalto";

/** Os que podem ser oferecidos hoje. */
export function basemapsDisponiveis(): Basemap[] {
  return Object.values(BASEMAPS).filter((b) => b.disponivel);
}

/**
 * Resolve o identificador guardado no banco.
 *
 * Nunca lança e nunca devolve indisponível. Um valor desconhecido pode chegar
 * de uma prova criada quando o catálogo era outro, ou de um item que foi
 * desligado por questão de licença — e nenhum dos dois pode deixar a direção
 * sem mapa no dia do evento. Cai no padrão, calado.
 */
export function resolverBasemap(id: string | null | undefined): Basemap {
  const achado = id ? BASEMAPS[id as BasemapId] : undefined;
  if (achado?.disponivel) return achado;
  return BASEMAPS[BASEMAP_PADRAO];
}
