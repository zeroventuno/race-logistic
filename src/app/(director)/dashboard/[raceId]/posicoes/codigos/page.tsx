import Link from "next/link";

import { BotaoImprimir } from "@/components/director/BotaoImprimir";
import { Aviso } from "@/components/director/ui";
import { VehicleIcon } from "@/components/icons/vehicle";
import { enderecoDeVinculo, qrSvg } from "@/lib/codes/qr";
import { formatBindCode } from "@/lib/codes/bind-code";
import { formatDateTime } from "@/lib/i18n/format";
import { getTranslator } from "@/lib/i18n/server";
import { ROLE_META } from "@/lib/types";

import { getRaceContext } from "../../../../_lib/session";

/**
 * Painel de códigos para imprimir.
 *
 * Existe porque a distribuição real acontece no estacionamento, meia hora antes
 * da largada, com o diretor andando de carro em carro. Papel funciona sem
 * bateria e sem sinal; um link no WhatsApp, não.
 *
 * Cada bloco é destacável e traz tudo que o motorista precisa: o endereço, o
 * código em corpo grande e a qual veículo ele pertence. Nada de logotipo, nada
 * de instrução longa — a folha é lida em pé, com o motor ligado.
 */
export default async function CodigosPage({
  params,
}: {
  params: Promise<{ raceId: string }>;
}) {
  const { raceId } = await params;
  const { race, positions } = await getRaceContext(raceId);
  const { locale, t } = await getTranslator();

  const enderecoApp =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? "";
  const enderecoMotorista = `${enderecoApp}/driver`;

  // Posição sem código na folha é papel entregue em branco. Fica de fora e é
  // contada, para o diretor saber quantas ainda precisam de código.
  const validas = positions.filter(
    (p) => p.bind_code_revoked_at === null && p.bind_code !== "",
  );
  const revogadas = positions.length - validas.length;

  // OS QR SÃO GERADOS AQUI, no servidor, e não no navegador.
  //
  // Esta página é feita para sair na impressora, e o que importa é o que o
  // papel recebe. Gerar no cliente colocaria uma dependência de JavaScript
  // entre o diretor e a folha — e "imprimir" costuma ser a última coisa que
  // alguém faz numa véspera de prova, às vezes de um computador emprestado da
  // federação. Em paralelo porque são até algumas dezenas e cada um é
  // independente.
  const qrPorPosicao = new Map<string, string>();
  if (enderecoApp) {
    const gerados = await Promise.all(
      validas.map(async (p) => [
        p.id as string,
        await qrSvg(enderecoDeVinculo(enderecoApp, p.bind_code as string)),
      ] as const),
    );
    for (const [id, svg] of gerados) if (svg) qrPorPosicao.set(id, svg);
  }

  const agora = Date.now();
  const expiradas = validas.filter(
    (p) =>
      p.bind_code_expires_at !== null &&
      new Date(p.bind_code_expires_at).getTime() < agora,
  ).length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <style>{ESTILO_IMPRESSAO}</style>

      <div className="nao-imprimir">
        <Link
          href={`/dashboard/${race.id}/posicoes`}
          className="text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
        >
          ← {t("positions.title")}
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="titulo text-2xl font-semibold text-ink">
              {t("positions.printTitle", { race: race.name })}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-ink-muted">
              {t("positions.printHint")}{" "}
              {t("positions.printLost")}
            </p>
          </div>
          <BotaoImprimir rotulo={t("positions.print")} />
        </div>

        {!enderecoApp ? (
          <Aviso
            tone="warn"
            titulo={t("positions.printNoUrlTitle")}
            className="mt-5"
          >
            {t("positions.printNoUrlBody", { variable: "NEXT_PUBLIC_APP_URL" })}
          </Aviso>
        ) : null}

        {revogadas > 0 ? (
          <Aviso tone="warn" className="mt-5">
            {t("positions.printMissing", { count: revogadas })}
          </Aviso>
        ) : null}

        {expiradas > 0 ? (
          <Aviso tone="warn" className="mt-5">
            {t("positions.printExpired", { count: expiradas })}
          </Aviso>
        ) : null}

        {validas.length === 0 ? (
          <Aviso
            tone="warn"
            className="mt-5"
            titulo={t("positions.printNothingTitle")}
          >
            {t("positions.printNothingBody")}
          </Aviso>
        ) : null}
      </div>

      <section className="folha-impressao mt-8">
        <header className="cabecalho-folha mb-5 border-b border-border pb-4">
          <h2 className="titulo font-semibold text-ink text-xl">{race.name}</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            {race.location ? `${race.location} · ` : ""}
            <span className="tnum">
              {race.scheduled_start
                ? formatDateTime(race.scheduled_start, locale, race.timezone)
                : ""}
            </span>
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            {t("positions.printInstruction", {
              url: enderecoMotorista || t("positions.printUrlMissing"),
            })}
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {validas.map((p) => {
            return (
              <article
                key={p.id}
                className="bloco-codigo border border-dashed border-border-strong p-4"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-base font-semibold text-ink">
                    {/* Sem a cor do papel: esta folha sai numa impressora
                        preto-e-branco, e um traço colorido vira cinza claro. */}
                    <VehicleIcon role={p.role} size={17} />
                    {p.label}
                  </p>
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-faint">
                    {/* O marcador de referência só aparece quando ele acrescenta
                        informação: num carro de abertura marcado como abertura,
                        repetir a palavra é ruído no papel. */}
                    {t(`roles.${p.role}.short`)}
                    {p.is_reference_lead && p.role !== "lead_car"
                      ? ` · ${t("roles.lead_car.short")}`
                      : ""}
                    {p.is_reference_sweep && p.role !== "sweep_car"
                      ? ` · ${t("roles.sweep_car.short")}`
                      : ""}
                  </p>
                </div>

                <div className="cartao-codigo mt-3 flex items-center gap-3">
                  {qrPorPosicao.has(p.id) ? (
                    <div
                      className="qr h-24 w-24 shrink-0 bg-white p-1"
                      aria-hidden="true"
                      dangerouslySetInnerHTML={{ __html: qrPorPosicao.get(p.id)! }}
                    />
                  ) : null}

                  {/* O CÓDIGO DIGITÁVEL NÃO ENCOLHEU. Ele continua sendo o
                      caminho que funciona com câmera quebrada, lente suja,
                      celular velho ou motorista que nunca escaneou nada — e
                      é ele que alguém lê em voz alta pelo rádio quando o
                      vínculo precisa ser refeito no meio da prova. */}
                  <p className="codigo tnum flex-1 text-center font-mono text-4xl font-bold tracking-[0.15em] text-ink">
                    {formatBindCode(p.bind_code)}
                  </p>
                </div>

                <p className="mt-3 text-xs text-ink-muted">
                  {enderecoMotorista || t("positions.printUrlMissing")}
                </p>

                <p className="mt-1 text-xs text-ink-faint">
                  {p.driver_name || `${t("positions.driverName")}: ___________`}
                  {p.driver_phone ? ` · ${p.driver_phone}` : ""}
                  {p.vehicle_plate ? ` · ${p.vehicle_plate}` : ""}
                </p>
              </article>
            );
          })}
        </div>

        <p className="rodape-folha mt-6 text-xs text-ink-faint">
          {t("meta.appName")} · {t("positions.printFooter")}
        </p>
      </section>
    </main>
  );
}

