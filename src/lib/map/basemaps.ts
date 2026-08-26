import type { StyleSpecification } from "maplibre-gl";

import type { TranslationKey } from "@/lib/i18n/translate";

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
  /**
   * Nome curto e descrição, como CHAVES de tradução — não como texto.
   *
   * O catálogo é lido do servidor e do cliente, e é a mesma lista para as seis
   * línguas. Guardar a frase aqui obrigaria a duplicar o catálogo inteiro por
   * idioma; guardar a chave deixa o dicionário fazer o trabalho dele.
   */
  nomeChave: TranslationKey;
  /** O que este fundo mostra que os outros não mostram. */
  descricaoChave: TranslationKey;
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
  /**
   * Constrói o estilo do MapLibre.
   *
   * Devolve URL ou objeto: os fundos vetoriais do MapTiler já vêm com glyphs
   * e sprites no `style.json` deles, e reconstruí-los aqui seria manter uma
   * cópia do estilo de outra pessoa. Os raster continuam sendo objeto, porque
   * ali o estilo é nosso mesmo — uma fonte e duas camadas.
   */
  estilo: (tema: "light" | "dark") => StyleSpecification | string;
}

/**
 * A chave do MapTiler.
 *
 * `NEXT_PUBLIC_` porque ela é usada no navegador — não há como escondê-la, é
 * da natureza de tile servido direto ao cliente. A proteção não é sigilo, é
 * RESTRIÇÃO POR DOMÍNIO no painel do provedor: sem isso, qualquer um copia a
 * chave do código-fonte e gasta a cota alheia.
 *
 * Sem chave configurada, os fundos que dependem dela somem da lista em vez de
 * quebrar. É o caso do ambiente de quem clona o repositório e roda local.
 */
const CHAVE_MAPTILER = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";

function estiloMapTiler(id: string): string {
  return `https://api.maptiler.com/maps/${id}/style.json?key=${CHAVE_MAPTILER}`;
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

/**
 * Fundo sem tile nenhum: só a cor do papel.
 *
 * É o último recurso, para o ambiente que não tem chave — quem clonou o
 * repositório, uma pré-visualização de branch, um deploy onde a variável
 * ficou de fora.
 *
 * A alternativa seria seguir puxando tiles gratuitas de terceiro sem
 * cadastro, e foi o que este arquivo fazia até descobrirmos o custo: as tiles
 * do CARTO continuam respondendo 200, mas agora vêm com "API KEY REQUIRED"
 * IMPRESSO NA IMAGEM. Não é falha que dê erro em lugar nenhum — é a marca de
 * quem está usando o serviço fora dos termos, carimbada por cima do percurso,
 * na tela que o organizador mostra para a prefeitura.
 *
 * Mapa cinza com o traçado por cima é uma degradação que se explica. Pedido
 * de pagamento de outra empresa atravessado no material do cliente, não.
 */
function fundoLiso(tema: "light" | "dark"): StyleSpecification {
  return {
    version: 8,
    sources: {},
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": tema === "light" ? "#efede7" : "#0a0d10" },
      },
    ],
  };
}

