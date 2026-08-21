import Link from "next/link";

import { MiniPercurso } from "@/components/director/MiniPercurso";
import { Aviso, BotaoLink, Cartao, Selo } from "@/components/director/ui";
import { formatDistance, formatDuration } from "@/lib/i18n/format";
import { getTranslator } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/config";
import type { TranslationKey, Translator } from "@/lib/i18n/translate";
import type { Race } from "@/lib/types";

import { RACE_STATUS_TONE, formatRaceDate } from "../_lib/format";
import { computeReadiness } from "../_lib/readiness";
import { requireUser } from "../_lib/session";

export const metadata = { title: "Flamme Rouge" };

/**
 * Os filtros da lista.
 *
 * Vão na URL, não em estado de cliente, por três motivos práticos: a página
 * continua sendo do servidor (nenhum JavaScript novo desce para filtrar uma
 * lista que já veio pronta), o link é compartilhável, e o botão de voltar
 * funciona. Uma aba que só existe na memória do navegador é uma aba que se
 * perde quando o diretor abre uma prova e volta.
 */
const FILTROS = ["todas", "prontas", "preparacao", "encerradas"] as const;
type Filtro = (typeof FILTROS)[number];

const CHAVE_FILTRO: Record<Filtro, TranslationKey> = {
  todas: "director.filterAll",
  prontas: "director.filterReady",
  preparacao: "director.filterPreparing",
  encerradas: "director.filterFinished",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; confirmado?: string; senha?: string }>;
}) {
  const { supabase } = await requireUser();
  const { locale, t } = await getTranslator();

  const { data: racesData, error } = await supabase
    .from("races")
    .select("*")
    .order("scheduled_start", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100);

  const races = (racesData ?? []) as Race[];
  const ids = races.map((r) => r.id);

  // Duas consultas agregadas em vez de uma por prova: uma lista com 20 provas
  // faria 40 idas ao banco e o painel abriria em segundos, não milissegundos.
  const [tracksRes, positionsRes] = await Promise.all([
    ids.length
      ? supabase
          .from("route_tracks")
          // `render_points` é a linha já simplificada. Ela pode ter algumas
          // centenas de pares por prova, e é pesada — mas morre AQUI: esta é
          // uma página de servidor, e para o navegador desce só o atributo
          // `d` do SVG que a miniatura gera.
          .select("race_id, total_distance_m, render_points")
          .in("race_id", ids)
          .eq("is_active", true)
      : Promise.resolve({ data: [] as { race_id: string }[] }),
    ids.length
      ? supabase
          .from("race_positions")
          .select("race_id, is_reference_lead, is_reference_sweep")
          .in("race_id", ids)
      : Promise.resolve({
          data: [] as {
            race_id: string;
            is_reference_lead: boolean;
            is_reference_sweep: boolean;
          }[],
        }),
  ]);

  type LinhaTrack = {
    race_id: string;
    total_distance_m: number;
    render_points: [number, number][];
  };

  const percursoPorProva = new Map<string, LinhaTrack>();
  for (const linha of (tracksRes.data ?? []) as LinhaTrack[]) {
    percursoPorProva.set(linha.race_id, linha);
  }
  const comPercurso = new Set(percursoPorProva.keys());

  const porProva = new Map<
    string,
    { total: number; lead: boolean; sweep: boolean }
  >();
  for (const p of (positionsRes.data ?? []) as {
    race_id: string;
    is_reference_lead: boolean;
    is_reference_sweep: boolean;
  }[]) {
    const atual = porProva.get(p.race_id) ?? {
      total: 0,
      lead: false,
      sweep: false,
    };
    atual.total += 1;
    atual.lead ||= p.is_reference_lead;
    atual.sweep ||= p.is_reference_sweep;
    porProva.set(p.race_id, atual);
  }

  // Calcula a prontidão de todas antes de filtrar: os contadores das abas
  // precisam do total de cada estado, não só do que sobrou depois do filtro.
  const comEstado = races.map((race) => {
    const contagem = porProva.get(race.id) ?? {
      total: 0,
      lead: false,
      sweep: false,
    };
    const readiness = computeReadiness({
      hasActiveRoute: comPercurso.has(race.id),
      positionCount: contagem.total,
      hasReferenceLead: contagem.lead,
      hasReferenceSweep: contagem.sweep,
      hasScheduledStart: race.scheduled_start !== null,
    });
    const encerrada = race.status === "finished" || race.status === "archived";

    return {
      race,
      contagem,
      readiness,
      encerrada,
      percurso: percursoPorProva.get(race.id) ?? null,
      grupo: encerrada
        ? ("encerradas" as const)
        : readiness.ready
          ? ("prontas" as const)
          : ("preparacao" as const),
    };
  });

  const params = await searchParams;
  const pedido = params.estado;
  const confirmado = params.confirmado === "1";
  const senhaTrocada = params.senha === "1";
  const filtro: Filtro = FILTROS.includes(pedido as Filtro)
    ? (pedido as Filtro)
    : "todas";

  const contagemPorFiltro: Record<Filtro, number> = {
    todas: comEstado.length,
    prontas: comEstado.filter((r) => r.grupo === "prontas").length,
    preparacao: comEstado.filter((r) => r.grupo === "preparacao").length,
    encerradas: comEstado.filter((r) => r.grupo === "encerradas").length,
  };

  const visiveis =
    filtro === "todas" ? comEstado : comEstado.filter((r) => r.grupo === filtro);

  return (
    <main className="mx-auto max-w-[73.75rem] px-5 pb-24 pt-12 sm:px-10">
      {/*
        O AVISO DE QUE A CONFIRMAÇÃO DEU CERTO.
        Quem chega aqui vindo do link do e-mail já está autenticado — mas
        entrar sem que nada diga por quê deixa a pessoa sem saber se o clique
        funcionou. Era a reclamação: "o site não dá nenhuma mensagem
        informando sucesso". Some sozinho na próxima navegação, porque vive no
        parâmetro da URL e não em estado nenhum.
      */}
      {confirmado ? (
        <Aviso tone="ok" titulo={t("auth.confirmedTitle")} className="mb-8">
          {t("auth.confirmed")}
        </Aviso>
      ) : null}

      {senhaTrocada ? (
        <Aviso tone="ok" className="mb-8">
          {t("auth.passwordChanged")}
        </Aviso>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-ink-faint">
            {t("director.areaOverline")}
          </p>
          <h1 className="titulo mt-3 text-[2.75rem] font-bold leading-[1.02] text-ink">
            {t("director.myRaces")}
          </h1>
          <p className="mt-2 text-[0.96875rem] text-ink-muted">
            {t("director.myRacesSubtitle")}
          </p>
        </div>
        <BotaoLink href="/dashboard/nova" variant="primary">
          + {t("director.newRace")}
        </BotaoLink>
      </div>

      {races.length > 0 ? (
        <nav
          aria-label="Filtrar provas"
          className="mt-9 flex flex-wrap gap-6 border-b border-border"
        >
          {FILTROS.map((f) => {
            const ativa = f === filtro;
            return (
              <Link
                key={f}
                href={f === "todas" ? "/dashboard" : `/dashboard?estado=${f}`}
                aria-current={ativa ? "page" : undefined}
                className={`-mb-px border-b-2 pb-3 font-mono text-[0.6875rem] uppercase tracking-[0.16em] transition ${
                  ativa
                    ? "border-ink text-ink"
                    : "border-transparent text-ink-faint hover:text-ink-muted"
                }`}
              >
                {t(CHAVE_FILTRO[f])}{" "}
                <span className="tnum text-ink-ghost">
                  {contagemPorFiltro[f]}
                </span>
              </Link>
            );
          })}
        </nav>
      ) : null}

      {error ? (
        <Cartao className="mt-8 border-warn/45 p-5">
          <p className="font-semibold text-warn">{t("common.error")}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {t("director.listErrorBody")}
          </p>
        </Cartao>
      ) : races.length === 0 ? (
        <EstadoVazio t={t} />
      ) : (
        /* A lista é dividida por FIO, não por margem.
           Um `gap` de 1px sobre um fundo da cor da linha desenha as divisórias
           sem que nenhuma linha precise carregar borda própria — e sem o
           encosto de duas bordas de 1px virando 2px entre itens vizinhos. É a
           diferença entre uma tabela de resultados e uma pilha de cartões
           soltos, e uma lista de provas é a primeira. */
        <ul
          className="mt-8 grid gap-px border border-border bg-border"
          role="list"
        >
          {visiveis.map(({ race, contagem, readiness, encerrada, percurso }) => (
            <li key={race.id}>
              <Link
                href={`/dashboard/${race.id}`}
                className={`grid grid-cols-1 items-start gap-x-8 gap-y-5 bg-surface-1 p-7 transition hover:bg-surface-2 sm:grid-cols-[minmax(0,1fr)_auto] ${
                  encerrada ? "opacity-[0.66] hover:opacity-100" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="titulo text-2xl font-semibold leading-tight text-ink">
                      {race.name}
                    </h2>
                    <Selo tone={RACE_STATUS_TONE[race.status]}>
                      {t(`race.status.${race.status}`)}
                    </Selo>
                    {readiness.ready && !encerrada ? (
                      <Selo tone="ok">✓ {t("director.ready")}</Selo>
                    ) : null}
                  </div>

                  <p className="mt-2 text-sm text-ink-muted">
                    {race.location ? `${race.location} · ` : ""}
                    <span className="tnum">
                      {formatRaceDate(
                        race.scheduled_start,
                        locale as Locale,
                        race.timezone,
                      )}
                    </span>
                    {(race as { laps?: number }).laps &&
                    (race as { laps?: number }).laps! > 1
                      ? ` · ${t("race.lapsCircuit", {
                          laps: (race as { laps?: number }).laps ?? 1,
                        })}`
                      : ""}
                  </p>

                  <dl className="mt-5 flex flex-wrap gap-x-9 gap-y-3">
                    <Metrica
                      rotulo={t("race.route")}
                      valor={
                        percurso
                          ? formatDistance(percurso.total_distance_m, locale)
                          : "—"
                      }
                    />
                    <Metrica
                      rotulo={t("gap.targetLabel")}
                      valor={formatDuration(
                        race.target_gap_minutes * 60,
                        locale,
                      )}
                    />
                    <Metrica
                      rotulo={t("director.supportShort")}
                      valor={`${contagem.total} ${t("race.positions").toLowerCase()}`}
                    />
                  </dl>

                  {/* As pendências só aparecem quando existem, e em âmbar:
                      elas são "o sistema ainda não sabe", não emergência. A
                      única exceção é a falta de percurso, que é bloqueante —
                      sem ele não há quilômetro nem janela, e a prova não vai
                      ao ar. Esse é o único vermelho desta tela. */}
                  {!encerrada && !readiness.ready ? (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {readiness.blocking.map((item) => (
                        <Selo
                          key={item.key}
                          tone={item.key === "route" ? "critical" : "warn"}
                        >
                          {rotuloPendencia(item.key, t)}
                        </Selo>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-6 sm:flex-col sm:items-end sm:gap-4">
                  <MiniPercurso
                    pontos={percurso?.render_points ?? []}
                    rotuloSemPercurso={t("route.noGpx")}
                    className="shrink-0 border border-border"
                  />
                  <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
                    {encerrada ? t("director.openRecord") : t("director.openRace")} →
                  </span>
                </div>
              </Link>
            </li>
          ))}

          {visiveis.length === 0 ? (
            <li className="bg-surface-1 px-7 py-12 text-center text-sm text-ink-muted">
              {t("director.noneInFilter")}
            </li>
          ) : null}
        </ul>
      )}
    </main>
  );
}

/** Um par rótulo/valor da linha de métricas. */
function Metrica({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-ink-faint">
        {rotulo}
      </dt>
      <dd className="tnum mt-1 font-mono text-[0.8125rem] text-ink">{valor}</dd>
    </div>
  );
}

/** Traduz a pendência para a frase de ação que o dicionário já tem. */
function rotuloPendencia(key: string, t: Translator): string {
  switch (key) {
    case "route":
      return t("director.needsRoute");
    case "lead":
      return t("director.needsLead");
    case "sweep":
      return t("director.needsSweep");
    default:
      return t("director.needsPositions");
  }
}

/**
 * Estado vazio que ensina.
 *
 * A primeira prova é o momento em que o diretor decide se este sistema serve.
 * "Nenhuma prova encontrada" não ajuda ninguém — o que ajuda é o mapa das três
 * coisas que ele vai precisar fazer, com o esforço de cada uma.
 */
function EstadoVazio({ t }: { t: Translator }) {
  const passos = [
    { n: 1, titulo: t("director.empty.step1Title"), texto: t("director.empty.step1Body") },
    { n: 2, titulo: t("director.empty.step2Title"), texto: t("director.empty.step2Body") },
    { n: 3, titulo: t("director.empty.step3Title"), texto: t("director.empty.step3Body") },
  ];

  return (
    <Cartao className="mt-8 p-6 sm:p-8">
      <h2 className="titulo font-semibold text-ink text-2xl">{t("director.noRaces")}</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        {t("director.empty.intro")}
      </p>

      <ol className="mt-6 space-y-4">
        {passos.map((p) => (
          <li key={p.n} className="flex gap-4">
            <span className="tnum flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-2 text-sm font-semibold text-ink-muted">
              {p.n}
            </span>
            <div>
              <p className="font-medium text-ink">{p.titulo}</p>
              <p className="mt-0.5 text-sm text-ink-muted">{p.texto}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8">
        <BotaoLink href="/dashboard/nova" variant="primary" size="lg">
          {t("director.noRacesAction")}
        </BotaoLink>
      </div>
    </Cartao>
  );
}
