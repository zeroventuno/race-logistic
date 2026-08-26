import {
  Document,
  G,
  Page,
  Path,
  Polygon,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";

import { BRAND, PENNANT_WITH_POLE } from "@/brand/mark";
import { formatDuration } from "@/lib/route/gap";

import type { DadosDoRelatorio, IncidenteDoRelatorio } from "./dados";
import { montarGrafico } from "./grafico";

/**
 * O relatório final da prova, em PDF.
 *
 * ------------------------------------------------------------------------
 * TIPOGRAFIA EMBUTIDA NO LEITOR, DE PROPÓSITO
 *
 * Helvetica e Courier vêm com o PDF por especificação, sem baixar nada. A
 * fonte da marca sairia mais bonita e traria uma dependência de rede na
 * geração de um documento que precisa sair igual toda vez, inclusive daqui a
 * dois anos, inclusive com a internet ruim. Documento de prova troca beleza
 * por reprodutibilidade sem pensar duas vezes.
 *
 * ------------------------------------------------------------------------
 * O VERMELHO
 *
 * Dentro do produto, `#D92D20` significa uma coisa só: alguém precisa de
 * socorro. Aqui ele é traduzido para o registro escrito — vermelho é
 * INCIDENTE ou ESTOURO DA JANELA, e nada mais. Nunca título, nunca régua,
 * nunca enfeite. A bandeirola da capa é a única exceção, e é identidade, não
 * sinal.
 */

const C = {
  ink: "#12171C",
  muted: "#5A6672",
  faint: "#98A2AC",
  regua: "#DDD7D5",
  fundo: "#FFFFFF",
  papel: "#F6F4F3",
  rouge: BRAND.color.rouge,
  medido: "#12171C",
  projetado: "#98A2AC",
} as const;

/** Meia hora de silêncio antes do encerramento já é esquecimento, não prova. */
const CAUDA_QUE_MERECE_AVISO_S = 1800;

const s = StyleSheet.create({
  pagina: {
    backgroundColor: C.fundo,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.ink,
  },
  capa: { backgroundColor: C.fundo, padding: 48, fontFamily: "Helvetica", color: C.ink },
  h1: { fontSize: 26, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  h2: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.6,
    color: C.muted,
    marginBottom: 10,
  },
  p: { fontSize: 9, lineHeight: 1.5, color: C.muted },
  numeroGrande: { fontSize: 42, fontFamily: "Helvetica-Bold" },
  mono: { fontFamily: "Courier" },
  monoB: { fontFamily: "Courier-Bold" },
  secao: { marginBottom: 22 },
  regua: { height: 1, backgroundColor: C.regua, marginVertical: 12 },
  linha: { flexDirection: "row" },
  celula: { flex: 1 },
  rodape: {
    position: "absolute",
    bottom: 26,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: C.faint,
  },
});

/**
 * Devolve o `<Document>` direto, e não um componente que o embrulha.
 *
 * `renderToBuffer` exige um elemento de `Document`. Um componente próprio no
 * topo teria as props DELE no tipo, e o encaixe só passaria com uma conversão
 * forçada — que é justamente onde um erro de verdade se esconderia depois.
 * Sem embrulho, o tipo confere sozinho.
 */
export function documentoDoRelatorio(dados: DadosDoRelatorio) {
  const fmt = formatadores(dados.prova.fusoHorario);
  const serie = dados.serie;

  const autorizado = dados.prova.janelaMaxMin ?? dados.prova.janelaAlvoMin ?? null;
  const estourou =
    autorizado !== null && serie?.gapSegundosMax != null
      ? serie.gapSegundosMax / 60 > autorizado
      : false;

  return (
    <Document
      title={`Relatório — ${dados.prova.nome}`}
      author="Flamme Rouge"
      subject="Relatório final de prova"
    >
      <Capa dados={dados} fmt={fmt} autorizado={autorizado} estourou={estourou} />
      <Sumario dados={dados} fmt={fmt} autorizado={autorizado} estourou={estourou} />
      <PaginaDaJanela dados={dados} fmt={fmt} />
      <PaginaDeIncidentes dados={dados} fmt={fmt} />
      <PaginaDoComboio dados={dados} fmt={fmt} />
    </Document>
  );
}

// ---------------------------------------------------------------------------

function Capa({
  dados,
  fmt,
  autorizado,
  estourou,
}: {
  dados: DadosDoRelatorio;
  fmt: Formatadores;
  autorizado: number | null;
  estourou: boolean;
}) {
  const serie = dados.serie;

  return (
    <Page size="A4" style={s.capa}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 64 }}>
        <Bandeirola tamanho={26} />
        <Text
          style={{
            marginLeft: 10,
            fontSize: 11,
            fontFamily: "Helvetica-Bold",
            letterSpacing: 2.4,
          }}
        >
          FLAMME ROUGE
        </Text>
      </View>

      <Text style={s.h2}>RELATÓRIO FINAL DE PROVA</Text>
      <Text style={{ fontSize: 32, fontFamily: "Helvetica-Bold", marginBottom: 6 }}>
        {dados.prova.nome}
      </Text>
      <Text style={{ fontSize: 11, color: C.muted, marginBottom: 56 }}>
        {[dados.prova.local, fmt.data(dados.prova.inicio)].filter(Boolean).join(" · ")}
      </Text>

      {/*
        A CAPA RESPONDE A PERGUNTA DA AUTORIDADE DE TRÂNSITO.
        Ela quer saber uma coisa: o combinado foi respeitado? Se a resposta
        estiver na página dois, ela não foi lida.
      */}
      {serie && serie.gapSegundosMax !== null ? (
        <View>
          <Text style={s.h2}>A JANELA DA PROVA</Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            <Text
              style={[
                s.numeroGrande,
                { color: estourou ? C.rouge : C.ink },
              ]}
            >
              {formatDuration(serie.gapSegundosMax)}
            </Text>
            <Text style={{ fontSize: 11, color: C.muted, marginLeft: 10, marginBottom: 8 }}>
              máxima observada
            </Text>
          </View>

          <Text style={{ fontSize: 11, color: C.muted, marginTop: 10 }}>
            {autorizado === null
              ? "Nenhum limite foi declarado no cadastro da prova."
              : estourou
                ? `Acima do limite de ${autorizado} min combinado com a autoridade de trânsito.`
                : `Dentro do limite de ${autorizado} min combinado com a autoridade de trânsito.`}
          </Text>

          <Text style={{ fontSize: 9, color: C.faint, marginTop: 24, lineHeight: 1.6 }}>
            {`Medida em ${pct(serie.coberturaMedida)} da prova pela passagem dos dois veículos de referência pelo mesmo ponto da estrada. O restante é estimado ou não pôde ser apurado, e está identificado como tal ao longo do documento.`}
          </Text>
        </View>
      ) : (
        <View>
          <Text style={s.h2}>A JANELA DA PROVA</Text>
          <Text style={{ fontSize: 15, fontFamily: "Helvetica-Bold", marginBottom: 8 }}>
            Não pôde ser medida
          </Text>
          <Text style={{ fontSize: 10, color: C.muted, lineHeight: 1.6, maxWidth: 380 }}>
            {dados.serieImpossivel ??
              "Não houve dado suficiente para apurar a janela desta prova."}
          </Text>
        </View>
      )}

      <View style={{ position: "absolute", bottom: 48, left: 48, right: 48 }}>
        <View style={{ height: 1, backgroundColor: C.regua, marginBottom: 8 }} />
        <Text style={{ fontSize: 7, color: C.faint }}>
          {`Documento gerado em ${fmt.dataHora(dados.geradoEm)} a partir do registro de posição do comboio.`}
        </Text>
      </View>
    </Page>
  );
}