/**
 * A interface inteira é escura por decisão de projeto (ver `globals.css`), e
 * escuro no papel é uma folha preta e um cartucho vazio. Estas regras existem
 * só para a impressão: fundo branco, texto preto, sem a casca do aplicativo.
 */
const ESTILO_IMPRESSAO = `
@media print {
  @page { size: A4 portrait; margin: 12mm; }

  html, body {
    background: #ffffff !important;
    color: #000000 !important;
  }

  .nao-imprimir { display: none !important; }

  main { max-width: none !important; padding: 0 !important; margin: 0 !important; }

  .folha-impressao,
  .folha-impressao * {
    color: #000000 !important;
    background: transparent !important;
  }

  .cabecalho-folha { border-color: #000000 !important; }

  .bloco-codigo {
    border-color: #444444 !important;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .codigo { letter-spacing: 0.18em; }

  /* O QR NO PAPEL.
     28mm é o tamanho em que um celular comum lê à distância de leitura
     natural — de pé, com a folha na mão. Menor que isso obriga a aproximar,
     e aproximar no escuro de um estacionamento às seis da manhã é onde a
     leitura falha. O branco e forcado porque a regra de fundo
     transparente ali em cima, que existe para nao gastar tinta, apagaria
     justamente o fundo que o QR precisa ter. */
  .qr {
    width: 28mm;
    height: 28mm;
    background: #ffffff !important;
    break-inside: avoid;
  }

  .qr svg { width: 100%; height: 100%; display: block; }

  .cartao-codigo {
    display: flex;
    align-items: center;
    gap: 4mm;
  }

  .cartao-codigo .codigo {
    flex: 1;
    margin: 0;
  }
}
`;
