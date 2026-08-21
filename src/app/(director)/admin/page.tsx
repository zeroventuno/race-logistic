import { notFound } from "next/navigation";

import { Aviso, Cartao } from "@/components/director/ui";
import { ehAdministrador, listaDeAdminsVazia } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { requireUser } from "../_lib/session";
import { CotaCampo } from "./CotaCampo";

/*
 * O TÍTULO É GENÉRICO DE PROPÓSITO.
 *
 * O Next emite o `<title>` no corpo da resposta de redirecionamento, mesmo
 * quando manda a pessoa para o login — conferido: `/dashboard` e `/login`
 * fazem o mesmo. Com "Administração" ali, quem só sondasse a URL descobria
 * que a tela existe, que é exatamente o que o `notFound()` abaixo tenta
 * evitar. Igual ao painel de provas, `/admin` fica indistinguível de
 * qualquer outra rota protegida.
 */
export const metadata = { title: "Flamme Rouge" };
export const dynamic = "force-dynamic";

/**
 * O painel do dono da ferramenta.
 *
 * Não é o painel de quem organiza prova — é o de quem organiza o produto. Ele
 * existe porque o cadastro está aberto e não há pagamento: até agora, saber
 * quem entrou exigia abrir o banco à mão.
 *
 * TRÊS PERGUNTAS, e nada além delas. Quem se cadastrou, se voltou depois, e se
 * chegou a criar prova — que é a única ação aqui que custa esforço e portanto
 * a única que separa curioso de interessado. Tudo o mais é relatório que
 * ninguém lê.
 *
 * 404 PARA QUEM NÃO É DONO, e não 403. Um "acesso negado" confirma que a rota
 * existe, e a rota é o alvo mais valioso do sistema — é a única tela que
 * enxerga todas as contas. Para quem não está na lista, ela simplesmente não
 * está lá.
 *
 * EM PORTUGUÊS, fora do sistema de idiomas. Ver a nota em `actions.ts`.
 */