function Sumario({
  dados,
  fmt,
  autorizado,
  estourou,
}: {
  dados: DadosDoRelatorio;
  fmt: Formatadores;
  autorizado: number | null;
  estourou: boolean;
}) {
  const serie = dados.serie;
  const inc = dados.incidentes;
  const chegadas = inc
    .map((i) => i.segundosAteOLocal)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);
  const mediana = chegadas.length
    ? chegadas[Math.floor(chegadas.length / 2)]!
    : null;

  const semResolver = inc.filter(
    (i) => i.status !== "resolved" && i.status !== "cancelled",
  ).length;

  const coberturas = dados.veiculos
    .map((v) => v.cobertura)
    .filter((v): v is number => v !== null);
  const coberturaMedia = coberturas.length
    ? coberturas.reduce((a, b) => a + b, 0) / coberturas.length
    : null;

  return (
    <Page size="A4" style={s.pagina}>
      <Cabecalho titulo="1 · Sumário" prova={dados.prova.nome} />

      <View style={s.secao}>
        <Text style={s.h2}>A JANELA ABERTURA ↔ FECHAMENTO</Text>
        <View style={s.linha}>
          <Dado
            rotulo="autorizada"
            valor={autorizado === null ? "não declarada" : `${autorizado} min`}
          />
          <Dado rotulo="mínima" valor={formatDuration(serie?.gapSegundosMin ?? null)} />
          <Dado rotulo="média" valor={formatDuration(serie?.gapSegundosMedio ?? null)} />
          <Dado
            rotulo="máxima"
            valor={formatDuration(serie?.gapSegundosMax ?? null)}
            destaque={estourou}
          />
        </View>
        <Text style={[s.p, { marginTop: 8 }]}>
          {serie
            ? `Mínima, média e máxima consideram apenas os instantes efetivamente medidos — ${serie.porProcedencia.measured} de ${serie.pontos.length} pontos da série. Valores estimados não entram em estatística que o documento afirma.`
            : (dados.serieImpossivel ?? "Sem série.")}
        </Text>
      </View>

      <View style={s.regua} />

      <View style={s.secao}>
        <Text style={s.h2}>SOCORRO</Text>
        <View style={s.linha}>
          <Dado rotulo="incidentes" valor={String(inc.length)} />
          <Dado
            rotulo="tempo mediano até chegar"
            valor={mediana === null ? "—" : formatDuration(mediana)}
          />
          <Dado
            rotulo="sem encerramento"
            valor={String(semResolver)}
            destaque={semResolver > 0}
          />
        </View>
      </View>

      <View style={s.regua} />

      <View style={s.secao}>
        <Text style={s.h2}>COMBOIO</Text>
        <View style={s.linha}>
          <Dado rotulo="veículos" valor={String(dados.veiculos.length)} />
          <Dado
            rotulo="cobertura média de sinal"
            valor={coberturaMedia === null ? "—" : pct(coberturaMedia)}
          />
          <Dado
            rotulo="percurso"
            valor={
              dados.percurso
                ? `${(dados.percurso.distanciaDaProvaM / 1000).toFixed(1)} km`
                : "—"
            }
          />
        </View>
      </View>

      <View style={s.regua} />

      <View style={s.secao}>
        <Text style={s.h2}>PERÍODO</Text>
        <Text style={s.p}>
          {`Início ${fmt.dataHora(dados.prova.inicio)} · encerramento ${fmt.dataHora(dados.prova.fim)}`}
          {dados.prova.fusoHorario ? ` · fuso ${dados.prova.fusoHorario}` : ""}
        </Text>

        {/*
          O PERÍODO DECLARADO PODE NÃO SER O PERÍODO DA PROVA.
          "Encerrar" é um botão que se esquece de apertar: a prova acaba às 13h
          e alguém lembra do sistema no dia seguinte. O relatório não corrige o
          período — ele é o que a direção declarou e o que a prefeitura vai ler
          — mas avisa, senão o documento afirma silenciosamente que a rua ficou
          sob controle de prova por vinte horas.
        */}
        {dados.caudaSemDadoS !== null && dados.caudaSemDadoS > CAUDA_QUE_MERECE_AVISO_S ? (
          <Text style={[s.p, { marginTop: 8, color: C.ink }]}>
            {`Atenção: o comboio parou de transmitir ${formatDuration(dados.caudaSemDadoS)} antes do encerramento registrado. O período acima é o declarado no sistema, não o tempo em que houve prova na estrada.`}
          </Text>
        ) : null}
      </View>

      <Rodape dados={dados} fmt={fmt} />
    </Page>
  );
}