export const BASEMAPS: Record<BasemapId, Basemap> = {
  asfalto: {
    id: "asfalto",
    nomeChave: "map.basemapAsphalt",
    descricaoChave: "map.basemapAsphaltHint",
    disponivel: true,
    licenca:
      "MapTiler, estilos `positron` e `darkmatter` — a mesma cartografia clara e neutra que este produto usa desde o começo, agora pelo provedor que já atende o resto do catálogo. Era CARTO sem cadastro, e eles passaram a carimbar \"API KEY REQUIRED\" na própria imagem da tile.",
    // Continua sendo o padrão e por isso NÃO exige chave para aparecer na
    // lista: sem chave ele cai para fundo liso, que é degradação explicável.
    exigeChave: false,
    rota: {
      // Azul fechado sobre papel claro; contorno branco para a linha não sumir
      // quando cruza uma rodovia igualmente clara.
      light: { linha: "#1f6fb2", casing: "rgb(255 255 255 / 0.85)" },
      dark: { linha: "#78bef0", casing: "rgb(10 13 16 / 0.6)" },
    },
    estilo: (tema) =>
      CHAVE_MAPTILER
        ? estiloMapTiler(tema === "light" ? "positron" : "darkmatter")
        : fundoLiso(tema),
  },

  topografico: {
    id: "topografico",
    nomeChave: "map.basemapTopo",
    descricaoChave: "map.basemapTopoHint",
    disponivel: true,
    licenca:
      "MapTiler, estilos `topo-v2` e `topo-v2-dark`. Mesma ressalva do satélite: grátis só para teste e uso não comercial, Flex a partir do primeiro cliente pagante. O Thunderforest (OpenCycleMap) desenha melhor o gradiente de subida e custa cerca de quatro vezes mais — fica para quando um cliente pedir.",
    exigeChave: true,
    rota: {
      // MAGENTA, e não o rouge que eu tinha posto antes.
      //
      // O rouge seria bonito sobre bege e é exatamente o erro que a regra da
      // casa existe para impedir: dentro da operação vermelho é uma pessoa no
      // chão. Uma linha vermelha atravessando o mapa inteiro, o dia inteiro,
      // ensina o olho a ignorar vermelho — e o alerta que importa chega numa
      // tela onde vermelho já é paisagem.
      //
      // Magenta resolve os dois lados: é a convenção de traçado sobre mapa de
      // relevo (é o que Komoot e Strava usam, então o ciclista já lê assim) e
      // é a única faixa do espectro que um mapa topográfico não usa — ele é
      // todo bege, verde e marrom.
      light: { linha: "#c026d3", casing: "rgb(255 255 255 / 0.9)" },
      dark: { linha: "#f0abfc", casing: "rgb(10 13 16 / 0.7)" },
    },
    // TOPO, NÃO OUTDOOR — e a diferença é de ruído, não de estilo.
    //
    // O `outdoor-v2` parecia a escolha óbvia (é o mapa "de esporte ao ar
    // livre" deles) e traz uma fonte inteira de TRILHAS: vinte camadas de
    // rota de caminhada e cicloturismo, cada uma na sua cor, riscando o
    // terreno de vermelho e laranja. Num mapa de passeio isso é o conteúdo;
    // aqui é ruído que disputa com a única linha que importa, que é o
    // percurso da prova.
    //
    // O `topo-v2` tem o mesmo relevo — curva de nível, sombreamento, cota de
    // pico — e nenhuma dessas camadas. Sobram só os caminhos de verdade,
    // vindos da malha viária.
    estilo: (tema) =>
      estiloMapTiler(tema === "light" ? "topo-v2" : "topo-v2-dark"),
  },
  satelite: {
    id: "satelite",
    nomeChave: "map.basemapSatellite",
    descricaoChave: "map.basemapSatelliteHint",
    disponivel: true,
    licenca:
      "MapTiler, estilo `satellite`. O plano grátis deles cobre teste e uso NÃO COMERCIAL; no primeiro cliente pagante é preciso subir para o Flex. Sem isso o serviço pausa ao bater a cota — e aí o mapa cai para o asfalto sozinho, que é comportamento desenhado, não acidente.",
    exigeChave: true,
    rota: {
      // Sobre foto aérea o azul some no telhado e no asfalto. Só cor quente
      // com contorno preto sobrevive — é a mesma razão por que traçado de
      // percurso em foto de prova é sempre laranja.
      //
      // O laranja fica perto do âmbar de "dado incerto", e isso é aceitável
      // aqui porque as duas coisas têm FORMAS diferentes na tela: a rota é uma
      // linha fina contínua, o aviso é um disco com pictograma. Confusão de
      // cor entre formas distintas o olho resolve; entre formas iguais, não.
      light: { linha: "#ff8a00", casing: "rgb(0 0 0 / 0.72)" },
      dark: { linha: "#ffa726", casing: "rgb(0 0 0 / 0.8)" },
    },
    // Sem variante escura: foto aérea é o que é. Trocar o tema muda os
    // cartões e a cor da rota, não a imagem do chão.
    estilo: () => estiloMapTiler("satellite"),
  },
};

/** O fundo que vale quando nada foi escolhido, ou quando o escolhido caiu. */
export const BASEMAP_PADRAO: BasemapId = "asfalto";

/**
 * Um fundo é utilizável se a licença foi resolvida E a chave existe.
 *
 * As duas condições são independentes e falham em lugares diferentes:
 * `disponivel` é decisão de negócio, tomada no código; a chave é ambiente, e
 * falta em quem clonou o repositório, em pré-visualização de branch e em
 * qualquer deploy onde alguém esqueceu a variável. Um fundo que exige chave
 * ausente não pode aparecer na lista — ele renderizaria um mapa cinza sem
 * explicar por quê.
 */
export function basemapUtilizavel(b: Basemap): boolean {
  if (!b.disponivel) return false;
  if (b.exigeChave && !CHAVE_MAPTILER) return false;
  return true;
}

/** Os que podem ser oferecidos hoje, neste ambiente. */
export function basemapsDisponiveis(): Basemap[] {
  return Object.values(BASEMAPS).filter(basemapUtilizavel);
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
  if (achado && basemapUtilizavel(achado)) return achado;
  return BASEMAPS[BASEMAP_PADRAO];
}
