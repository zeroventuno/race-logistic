#!/usr/bin/env node
/**
 * Comboio sintético para o painel.
 *
 * O `package.json` já chamava `npm run sim` desde o começo; o arquivo é que
 * nunca existiu. Ele existe agora pelo motivo mais concreto possível: não dá
 * para fotografar o produto funcionando sem colocar carros na estrada, e
 * colocar carros na estrada exigia uma prova real com celulares reais. Um
 * painel sem veículos vivos mostra "SEM DADOS · 0 m" — que é a única coisa que
 * o produto não pode parecer.
 *
 * O QUE ELE NÃO É. Não é mock e não é seed. Ele fala com a MESMA API do
 * motorista, pelo mesmo caminho de rede, com os mesmos tokens de sessão. O
 * servidor não sabe que do outro lado não tem ninguém dirigindo — faz o snap
 * sobre o traçado indexado, calcula a velocidade média, avança
 * `position_state`. O que aparece na tela é o sistema de verdade rodando, só
 * que sobre pings fabricados.
 *
 * O MODELO DE MOVIMENTO É UMA LINHA SÓ: todo mundo anda na mesma velocidade e
 * larga em horários diferentes. Parece simplório e é exatamente o que a janela
 * mede — se a abertura largou às 10h00 e o fechamento às 10h45, a janela é 45
 * min em qualquer ponto do percurso, o dia inteiro, sem eu precisar forçar
 * nada. E ela sai MEDIDA e não projetada, porque a abertura de fato passou
 * pelo ponto onde o fechamento está agora, e o histórico está gravado.
 *
 * USO
 *   npm run sim                    -- comboio parado no tempo, some em 90 s
 *   npm run sim -- --stream        -- continua transmitindo até Ctrl+C
 *   npm run sim -- --dry           -- só imprime onde cada carro cairia
 *   npm run sim -- --ordem=papel   -- ignora a lista e espalha por função
 *   npm run sim -- --limpar        -- APAGA os pings da prova antes de semear
 *
 * POR QUE O --limpar EXISTE. Rodar o simulador duas vezes na mesma prova
 * teleporta a abertura de volta ao ponto inicial, e o histórico dela passa a
 * conter várias passagens pelo mesmo quilômetro. A janela MEDIDA é a diferença
 * de horário entre as passagens dos dois veículos pelo mesmo ponto — com
 * passagens repetidas ela encontra a errada e infla, e o pulo para trás ainda
 * envenena a média móvel de velocidade. O resultado é uma tela coerente consigo
 * mesma em tudo, menos na divisão: "59 min para 28,5 km" ao lado de "57 km/h".
 * Semear por cima de dado semeado não é acumular histórico, é corromper.
 *
 * Para a captura de tela é o `--stream` que interessa: sem ele os veículos
 * envelhecem e o painel volta a pintar tudo de vermelho.
 */

import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

dotenv.config({ path: join(ROOT, ".env.local"), quiet: true });

// ---------------------------------------------------------------- argumentos

function arg(nome, padrao) {
  const achado = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return achado ? achado.slice(nome.length + 3) : padrao;
}

const OPCOES = {
  base: arg("base", "http://localhost:3000").replace(/\/$/, ""),
  prova: arg("race", null),
  /**
   * Velocidade do comboio, km/h.
   *
   * QUEM DITA O RITMO É QUEM PEDALA. O comboio não pode andar mais rápido que
   * a prova — o carro de fechamento anda atrás do último atleta, e o último
   * atleta de uma prova de participação não faz 38 km/h. 28 é o ritmo de um
   * L'Etape; 38 era ritmo de pelotão profissional e deixava a simulação
   * bonita e falsa ao mesmo tempo.
   */
  velocidadeKmh: Number(arg("speed", "28")),
  /** Onde a abertura está, como fração do percurso. */
  fracao: Number(arg("at", "0.62")),
  /** Intervalo entre pings do rastro histórico, em segundos. */
  passoS: Number(arg("step", "20")),
  stream: process.argv.includes("--stream"),
  /** Só mostra onde cada veículo cairia. Não vincula, não grava. */
  dry: process.argv.includes("--dry"),
  /** "cadastro" segue a lista do diretor; "papel" usa as faixas por função. */
  ordem: arg("ordem", "cadastro"),
  /** Apaga os pings anteriores da prova antes de semear. Ver AVISO abaixo. */
  limpar: process.argv.includes("--limpar"),
};