function PaginaDaJanela({
  dados,
  fmt,
}: {
  dados: DadosDoRelatorio;
  fmt: Formatadores;
}) {
  const serie = dados.serie;
  const g = serie
    ? montarGrafico(serie.pontos, {
        janelaAlvoMin: dados.prova.janelaAlvoMin,
        janelaMinMin: dados.prova.janelaMinMin,
        janelaMaxMin: dados.prova.janelaMaxMin,
        formatarHora: (ms) => fmt.hora(new Date(ms).toISOString()),
      })
    : null;

  return (
    <Page size="A4" style={s.pagina}>
      <Cabecalho titulo="2 · A janela, minuto a minuto" prova={dados.prova.nome} />

      {g && g.temLinha ? (
        <>
          <Svg width={g.largura} height={g.altura + 22} viewBox={`0 -6 ${g.largura} ${g.altura + 28}`}>
            <G>
              {g.marcasY.map((m, i) => (
                <Path
                  key={`gy${i}`}
                  d={`M 0 ${m.pos} L ${g.largura} ${m.pos}`}
                  stroke={C.regua}
                  strokeWidth={0.5}
                />
              ))}

              {/* Estouro primeiro, por baixo da linha: é fundo, não traço. */}
              {g.estouros.map((e, i) => (
                <Rect
                  key={`e${i}`}
                  x={e.x}
                  y={0}
                  width={Math.max(1, e.largura)}
                  height={g.altura}
                  fill={C.rouge}
                  fillOpacity={0.1}
                />
              ))}

              {g.faixa ? (
                g.faixa.altura > 0 ? (
                  <Rect
                    x={0}
                    y={g.faixa.y}
                    width={g.largura}
                    height={g.faixa.altura}
                    fill="#12171C"
                    fillOpacity={0.06}
                  />
                ) : (
                  <Path
                    d={`M 0 ${g.faixa.y} L ${g.largura} ${g.faixa.y}`}
                    stroke={C.ink}
                    strokeWidth={0.8}
                    strokeDasharray="4 3"
                  />
                )
              ) : null}

              {g.segmentos.map((seg, i) => (
                <Path
                  key={`s${i}`}
                  d={seg.d}
                  stroke={seg.traco === "medido" ? C.medido : C.projetado}
                  strokeWidth={seg.traco === "medido" ? 1.6 : 1}
                  strokeDasharray={seg.traco === "medido" ? undefined : "3 2.5"}
                  fill="none"
                />
              ))}
            </G>
          </Svg>

          <View style={{ flexDirection: "row", marginTop: 4, marginBottom: 14 }}>
            {g.marcasX.map((m, i) => (
              <Text
                key={`mx${i}`}
                style={{
                  position: "absolute",
                  left: Math.min(m.pos, g.largura - 24),
                  fontSize: 7,
                  color: C.faint,
                  fontFamily: "Courier",
                }}
              >
                {m.rotulo}
              </Text>
            ))}
          </View>

          <View style={{ marginTop: 16 }}>
            <Text style={s.h2}>COMO LER</Text>
            <Legenda cor={C.medido} tracejada={false} texto={`Medido — ${serie!.porProcedencia.measured} pontos. Diferença de horário entre a passagem dos dois veículos pelo mesmo ponto da estrada.`} />
            <Legenda cor={C.projetado} tracejada texto={`Estimado — ${serie!.porProcedencia.projected} pontos. Calculado pela velocidade do fechamento, porque não há registro do abertura passando por aquele ponto.`} />
            <Legenda cor={null} tracejada={false} texto={`Sem linha — ${serie!.porProcedencia.insufficient_data} pontos. Não havia posição confiável dos dois veículos. O vazio é declarado, não escondido.`} />
            {g.estouros.length > 0 ? (
              <Legenda cor={C.rouge} tracejada={false} texto={`Faixa vermelha — trecho em que a janela passou do autorizado.`} />
            ) : null}
          </View>

          <View style={s.regua} />
          <Text style={s.p}>
            Eixo vertical em minutos de janela; horizontal, a hora local da prova.
            A série é reconstruída do registro de posição gravado no servidor, com
            um ponto a cada 30 segundos.
          </Text>
        </>
      ) : (
        <View>
          <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 8 }}>
            A janela não pôde ser apurada
          </Text>
          <Text style={[s.p, { maxWidth: 380 }]}>
            {dados.serieImpossivel ??
              "Não houve posição suficiente dos veículos de referência durante esta prova."}
          </Text>
        </View>
      )}

      <Rodape dados={dados} fmt={fmt} />
    </Page>
  );
}

