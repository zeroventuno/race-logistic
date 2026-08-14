import Link from "next/link";

import { BotaoLink, Cartao, Selo } from "@/components/director/ui";
import { formatDuration } from "@/lib/i18n/format";
import { getTranslator } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translate";
import type { Race } from "@/lib/types";

import { RACE_STATUS_TONE, formatRaceDate } from "../_lib/format";
import { computeReadiness } from "../_lib/readiness";
import { requireUser } from "../_lib/session";

export const metadata = { title: "Flamme Rouge" };

export default async function DashboardPage() {
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
          .select("race_id")
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

  const comPercurso = new Set(
    ((tracksRes.data ?? []) as { race_id: string }[]).map((r) => r.race_id),
  );

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

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="titulo text-3xl font-semibold text-ink">
            {t("director.myRaces")}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {/* i18n: precisa de chave — "Cada prova tem seu percurso, suas posições de apoio e seus códigos." */}
            Cada prova tem seu percurso, suas posições de apoio e seus códigos.
          </p>
        </div>
        <BotaoLink href="/dashboard/nova" variant="primary" size="lg">
          + {t("director.newRace")}
        </BotaoLink>
      </div>

      {error ? (
        <Cartao className="mt-8 border-warn/45 p-5">
          <p className="font-semibold text-warn">{t("common.error")}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {/* i18n: precisa de chave — recuperação de falha ao listar provas */}
            Recarregue a página. Se persistir, saia e entre de novo — sua sessão
            pode ter expirado.
          </p>
        </Cartao>
      ) : races.length === 0 ? (
        <EstadoVazio t={t} />
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {races.map((race) => {
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

            return (
              <li key={race.id}>
                <Link
                  href={`/dashboard/${race.id}`}
                  className="block h-full border border-border bg-surface-1 p-5 transition hover:border-border-strong hover:bg-surface-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="titulo font-semibold leading-tight text-ink text-xl">
                      {race.name}
                    </h2>
                    <Selo tone={RACE_STATUS_TONE[race.status]}>
                      {t(`race.status.${race.status}`)}
                    </Selo>
                  </div>

                  <p className="mt-1 text-sm text-ink-muted">
                    {race.location ? `${race.location} · ` : ""}
                    <span className="tnum">
                      {formatRaceDate(
                        race.scheduled_start,
                        locale as Locale,
                        race.timezone,
                      )}
                    </span>
                  </p>

                  <p className="mt-3 text-xs text-ink-faint">
                    {/* i18n: precisa de chave — rótulo curto "Janela alvo" */}
                    Janela alvo{" "}
                    <span className="tnum text-ink-muted">
                      {formatDuration(race.target_gap_minutes * 60, locale)}
                    </span>
                    {" · "}
                    <span className="tnum text-ink-muted">
                      {contagem.total}
                    </span>{" "}
                    {t("race.positions").toLowerCase()}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {readiness.ready ? (
                      <Selo tone="ok">✓ {t("director.ready")}</Selo>
                    ) : (
                      readiness.blocking.map((item) => (
                        <Selo key={item.key} tone="warn">
                          {rotuloPendencia(item.key, t)}
                        </Selo>
                      ))
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
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
      /* i18n: precisa de chave — "Cadastrar posições de apoio" */
      return "Cadastrar posições de apoio";
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
  /* i18n: precisa de chave — os três passos do estado vazio (título e texto). */
  const passos = [
    {
      n: 1,
      titulo: "Cadastre a prova",
      texto:
        "Nome, local, largada e a janela alvo entre o carro de abertura e a vassoura. Um minuto.",
    },
    {
      n: 2,
      titulo: "Carregue o percurso",
      texto:
        "Suba o GPX que você já tem, ou desenhe o traçado no mapa. É o que transforma posição de GPS em quilômetro de prova.",
    },
    {
      n: 3,
      titulo: "Cadastre as posições e imprima os códigos",
      texto:
        "Cada moto, ambulância e carro de apoio ganha um código de 6 caracteres. O motorista digita no celular dele e pronto — sem instalar nada, sem criar conta.",
    },
  ];

  return (
    <Cartao className="mt-8 p-6 sm:p-8">
      <h2 className="titulo font-semibold text-ink text-2xl">{t("director.noRaces")}</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        {/* i18n: precisa de chave — explicação dos requisitos de uma prova */}
        Uma prova fica pronta para ir ao ar quando tem percurso, posições de
        apoio e as referências de abertura e fechamento marcadas. São três
        passos:
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