/**
 * Teto de pings por veículo no rastro histórico.
 *
 * Cada ping custa um snap no servidor. 200 cobre 66 min a 20 s de passo, que é
 * mais que a janela de qualquer prova — e o que sustenta a janela é o rastro
 * da abertura cobrir o ponto onde o fechamento está, não o percurso inteiro.
 */
const MAX_RASTRO = 200;

/** O lote da API para em 500. 400 deixa margem e ainda é uma viagem só. */
const LOTE = 400;

// ------------------------------------------------------------------ geometria

const R_TERRA = 6_371_000;

function haversine(a, b) {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const la1 = (lat1 * Math.PI) / 180;
  const la2 = (lat2 * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R_TERRA * Math.asin(Math.sqrt(h));
}

/**
 * Índice de distância acumulada sobre os pontos de desenho.
 *
 * O traçado de desenho é decimado — não é o índice fino que o servidor usa
 * para o snap. Não faz mal: ele serve para SEMEAR uma coordenada plausível, e
 * quem decide o quilômetro oficial é o snap do servidor, sobre o traçado real.
 */
function indexar(pontos) {
  const acumulado = [0];
  for (let i = 1; i < pontos.length; i++) {
    acumulado.push(acumulado[i - 1] + haversine(pontos[i - 1], pontos[i]));
  }
  return { pontos, acumulado, total: acumulado[acumulado.length - 1] };
}

/** Coordenada e rumo a `metros` do início, interpolando entre dois vértices. */
function em(indice, metros) {
  const { pontos, acumulado, total } = indice;
  const d = Math.max(0, Math.min(metros, total));

  let hi = 1;
  while (hi < acumulado.length - 1 && acumulado[hi] < d) hi++;
  const lo = hi - 1;

  const trecho = acumulado[hi] - acumulado[lo] || 1;
  const t = (d - acumulado[lo]) / trecho;

  const [lng1, lat1] = pontos[lo];
  const [lng2, lat2] = pontos[hi];

  return {
    lng: lng1 + (lng2 - lng1) * t,
    lat: lat1 + (lat2 - lat1) * t,
    // Rumo geográfico: 0 = norte, crescendo para leste.
    rumo:
      (((Math.atan2(lng2 - lng1, lat2 - lat1) * 180) / Math.PI) % 360 + 360) % 360,
  };
}

// ---------------------------------------------------------------------- banco

async function carregar() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não está definida em .env.local — é a mesma que o db:migrate usa.",
    );
  }

  const cliente = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30_000,
  });
  await cliente.connect();

  try {
    const filtro = OPCOES.prova
      ? { texto: "and (r.id::text = $1 or r.name ilike '%' || $1 || '%')", valores: [OPCOES.prova] }
      : { texto: "", valores: [] };

    const { rows: provas } = await cliente.query(
      `select r.id, r.name, r.status, r.target_gap_minutes, r.timezone
         from public.races r
        where r.status <> 'archived' ${filtro.texto}
        order by r.created_at desc
        limit 1`,
      filtro.valores,
    );

    const prova = provas[0];
    if (!prova) throw new Error("nenhuma prova encontrada (arquivadas são ignoradas).");

    const { rows: posicoes } = await cliente.query(
      `select id, label, role, ordinal, bind_code,
              is_reference_lead, is_reference_sweep
         from public.race_positions
        where race_id = $1
          and bind_code_revoked_at is null
        order by ordinal`,
      [prova.id],
    );

    const { rows: tracos } = await cliente.query(
      `select total_distance_m, render_points
         from public.route_tracks
        where race_id = $1 and is_active = true
        limit 1`,
      [prova.id],
    );

    const traco = tracos[0];
    if (!traco) throw new Error(`a prova "${prova.name}" não tem percurso ativo.`);

    return { prova, posicoes, traco };
  } finally {
    await cliente.end();
  }
}

// ------------------------------------------------------------------------ API