function PaginaDeIncidentes({
  dados,
  fmt,
}: {
  dados: DadosDoRelatorio;
  fmt: Formatadores;
}) {
  return (
    <Page size="A4" style={s.pagina}>
      <Cabecalho titulo="3 · Incidentes" prova={dados.prova.nome} />

      {dados.incidentes.length === 0 ? (
        <Text style={s.p}>Nenhum acionamento de socorro foi registrado nesta prova.</Text>
      ) : (
        dados.incidentes.map((i, n) => <Incidente key={n} i={i} n={n + 1} fmt={fmt} />)
      )}

      <Rodape dados={dados} fmt={fmt} />
    </Page>
  );
}

function Incidente({
  i,
  n,
  fmt,
}: {
  i: IncidenteDoRelatorio;
  n: number;
  fmt: Formatadores;
}) {
  const aberto = i.status !== "resolved" && i.status !== "cancelled";

  return (
    <View style={{ marginBottom: 14, borderLeftWidth: 2, borderLeftColor: aberto ? C.rouge : C.regua, paddingLeft: 10 }} wrap={false}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold" }}>
          {`${String(n).padStart(2, "0")} · ${i.categoria}`}
          {i.prioridade ? ` · ${i.prioridade}` : ""}
        </Text>
        <Text style={[s.mono, { fontSize: 8, color: aberto ? C.rouge : C.muted }]}>
          {i.status}
        </Text>
      </View>

      <Text style={[s.mono, { fontSize: 8, color: C.muted, marginTop: 3 }]}>
        {[
          `chamado ${fmt.hora(i.criadoEm)}`,
          i.offsetM !== null ? `km ${(i.offsetM / 1000).toFixed(1)}` : null,
          i.chamadoPor ? `por ${i.chamadoPor}` : null,
          i.atendidoPor ? `atendido por ${i.atendidoPor}` : null,
        ]
          .filter(Boolean)
          .join("  ·  ")}
      </Text>

      <Text style={[s.mono, { fontSize: 8, color: C.faint, marginTop: 2 }]}>
        {[
          i.reconhecidoEm ? `reconhecido ${fmt.hora(i.reconhecidoEm)}` : null,
          i.despachadoEm ? `despachado ${fmt.hora(i.despachadoEm)}` : null,
          i.noLocalEm ? `no local ${fmt.hora(i.noLocalEm)}` : null,
          i.resolvidoEm ? `encerrado ${fmt.hora(i.resolvidoEm)}` : null,
        ]
          .filter(Boolean)
          .join("  ·  ") || "sem eventos registrados após o chamado"}
      </Text>

      <Text style={{ fontSize: 8, color: C.muted, marginTop: 3 }}>
        {`até chegar: ${i.segundosAteOLocal === null ? "não registrado" : formatDuration(i.segundosAteOLocal)}`}
        {`   ·   até encerrar: ${i.segundosAteResolver === null ? "não encerrado" : formatDuration(i.segundosAteResolver)}`}
      </Text>

      {i.nota ? (
        <Text style={{ fontSize: 8, color: C.ink, marginTop: 3 }}>{i.nota}</Text>
      ) : null}
    </View>
  );
}

