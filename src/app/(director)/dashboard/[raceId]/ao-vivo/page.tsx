import { buildLiveSnapshot, LiveSnapshotError } from "@/app/api/races/[raceId]/live/snapshot";
import { PainelAoVivo } from "@/components/live/PainelAoVivo";
import { Aviso } from "@/components/director/ui";

import { getRaceContext } from "../../../_lib/session";

/**
 * A tela que o diretor de prova olha por seis horas.
 *
 * O primeiro estado ao vivo é montado AQUI, no servidor, e entregue como
 * propriedade — em vez de o painel abrir vazio e buscar tudo depois de montar.
 * O motivo é operacional: quem abre esta página no meio de uma prova pode estar
 * abrindo porque alguma coisa aconteceu, e meio segundo de esqueleto cinza é
 * meio segundo em que a tela não responde à pergunta que fez a pessoa abri-la.
 * A partir do primeiro quadro, o painel se sustenta sozinho — Realtime para
 * reagir, reconciliação a cada 10 s para não mentir.
 *
 * `dynamic` forçado porque não existe versão desta página que possa ser
 * reaproveitada por dois segundos que seja.
 */

export const dynamic = "force-dynamic";

export default async function AoVivoPage({
  params,
}: {
  params: Promise<{ raceId: string }>;
}) {
  const { raceId } = await params;
  const { supabase, user, race, readiness, canEdit } = await getRaceContext(raceId);

  const [trackRes, snapshot] = await Promise.all([
    supabase
      .from("route_tracks")
      .select("render_points")
      .eq("race_id", raceId)
      .eq("is_active", true)
      .maybeSingle(),
    buildLiveSnapshot(supabase, raceId).catch((error: unknown) => {
      if (error instanceof LiveSnapshotError) return null;
      throw error;
    }),
  ]);

  if (!snapshot) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Aviso tone="warn" titulo="Não foi possível montar o painel ao vivo">
          {/* i18n: precisa de chave — falha ao montar o painel */}
          A prova existe, mas o estado ao vivo não pôde ser lido. Recarregue a
          página; se continuar, confira sua conexão com o banco.
        </Aviso>
      </main>
    );
  }

  const renderPoints = normalizarPontos(
    (trackRes.data as { render_points?: unknown } | null)?.render_points,
  );

  return (
    <PainelAoVivo
      raceId={race.id}
      usuarioId={user.id}
      podeEditar={canEdit}
      inicial={snapshot}
      renderPoints={renderPoints}
      pronta={readiness.ready}
      pendencias={readiness.blocking.map((i) => i.label)}
    />
  );
}

/**
 * `render_points` é JSONB — do ponto de vista do TypeScript, texto livre.
 *
 * Um par malformado atravessando daqui vira `NaN` numa coordenada, e o MapLibre
 * responde a isso desenhando a linha do percurso atravessando o Atlântico. Sai
 * mais barato descartar aqui.
 */
function normalizarPontos(bruto: unknown): [number, number][] {
  if (!Array.isArray(bruto)) return [];

  const saida: [number, number][] = [];

  for (const item of bruto) {
    if (!Array.isArray(item) || item.length < 2) continue;
    const lng = Number(item[0]);
    const lat = Number(item[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    saida.push([lng, lat]);
  }

  return saida;
}