async function postar(caminho, corpo, token) {
  const resposta = await fetch(`${OPCOES.base}${caminho}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(corpo),
  });

  const texto = await resposta.text();
  let dados = null;
  try {
    dados = JSON.parse(texto);
  } catch {
    // Resposta não-JSON quase sempre é o Next devolvendo uma página de erro:
    // o começo do corpo diz mais que "unexpected token <".
    throw new Error(`${resposta.status} em ${caminho}: ${texto.slice(0, 120)}`);
  }

  if (!resposta.ok) {
    throw new Error(`${resposta.status} em ${caminho}: ${dados?.message ?? texto.slice(0, 120)}`);
  }

  return dados;
}

// ----------------------------------------------------------------- simulação

/**
 * Monta o rastro de um veículo terminando AGORA na posição pedida.
 *
 * Anda para trás no tempo a partir de `offsetFinalM`, um passo de cada vez.
 * Parar em offset 0 é o que impede o veículo de "nascer" antes da largada e
 * receber offsets negativos, que o snap trataria como fora de percurso.
 */
function rastro(indice, offsetFinalM, vMps, agoraMs) {
  const pings = [];
  const passoM = vMps * OPCOES.passoS;

  for (let i = 0; i < MAX_RASTRO; i++) {
    const offset = offsetFinalM - i * passoM;
    if (offset < 0) break;

    const p = em(indice, offset);
    const emMs = agoraMs - i * OPCOES.passoS * 1000;

    pings.push({
      clientPingId: randomUUID(),
      // A sequência é reatribuída depois, em ordem cronológica.
      clientSeq: 0,
      // Ruído de ~2 m. Sem ele o rastro é uma linha geométrica perfeita, e a
      // velocidade média sai com uma constância que GPS nenhum entrega.
      lat: p.lat + (Math.random() - 0.5) * 0.00002,
      lng: p.lng + (Math.random() - 0.5) * 0.00002,
      accuracyM: 4 + Math.random() * 6,
      altitudeM: null,
      speedMps: vMps * (0.9 + Math.random() * 0.2),
      headingDeg: p.rumo,
      recordedAt: new Date(emMs).toISOString(),
      batteryPct: null,
      queuedOffline: false,
    });
  }

  // Do mais antigo para o mais novo, com a sequência acompanhando.
  pings.reverse();
  pings.forEach((ping, i) => {
    ping.clientSeq = i + 1;
  });

  return pings;
}

async function enviar(token, pings) {
  for (let i = 0; i < pings.length; i += LOTE) {
    const lote = pings.slice(i, i + LOTE);
    const r = await postar("/api/driver/ping", { pings: lote }, token);
    if (r.rejected?.length) {
      console.log(`      ${r.rejected.length} rejeitado(s): ${r.rejected[0].reason}`);
    }
  }
}

/**
 * FAIXA que cada papel ocupa no comboio, como fração da janela.
 *
 * 0 é a abertura, 1 é o fechamento. As faixas se SOBREPÕEM de propósito: num
 * comboio de verdade não existe "o bloco das ambulâncias" seguido do "bloco dos
 * mecânicos" — a ambulância da prova anda colada no pelotão, o mecânico neutro
 * vem na caravana logo atrás, e a segunda ambulância fica lá no fim cobrindo
 * quem foi cortado. Agrupar por papel produzia quatro motos no mesmo pixel e
 * cinco veículos empilhados entre o km 53 e o 55, que é exatamente o que não
 * se parece com uma prova.
 */
const FAIXA_POR_PAPEL = {
  // 1.0 é o fechamento. Passar de 1.0 é ficar ATRÁS dele — e isso é normal.
  //
  // O carro de fechamento não é o último veículo da prova: ele é o limite do
  // CONTROLE DE VIA. Depois que ele passa a rua reabre, e a prova continua
  // atrás dele com os ciclistas lentos, que são justamente os que mais
  // precisam de apoio. Por isso motos, mecânicos e ambulâncias existem dos
  // dois lados, e a vassoura fecha tudo lá atrás recolhendo quem abandonou.
  moto: [0.06, 1.35],
  ambulance: [0.3, 1.55],
  mechanic: [0.4, 1.45],
  support_car: [0.45, 1.3],
  // Fiscal é ponto fixo, dentro do trecho interditado.
  marshal: [0.15, 0.85],
  // Último de tudo, atrás do último atleta, com a via já reaberta.
  broom_wagon: [1.85, 1.95],
  other: [0.55, 1.2],
};

/** Ruído estável por veículo: mesma entrada, mesmo resultado entre execuções. */
function embaralhar(n) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Distribui o comboio entre a abertura e o fechamento.
 *
 * A abertura larga em 0 e o fechamento exatamente uma janela depois — esses
 * dois são o contrato que o painel mede, e por isso andam na velocidade nominal
 * cravada. O resto ganha uma variação de ±1,5%, que é o que faz a formação
 * respirar: sem ela o comboio inteiro anda como um trem rígido e a tela fica
 * igual em qualquer instante.
 */
/**
 * Distribui seguindo a ORDEM CADASTRADA, e não o palpite por papel.
 *
 * `ordinal` é ordem de exibição — o próprio produto diz isso ao diretor ("a
 * ordem da lista é a ordem em que elas aparecem no painel ao vivo"), e a
 * posição física de verdade vem do GPS, com aba própria. Só que para uma foto
 * do sistema é a lista que o diretor montou que representa o comboio que ele
 * tem na cabeça, então é ela que vira geografia aqui.
 *
 * A régua é linear entre abertura e fechamento: quem está antes da abertura na
 * lista sai NA FRENTE dela (atraso negativo), e quem está depois do fechamento
 * fica ATRÁS dele. Nenhum dos dois casos é erro — moto de reconhecimento anda
 * à frente da abertura o tempo todo.
 */
function planejarPelaOrdem(posicoes, janelaS) {
  const iAbertura = posicoes.findIndex(
    (p) => p.is_reference_lead || p.role === "lead_car",
  );
  const iFechamento = posicoes.findIndex(
    (p) => p.is_reference_sweep || p.role === "sweep_car",
  );

  // Sem os dois extremos não há régua: cai no modelo por papel.
  if (iAbertura < 0 || iFechamento < 0 || iFechamento === iAbertura) return null;

  const vao = iFechamento - iAbertura;
  const plano = new Map();

  posicoes.forEach((pos, i) => {
    const ehExtremo =
      i === iAbertura || i === iFechamento;

    // O empurrão quebra o espaçamento de régua sem trocar ninguém de lugar:
    // é menor que um terço do passo, então a ordem cadastrada é preservada.
    const empurrao = ehExtremo ? 0 : (embaralhar(pos.ordinal * 13) - 0.5) * 0.28;
    const passo = (i - iAbertura + empurrao) / vao;

    plano.set(pos.id, {
      atrasoS: janelaS * passo,
      // Abertura e fechamento andam na velocidade nominal cravada: são o par
      // que o painel mede, e a janela tem que continuar exata.
      fator: ehExtremo ? 1 : 0.985 + embaralhar(pos.ordinal * 31) * 0.03,
    });
  });

  return plano;
}

function planejarComboio(posicoes, janelaS) {
  const porPapel = new Map();
  for (const pos of posicoes) {
    if (pos.is_reference_lead || pos.role === "lead_car") continue;
    if (pos.is_reference_sweep || pos.role === "sweep_car") continue;
    if (!porPapel.has(pos.role)) porPapel.set(pos.role, []);
    porPapel.get(pos.role).push(pos);
  }

  const plano = new Map();

  for (const pos of posicoes) {
    if (pos.is_reference_lead || pos.role === "lead_car") {
      plano.set(pos.id, { atrasoS: 0, fator: 1 });
      continue;
    }
    if (pos.is_reference_sweep || pos.role === "sweep_car") {
      plano.set(pos.id, { atrasoS: janelaS, fator: 1 });
      continue;
    }

    const irmaos = porPapel.get(pos.role) ?? [pos];
    const k = irmaos.findIndex((o) => o.id === pos.id);
    const [inicio, fim] = FAIXA_POR_PAPEL[pos.role] ?? FAIXA_POR_PAPEL.other;

    // Um veículo sozinho no papel não vai para a ponta da faixa: 0.4 o coloca
    // onde ele de fato roda, e não na fronteira arbitrária do intervalo.
    const t = irmaos.length === 1 ? 0.4 : k / (irmaos.length - 1);

    // O empurrão quebra a régua perfeita — três ambulâncias equidistantes
    // denunciam a simulação tanto quanto três ambulâncias no mesmo ponto.
    const empurrao = (embaralhar(pos.ordinal * 7 + k) - 0.5) * 0.08;
    const fracao = Math.max(0.04, inicio + (fim - inicio) * t + empurrao);

    plano.set(pos.id, {
      atrasoS: janelaS * fracao,
      fator: 0.985 + embaralhar(pos.ordinal * 31) * 0.03,
    });
  }

  return plano;
}

/**
 * Zera o histórico sintético de uma prova.
 *
 * Só toca em `location_pings` e `position_state`: são as duas tabelas que o
 * simulador escreve. Cadastro, códigos e percurso ficam intactos, porque o que
 * se quer é uma prova limpa para semear de novo, não uma prova desmontada.
 */
async function limparPings(raceId) {
  const cliente = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30_000,
  });
  await cliente.connect();
  try {
    const r = await cliente.query(
      "delete from public.location_pings where race_id = $1",
      [raceId],
    );
    await cliente.query("delete from public.position_state where race_id = $1", [
      raceId,
    ]);
    return r.rowCount ?? 0;
  } finally {
    await cliente.end();
  }
}

async function main() {
  console.log("");
  const { prova, posicoes, traco } = await carregar();

  const pontos = traco.render_points ?? [];
  if (pontos.length < 2) throw new Error("o percurso ativo não tem pontos de desenho.");

  const indice = indexar(pontos);
  const vMps = (OPCOES.velocidadeKmh * 1000) / 3600;
  const janelaS = (prova.target_gap_minutes || 45) * 60;
  const offsetAbertura = indice.total * Math.min(0.95, Math.max(0.05, OPCOES.fracao));

  console.log(`  Prova:     ${prova.name}  (${prova.status})`);
  console.log(`  Percurso:  ${(indice.total / 1000).toFixed(1)} km em ${pontos.length} pontos`);
  console.log(`  Comboio:   ${OPCOES.velocidadeKmh} km/h, janela alvo ${prova.target_gap_minutes} min`);
  console.log(`  Abertura:  km ${(offsetAbertura / 1000).toFixed(1)}`);
  console.log(`  Veículos:  ${posicoes.length}`);
  console.log("");

  // O enum é ('draft','armed','live','finished','archived') — "live" é o estado
  // iniciado. Comparar com "running" fazia o aviso disparar justamente quando a
  // prova estava certa, que é o pior momento para um alarme falso.
  if (prova.status !== "live") {
    console.log(`  ! A prova está em "${prova.status}". Os pings entram do mesmo jeito,`);
    console.log(`    mas o painel só mostra a janela com a prova iniciada.`);
    console.log("");
  }

  if (OPCOES.limpar) {
    const apagados = await limparPings(prova.id);
    console.log(`  Pings anteriores apagados: ${apagados}`);
    console.log("");
  }

  const plano =
    (OPCOES.ordem === "cadastro" ? planejarPelaOrdem(posicoes, janelaS) : null) ??
    planejarComboio(posicoes, janelaS);

  if (OPCOES.dry) {
    // Ensaio: a mesma conta do comboio real, impressa e sem tocar em nada.
    // Serve para conferir a distribuição antes de revogar sessão de ninguém.
    const linhas = posicoes
      .map((pos) => {
        const { atrasoS, fator } = plano.get(pos.id);
        return {
          label: pos.label,
          role: pos.role,
          km: (offsetAbertura - vMps * atrasoS) / 1000,
          atrasoMin: atrasoS / 60,
          kmh: OPCOES.velocidadeKmh * fator,
        };
      })
      .sort((a, b) => b.km - a.km);

    console.log("  ENSAIO — nada foi gravado.");
    console.log("");
    console.log("  km      atraso    km/h   veículo");
    for (const l of linhas) {
      console.log(
        `  ${l.km.toFixed(1).padStart(5)}   ${l.atrasoMin.toFixed(1).padStart(5)} min  ${l.kmh.toFixed(1)}   ${l.label}  (${l.role})`,
      );
    }
    console.log("");
    return;
  }

  const vivos = [];

  for (const posicao of posicoes) {
    const { atrasoS, fator } = plano.get(posicao.id);
    const vDele = vMps * fator;
    const offset = offsetAbertura - vMps * atrasoS;

    if (offset < 0) {
      console.log(`  · ${posicao.label}: largaria antes do km 0, pulando`);
      continue;
    }

    let vinculo;
    try {
      vinculo = await postar("/api/driver/bind", {
        code: posicao.bind_code,
        deviceLabel: `sim/${posicao.label}`,
      });
    } catch (erro) {
      console.log(`  · ${posicao.label}: vínculo recusado — ${erro.message}`);
      continue;
    }

    // O RELÓGIO É POR VEÍCULO, e não um `agoraMs` comum tirado antes do laço.
    // Vincular e semear doze veículos leva quase um minuto; com um instante
    // compartilhado, o último rastro terminava um minuto no passado e o
    // primeiro ping ao vivo aparecia longe demais dele. A média móvel lia essa
    // emenda como um trecho lento e reportava 27 km/h onde o comboio andava a
    // 38 — número errado pelo motivo errado, que ia subindo sozinho conforme a
    // emenda saía da janela de 3 min.
    const desdeMs = Date.now();
    const pings = rastro(indice, offset, vDele, desdeMs);
    await enviar(vinculo.token, pings);

    vivos.push({
      posicao,
      token: vinculo.token,
      offset,
      vMps: vDele,
      desdeMs,
      seq: pings.length,
    });

    console.log(
      `  · ${posicao.label.padEnd(18)} km ${(offset / 1000).toFixed(1).padStart(6)}` +
        `   ${pings.length} pings   ${posicao.role}`,
    );
  }

  console.log("");
  if (vivos.length === 0) {
    console.log("  Nenhum veículo entrou. Confira se o servidor está no ar em " + OPCOES.base);
    console.log("");
    process.exitCode = 1;
    return;
  }

  console.log(`  ${vivos.length} veículo(s) no mapa.`);

  if (!OPCOES.stream) {
    console.log("  Sem --stream: em ~90 s o painel começa a marcar sinal perdido.");
    console.log("");
    return;
  }

  console.log("  Transmitindo. Ctrl+C para parar.");
  console.log("");

  let parar = false;
  process.on("SIGINT", () => {
    parar = true;
  });

  // A partir daqui cada volta do laço é um ping novo por veículo, no mesmo
  // passo do rastro — o comboio continua andando enquanto a tela é fotografada.
  while (!parar) {
    await new Promise((r) => setTimeout(r, OPCOES.passoS * 1000));
    if (parar) break;

    for (const vivo of vivos) {
      const decorridoS = (Date.now() - vivo.desdeMs) / 1000;
      const offset = Math.min(indice.total, vivo.offset + vivo.vMps * decorridoS);
      const p = em(indice, offset);
      vivo.seq += 1;

      try {
        await postar(
          "/api/driver/ping",
          {
            pings: [
              {
                clientPingId: randomUUID(),
                clientSeq: vivo.seq,
                lat: p.lat + (Math.random() - 0.5) * 0.00002,
                lng: p.lng + (Math.random() - 0.5) * 0.00002,
                accuracyM: 4 + Math.random() * 6,
                altitudeM: null,
                speedMps: vivo.vMps * (0.9 + Math.random() * 0.2),
                headingDeg: p.rumo,
                recordedAt: new Date().toISOString(),
                batteryPct: null,
                queuedOffline: false,
              },
            ],
          },
          vivo.token,
        );
      } catch (erro) {
        console.log(`  ! ${vivo.posicao.label}: ${erro.message}`);
      }
    }

    // O relógio é do PRIMEIRO VEÍCULO, e não de um `decorridoS` solto: cada um
    // tem o seu desde que o rastro passou a terminar por veículo. A versão
    // anterior lia uma variável que agora vive dentro do laço acima, e o
    // simulador morria no primeiro ciclo de transmissão — depois de semear
    // tudo, que é o pior momento para morrer.
    const lider = vivos[0];
    const kmLider =
      Math.min(
        indice.total,
        lider.offset + lider.vMps * ((Date.now() - lider.desdeMs) / 1000),
      ) / 1000;

    process.stdout.write(
      `\r  ${new Date().toLocaleTimeString()} — comboio em km ` +
        `${kmLider.toFixed(1)}   `,
    );
  }

  console.log("\n\n  Parado. Os veículos envelhecem a partir de agora.\n");
}

main().catch((erro) => {
  console.error(`\n  Falhou: ${erro.message}\n`);
  process.exitCode = 1;
});