function PaginaDoComboio({
  dados,
  fmt,
}: {
  dados: DadosDoRelatorio;
  fmt: Formatadores;
}) {
  return (
    <Page size="A4" style={s.pagina}>
      <Cabecalho titulo="4 · O comboio" prova={dados.prova.nome} />

      <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.regua, paddingBottom: 4 }}>
        <Text style={[s.h2, { width: 22, marginBottom: 0 }]}>#</Text>
        <Text style={[s.h2, { flex: 2, marginBottom: 0 }]}>VEÍCULO</Text>
        <Text style={[s.h2, { flex: 2, marginBottom: 0 }]}>MOTORISTA</Text>
        <Text style={[s.h2, { flex: 1.2, marginBottom: 0 }]}>PLACA</Text>
        <Text style={[s.h2, { width: 46, marginBottom: 0, textAlign: "right" }]}>SINAL</Text>
      </View>

      {dados.veiculos.map((v) => (
        <View
          key={v.ordinal}
          style={{ flexDirection: "row", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: C.regua }}
        >
          <Text style={[s.mono, { width: 22, fontSize: 8, color: C.faint }]}>
            {String(v.ordinal).padStart(2, "0")}
          </Text>
          <View style={{ flex: 2 }}>
            <Text style={{ fontSize: 9 }}>{v.rotulo}</Text>
            <Text style={{ fontSize: 7, color: C.faint }}>
              {v.papel}
              {v.ehAbertura ? " · abertura" : ""}
              {v.ehFechamento ? " · fechamento" : ""}
            </Text>
          </View>
          <Text style={{ flex: 2, fontSize: 9, color: C.muted }}>{v.motorista ?? "—"}</Text>
          <Text style={[s.mono, { flex: 1.2, fontSize: 8, color: C.muted }]}>
            {v.placa ?? "—"}
          </Text>
          <Text
            style={[
              s.mono,
              {
                width: 46,
                fontSize: 8,
                textAlign: "right",
                color: v.cobertura === null ? C.faint : C.ink,
              },
            ]}
          >
            {v.cobertura === null ? "nunca" : pct(v.cobertura)}
          </Text>
        </View>
      ))}

      {/*
        OS SILÊNCIOS EXPLICAM OS BURACOS DAS PÁGINAS ANTERIORES.
        Sem esta lista, o vazio no gráfico parece defeito do sistema. Com ela,
        é um fato registrado sobre o que aconteceu na estrada.
      */}
      {dados.veiculos.some((v) => v.silencios.length > 0) ? (
        <View style={{ marginTop: 22 }}>
          <Text style={s.h2}>INTERRUPÇÕES DE SINAL ACIMA DE DOIS MINUTOS</Text>
          {dados.veiculos
            .filter((v) => v.silencios.length > 0)
            .map((v) => (
              <Text key={v.ordinal} style={[s.mono, { fontSize: 8, color: C.muted, marginBottom: 2 }]}>
                {`${v.rotulo}: `}
                {v.silencios
                  .map((x) => `${fmt.hora(new Date(x.deMs).toISOString())}→${fmt.hora(new Date(x.ateMs).toISOString())} (${formatDuration(x.segundos)})`)
                  .join("  ·  ")}
              </Text>
            ))}
        </View>
      ) : null}

      <Rodape dados={dados} fmt={fmt} />
    </Page>
  );
}