export default async function AdminPage() {
  const { user } = await requireUser();
  if (!ehAdministrador(user.email)) notFound();

  const admin = supabaseAdmin();

  /*
   * Três leituras e uma junção em memória, em vez de uma consulta.
   *
   * `last_sign_in_at` e a confirmação de e-mail vivem em `auth.users`, que o
   * cliente do Supabase só entrega pela API de administração — não dá para
   * juntar com `profiles` num `select` só. Com dezenas de contas a junção em
   * memória é irrelevante; o dia de trocar isto por uma view é o dia em que a
   * primeira página de 200 encher, e o aviso abaixo avisa.
   */
  const [{ data: listagem }, { data: perfis }, { data: provas }, { count: contatos }] =
    await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      admin.from("profiles").select("id, email, full_name, race_quota"),
      admin.from("races").select("created_by, status"),
      admin
        .from("contact_requests")
        .select("id", { count: "exact", head: true })
        .is("handled_at", null),
    ]);

  const contas = listagem?.users ?? [];

  const porId = new Map(
    (perfis ?? []).map((p) => [
      p.id as string,
      p as { id: string; email: string; full_name: string | null; race_quota: number },
    ]),
  );

  const provasPorDono = new Map<string, number>();
  const ativasPorDono = new Map<string, number>();
  for (const r of provas ?? []) {
    const dono = r.created_by as string;
    provasPorDono.set(dono, (provasPorDono.get(dono) ?? 0) + 1);
    if (r.status === "live" || r.status === "armed") {
      ativasPorDono.set(dono, (ativasPorDono.get(dono) ?? 0) + 1);
    }
  }

  const linhas = contas
    .map((u) => {
      const perfil = porId.get(u.id);
      return {
        id: u.id,
        email: u.email ?? perfil?.email ?? "—",
        nome:
          perfil?.full_name ??
          (u.user_metadata?.full_name as string | undefined) ??
          null,
        criadoEm: u.created_at,
        ultimoAcesso: u.last_sign_in_at ?? null,
        confirmado: Boolean(u.email_confirmed_at),
        cota: perfil?.race_quota ?? 1,
        usadas: provasPorDono.get(u.id) ?? 0,
        ativas: ativasPorDono.get(u.id) ?? 0,
      };
    })
    .sort((a, b) => Date.parse(b.criadoEm) - Date.parse(a.criadoEm));

  const comProva = linhas.filter((l) => l.usadas > 0).length;
  const naoConfirmadas = linhas.filter((l) => !l.confirmado).length;
  const noTeto = linhas.filter((l) => l.usadas >= l.cota).length;

  return (
    <main className="mx-auto max-w-[73.75rem] px-5 pb-24 pt-12 sm:px-10">
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-ink-faint">
        Flamme Rouge · interno
      </p>
      <h1 className="titulo mt-3 text-[2.75rem] font-bold leading-[1.02] text-ink">
        Contas
      </h1>
      <p className="mt-2 text-[0.96875rem] text-ink-muted">
        Quem se cadastrou, quem voltou, e quantas provas cada um pode criar.
      </p>

      {listaDeAdminsVazia() ? (
        <Aviso tone="warn" titulo="ADMIN_EMAILS não está definida" className="mt-8">
          Sem ela ninguém é administrador — nem você. Esta tela só abriu porque
          a variável foi lida depois do início do processo.
        </Aviso>
      ) : null}

      <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Numero rotulo="contas" valor={linhas.length} />
        <Numero rotulo="criaram prova" valor={comProva} />
        <Numero rotulo="no teto da cota" valor={noTeto} destaque={noTeto > 0} />
        <Numero
          rotulo="contatos sem resposta"
          valor={contatos ?? 0}
          destaque={(contatos ?? 0) > 0}
        />
      </div>

      {naoConfirmadas > 0 ? (
        <p className="mt-4 text-sm text-ink-muted">
          {naoConfirmadas} conta(s) criada(s) sem confirmar o e-mail.
        </p>
      ) : null}

      <Cartao className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[0.65rem] uppercase tracking-[0.16em] text-ink-faint">
              <Th>conta</Th>
              <Th>cadastro</Th>
              <Th>último acesso</Th>
              <Th>provas / cota</Th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id} className="border-b border-border/60 last:border-0">
                <td className="py-3 pl-4 pr-3">
                  <span className="font-medium text-ink">{l.email}</span>
                  {l.nome ? (
                    <span className="block text-xs text-ink-muted">{l.nome}</span>
                  ) : null}
                  {!l.confirmado ? (
                    <span className="mt-1 inline-block font-mono text-[0.6rem] uppercase tracking-[0.14em] text-warn">
                      não confirmou
                    </span>
                  ) : null}
                </td>
                <td className="tnum py-3 pr-3 text-ink-muted">
                  {dataCurta(l.criadoEm)}
                </td>
                <td className="tnum py-3 pr-3 text-ink-muted">
                  {l.ultimoAcesso ? dataCurta(l.ultimoAcesso) : "nunca entrou"}
                </td>
                <td className="py-3 pr-4">
                  <CotaCampo userId={l.id} cota={l.cota} usadas={l.usadas} />
                  {l.ativas > 0 ? (
                    <span className="mt-1 block text-xs text-ok">
                      {l.ativas} em andamento
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Cartao>

      {contas.length >= 200 ? (
        <Aviso tone="warn" className="mt-6">
          A listagem para em 200 contas. Passou disso — esta tela precisa de
          paginação.
        </Aviso>
      ) : null}
    </main>
  );
}

function Numero({
  rotulo,
  valor,
  destaque = false,
}: {
  rotulo: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div className="border border-border bg-surface-1 p-4">
      <p
        className={`tnum text-3xl font-bold ${destaque ? "text-warn" : "text-ink"}`}
      >
        {valor}
      </p>
      <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-ink-faint">
        {rotulo}
      </p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="py-2 pl-4 pr-3 font-normal first:pl-4">{children}</th>;
}

/**
 * Data curta no fuso do servidor.
 *
 * Não passa pelo formatador de idioma do produto de propósito: aquele existe
 * para mostrar horário de prova a quem está na estrada, e usa o fuso do
 * evento. Aqui quem lê é uma pessoa só, sempre a mesma, e o que importa é a
 * ordem dos acontecimentos.
 */
function dataCurta(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