// ---------------------------------------------------------------------------

function Bandeirola({ tamanho }: { tamanho: number }) {
  const p = PENNANT_WITH_POLE;
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 100 100">
      <Rect x={p.pole.x} y={p.pole.y} width={p.pole.width} height={p.pole.height} fill={C.rouge} />
      <Polygon points={p.flag} fill={C.rouge} />
    </Svg>
  );
}

function Cabecalho({ titulo, prova }: { titulo: string; prova: string }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 7, color: C.faint, letterSpacing: 1.4, marginBottom: 3 }}>
        {prova.toUpperCase()}
      </Text>
      <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold" }}>{titulo}</Text>
      <View style={{ height: 1, backgroundColor: C.ink, marginTop: 8 }} />
    </View>
  );
}

function Dado({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <View style={s.celula}>
      <Text style={{ fontSize: 7, color: C.faint, letterSpacing: 0.8, marginBottom: 3 }}>
        {rotulo.toUpperCase()}
      </Text>
      <Text
        style={[
          s.monoB,
          { fontSize: 15, color: destaque ? C.rouge : C.ink },
        ]}
      >
        {valor}
      </Text>
    </View>
  );
}

function Legenda({
  cor,
  tracejada,
  texto,
}: {
  cor: string | null;
  tracejada: boolean;
  texto: string;
}) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 5, alignItems: "flex-start" }}>
      <Svg width={22} height={9} viewBox="0 0 22 9" style={{ marginTop: 2, marginRight: 8 }}>
        {cor ? (
          <Path
            d="M 0 4.5 L 22 4.5"
            stroke={cor}
            strokeWidth={tracejada ? 1 : 1.6}
            strokeDasharray={tracejada ? "3 2.5" : undefined}
          />
        ) : (
          <Path d="M 0 4.5 L 4 4.5 M 18 4.5 L 22 4.5" stroke={C.faint} strokeWidth={1} />
        )}
      </Svg>
      <Text style={{ fontSize: 8, color: C.muted, flex: 1, lineHeight: 1.45 }}>{texto}</Text>
    </View>
  );
}

function Rodape({ dados, fmt }: { dados: DadosDoRelatorio; fmt: Formatadores }) {
  return (
    <View style={s.rodape} fixed>
      <Text>{`${dados.prova.nome} · ${fmt.data(dados.prova.inicio)}`}</Text>
      <Text
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
      <Text>{`gerado ${fmt.dataHora(dados.geradoEm)}`}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------

interface Formatadores {
  data: (iso: string | null) => string;
  hora: (iso: string | null) => string;
  dataHora: (iso: string | null) => string;
}

/**
 * Tudo no fuso da PROVA, não no do servidor.
 *
 * O documento diz que uma rua reabriu às 10h03. Se esse número sair no fuso do
 * servidor, ele está errado para todo mundo que estava lá — e é justamente o
 * número que a prefeitura vai conferir com o agente que ficou na rotatória.
 */
function formatadores(fuso: string | null): Formatadores {
  const zona = fuso ?? "UTC";

  const mk = (opts: Intl.DateTimeFormatOptions) => {
    const f = new Intl.DateTimeFormat("pt-BR", { ...opts, timeZone: zona });
    return (iso: string | null) => (iso ? f.format(new Date(iso)) : "—");
  };

  return {
    data: mk({ day: "2-digit", month: "long", year: "numeric" }),
    hora: mk({ hour: "2-digit", minute: "2-digit", hour12: false }),
    dataHora: mk({
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  };
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}
