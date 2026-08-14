"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  MAX_DRAWN_POINTS,
  MAX_UPLOAD_POINTS,
  RENDER_POINT_BUDGET,
  toWirePoints,
  type TrackUploadResult,
  type WirePoint,
} from "@/app/(director)/_lib/track-payload";
import {
  formatElevationGain,
  formatInteger,
} from "@/app/(director)/_lib/format";
import { Aviso, Botao, Cartao } from "@/components/director/ui";
import { useFormat, useI18n, useT } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translate";
import { RouteDrawMap } from "@/components/map/RouteDrawMap";
import { haversineMeters, type LatLng } from "@/lib/geo/distance";
import { simplifyToBudget } from "@/lib/geo/simplify";
import { GpxParseError, parseGpx, type GpxSegment } from "@/lib/gpx/parse";
import { RouteTrackError, buildRouteTrack } from "@/lib/route/track";

/**
 * Tela de percurso.
 *
 * A ordem da tela é a ordem da vida real: o percurso de uma prova organizada
 * JÁ EXISTE em arquivo — veio do software de traçado, do Strava do diretor de
 * percurso, da prefeitura. Por isso o GPX é a ação primária e ocupa o centro.
 * Desenhar no mapa é a saída para quando o arquivo ainda não existe, e fica
 * subordinado: continua a um clique, mas não disputa atenção.
 *
 * Todo o processamento pesado acontece aqui, no browser, e não no servidor:
 * o diretor vê a distância e o traçado ANTES de gravar. Um GPX que trouxe a
 * volta para casa junto com a prova aparece na tela como um apêndice esquisito
 * em vez de virar 30 km fantasma no cálculo da janela.
 */

export interface TrackAtual {
  id: string;
  name: string | null;
  source: "gpx" | "drawn";
  originalFilename: string | null;
  totalDistanceM: number;
  pointCount: number;
  elevationGainM: number | null;
  createdAt: string;
  renderPoints: [number, number][];
}

type Modo = "resumo" | "importar" | "desenhar";

interface PreviewImportacao {
  nomeArquivo: string;
  nomeSugerido: string | null;
  segmentos: GpxSegment[];
  indiceEscolhido: number;
  /** Avisos do leitor de GPX — sobrevivem à troca de segmento. */
  avisosDoParse: string[];
  /** Avisos do arquivo + os da montagem do segmento escolhido. */
  avisos: string[];
  /** Pontos crus do segmento escolhido, prontos para enviar. */
  pontosCrus: WirePoint[];
  linhaPreview: LatLng[];
  distanciaM: number;
  ganhoElevacaoM: number | null;
  pontosNoBanco: number;
}

export function PercursoEditor({
  raceId,
  trackAtual,
}: {
  raceId: string;
  trackAtual: TrackAtual | null;
}) {
  const router = useRouter();
  const t = useT();
  const fmt = useFormat();
  const { locale } = useI18n();

  const [modo, setModo] = useState<Modo>(trackAtual ? "resumo" : "importar");
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [resultado, setResultado] = useState<TrackUploadResult | null>(null);

  // --- importação de GPX ---------------------------------------------------
  const [preview, setPreview] = useState<PreviewImportacao | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // --- desenho -------------------------------------------------------------
  const [vertices, setVertices] = useState<LatLng[]>([]);
  const [historico, setHistorico] = useState<LatLng[][]>([]);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [enquadrarEm, setEnquadrarEm] = useState(0);

  const linhaExibida: LatLng[] = useMemo(() => {
    if (modo === "desenhar") return vertices;
    if (modo === "importar" && preview) return preview.linhaPreview;
    if (trackAtual) {
      return trackAtual.renderPoints.map(([lng, lat]) => ({ lat, lng }));
    }
    return [];
  }, [modo, vertices, preview, trackAtual]);

  const centroInicial = useMemo<[number, number] | undefined>(() => {
    const primeiro = linhaExibida[0];
    return primeiro ? [primeiro.lng, primeiro.lat] : undefined;
    // Só o valor inicial importa: o MapCanvas monta uma vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const distanciaDesenhada = useMemo(() => somaDistancia(vertices), [vertices]);

  // Reenquadra sempre que a geometria exibida muda de identidade (importou um
  // arquivo, entrou no modo desenho, salvou). Não a cada vértice movido.
  const chaveEnquadre =
    modo === "importar"
      ? `${preview?.nomeArquivo ?? ""}#${preview?.indiceEscolhido ?? ""}`
      : modo;
  useEffect(() => {
    setEnquadrarEm((n) => n + 1);
  }, [chaveEnquadre]);

  // ------------------------------------------------------------------------
  // Importação
  // ------------------------------------------------------------------------

  const processarArquivo = useCallback(async (arquivo: File) => {
    setErroArquivo(null);
    setResultado(null);
    setErroSalvar(null);
    setLendo(true);

    try {
      const texto = await arquivo.text();

      // Devolve o quadro ao navegador antes da análise, que é síncrona e pode
      // levar centenas de ms num arquivo de dezenas de milhares de pontos.
      await new Promise((r) => setTimeout(r, 0));

      const analisado = parseGpx(texto);

      // Padrão inteligente: o segmento mais longo. Num GPX exportado de
      // relógio, os curtos costumam ser o deslocamento até a largada.
      let melhor = 0;
      for (let i = 1; i < analisado.segments.length; i++) {
        if (
          (analisado.segments[i]?.points.length ?? 0) >
          (analisado.segments[melhor]?.points.length ?? 0)
        ) {
          melhor = i;
        }
      }

      setPreview(
        montarPreview(
          arquivo.name,
          analisado.metadataName,
          analisado.segments,
          melhor,
          analisado.warnings,
        ),
      );
    } catch (e) {
      setPreview(null);
      setErroArquivo(mensagemDeErroDeArquivo(e));
    } finally {
      setLendo(false);
    }
  }, []);

  const escolherSegmento = useCallback(
    (indice: number) => {
      setPreview((atual) => {
        if (!atual) return atual;
        try {
          return montarPreview(
            atual.nomeArquivo,
            atual.nomeSugerido,
            atual.segmentos,
            indice,
            atual.avisosDoParse,
          );
        } catch (e) {
          setErroArquivo(mensagemDeErroDeArquivo(e));
          return atual;
        }
      });
    },
    [],
  );

  // ------------------------------------------------------------------------
  // Desenho
  // ------------------------------------------------------------------------

  const comitar = useCallback((proximos: LatLng[]) => {
    setVertices((atual) => {
      setHistorico((h) => [...h.slice(-49), atual]);
      return proximos;
    });
  }, []);

  const desfazer = useCallback(() => {
    setHistorico((h) => {
      if (h.length === 0) return h;
      const anterior = h[h.length - 1]!;
      setVertices(anterior);
      setSelecionado(null);
      return h.slice(0, -1);
    });
  }, []);

  const apagarSelecionado = useCallback(() => {
    setSelecionado((sel) => {
      if (sel === null) return sel;
      setVertices((atual) => {
        setHistorico((h) => [...h.slice(-49), atual]);
        return atual.filter((_, i) => i !== sel);
      });
      return null;
    });
  }, []);

  useEffect(() => {
    if (modo !== "desenhar") return;

    const aoTeclar = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      // Ctrl+Z dentro de um campo de texto é do campo, não do mapa.
      if (
        alvo &&
        (alvo.tagName === "INPUT" ||
          alvo.tagName === "TEXTAREA" ||
          alvo.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        desfazer();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        apagarSelecionado();
        return;
      }
      if (e.key === "Escape") {
        setSelecionado(null);
      }
    };

    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [modo, desfazer, apagarSelecionado]);

  const fechar = useCallback(() => {
    setVertices((atual) => {
      if (atual.length < 3) return atual;
      const primeiro = atual[0]!;
      const ultimo = atual[atual.length - 1]!;
      if (haversineMeters(primeiro, ultimo) < 1) return atual;
      setHistorico((h) => [...h.slice(-49), atual]);
      return [...atual, { ...primeiro }];
    });
  }, []);

  const limpar = useCallback(() => {
    setVertices((atual) => {
      if (atual.length === 0) return atual;
      setHistorico((h) => [...h.slice(-49), atual]);
      return [];
    });
    setSelecionado(null);
  }, []);

  // ------------------------------------------------------------------------
  // Gravação
  // ------------------------------------------------------------------------

  const salvar = useCallback(
    async (corpo: {
      source: "gpx" | "drawn";
      name: string | null;
      originalFilename: string | null;
      points: WirePoint[];
    }) => {
      setSalvando(true);
      setErroSalvar(null);
      setResultado(null);

      try {
        const resposta = await fetch(`/api/races/${raceId}/track`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(corpo),
        });

        const dados = (await resposta.json().catch(() => null)) as
          | (TrackUploadResult & { error?: string })
          | null;

        if (!resposta.ok || !dados || dados.error) {
          setErroSalvar(
            dados?.error ??
              "Não foi possível gravar o percurso. Verifique a conexão e tente de novo.",
          );
          return;
        }

        setResultado(dados);
        setPreview(null);
        setVertices([]);
        setHistorico([]);
        setSelecionado(null);
        setModo("resumo");
        router.refresh();
      } catch {
        setErroSalvar(
          "A conexão caiu no meio do envio. O percurso anterior continua valendo — tente de novo.",
        );
      } finally {
        setSalvando(false);
      }
    },
    [raceId, router],
  );

  // ------------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {resultado ? (
        /* i18n: precisa de chave — confirmação "Percurso gravado" e o aviso de
           que o percurso anterior foi desativado. */
        <Aviso tone="ok" titulo="Percurso gravado">
          <span className="tnum">
            {fmt.distance(resultado.totalDistanceM)}
          </span>{" "}
          ·{" "}
          <span className="tnum">
            {t("route.pointCount", {
              count: formatInteger(resultado.pointCount, locale),
            })}
          </span>{" "}
          ·{" "}
          <span className="tnum">
            {formatElevationGain(resultado.elevationGainM, locale)}
          </span>
          {resultado.replacedTrackId
            ? " · o percurso anterior foi desativado."
            : ""}
        </Aviso>
      ) : null}

      {erroSalvar ? (
        /* i18n: precisa de chave — título "Não deu para gravar" */
        <Aviso tone="warn" titulo="Não deu para gravar">
          {erroSalvar}
        </Aviso>
      ) : null}

      {modo === "resumo" && trackAtual ? (
        <ResumoDoPercurso
          t={t}
          locale={locale}
          track={trackAtual}
          onTrocar={() => {
            setModo("importar");
            setPreview(null);
            setErroArquivo(null);
          }}
          onDesenhar={() => {
            setModo("desenhar");
            setVertices([]);
            setHistorico([]);
          }}
          linha={linhaExibida}
          centroInicial={centroInicial}
          enquadrarEm={enquadrarEm}
        />
      ) : null}

      {modo === "importar" ? (
        <div className="space-y-6">
          {preview ? (
            <PreviewDaImportacao
              t={t}
              locale={locale}
              preview={preview}
              onEscolherSegmento={escolherSegmento}
              onTrocarArquivo={() => {
                setPreview(null);
                setErroArquivo(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              onConfirmar={() =>
                salvar({
                  source: "gpx",
                  name: preview.nomeSugerido,
                  originalFilename: preview.nomeArquivo,
                  points: preview.pontosCrus,
                })
              }
              salvando={salvando}
              linha={linhaExibida}
              centroInicial={centroInicial}
              enquadrarEm={enquadrarEm}
            />
          ) : (
            <AreaDeSoltar
              t={t}
              lendo={lendo}
              arrastando={arrastando}
              erro={erroArquivo}
              inputRef={inputRef}
              onArquivo={processarArquivo}
              setArrastando={setArrastando}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <p className="text-sm text-ink-muted">
              {/* i18n: precisa de chave — "Ainda não tem o arquivo do percurso?" */}
              Ainda não tem o arquivo do percurso?{" "}
              <button
                type="button"
                onClick={() => {
                  setModo("desenhar");
                  setPreview(null);
                  setVertices([]);
                  setHistorico([]);
                }}
                className="text-info underline underline-offset-4"
              >
                {t("route.drawInstead")}
              </button>
            </p>

            {trackAtual ? (
              <Botao
                type="button"
                variant="quiet"
                onClick={() => {
                  setModo("resumo");
                  setPreview(null);
                  setErroArquivo(null);
                }}
              >
                {t("common.cancel")}
              </Botao>
            ) : null}
          </div>
        </div>
      ) : null}

      {modo === "desenhar" ? (
        <EditorDeDesenho
          t={t}
          fmt={fmt}
          vertices={vertices}
          selecionado={selecionado}
          distanciaM={distanciaDesenhada}
          podeDesfazer={historico.length > 0}
          salvando={salvando}
          centroInicial={centroInicial}
          enquadrarEm={enquadrarEm}
          onSelecionar={setSelecionado}
          onCommit={comitar}
          onPreview={setVertices}
          onDesfazer={desfazer}
          onApagarVertice={apagarSelecionado}
          onFechar={fechar}
          onLimpar={limpar}
          onEnquadrar={() => setEnquadrarEm((n) => n + 1)}
          onCancelar={() => {
            setModo(trackAtual ? "resumo" : "importar");
            setVertices([]);
            setHistorico([]);
            setSelecionado(null);
          }}
          onSalvar={() =>
            salvar({
              source: "drawn",
              name: "Traçado desenhado no mapa",
              originalFilename: null,
              points: vertices.map((p) => [p.lat, p.lng, null]),
            })
          }
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Blocos
// ---------------------------------------------------------------------------

function ResumoDoPercurso({
  t,
  locale,
  track,
  onTrocar,
  onDesenhar,
  linha,
  centroInicial,
  enquadrarEm,
}: {
  t: Translator;
  locale: Locale;
  track: TrackAtual;
  onTrocar: () => void;
  onDesenhar: () => void;
  linha: LatLng[];
  centroInicial?: [number, number];
  enquadrarEm: number;
}) {
  const fmt = useFormat();

  return (
    <Cartao className="overflow-hidden">
      <div className="border-b border-border p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="titulo font-semibold text-ink text-xl">
              {t("route.current")}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {/* i18n: precisa de chave — origem do percurso */}
              {track.source === "gpx"
                ? `Importado de ${track.originalFilename ?? "arquivo GPX"}`
                : "Desenhado no mapa"}
              {track.name ? ` · ${track.name}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Botao type="button" variant="secondary" onClick={onTrocar}>
              {t("route.replace")}
            </Botao>
          </div>
        </div>

        <dl className="mt-5 grid gap-5 sm:grid-cols-3">
          <div>
            <dt className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-faint">
              {t("race.distance")}
            </dt>
            <dd className="medido tnum mt-1 text-3xl text-ink">
              {fmt.distance(track.totalDistanceM)}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-faint">
              {t("race.elevation")}
            </dt>
            <dd className="medido tnum mt-1 text-3xl text-ink">
              {formatElevationGain(track.elevationGainM, locale)}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-faint">
              {/* i18n: precisa de chave — "Pontos de geometria" */}
              Pontos de geometria
            </dt>
            <dd className="medido tnum mt-1 text-3xl text-ink">
              {formatInteger(track.pointCount, locale)}
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-xs text-ink-faint">
          {t("route.replaceWarning")}{" "}
          <button
            type="button"
            onClick={onDesenhar}
            className="text-info underline underline-offset-4"
          >
            {t("route.drawInstead")}
          </button>
        </p>
      </div>

      <RouteDrawMap
        vertices={linha}
        selecionado={null}
        onSelecionar={() => {}}
        onCommit={() => {}}
        onPreview={() => {}}
        somenteLeitura
        centroInicial={centroInicial}
        enquadrarEm={enquadrarEm}
        className="h-[380px] w-full"
      />
    </Cartao>
  );
}

function AreaDeSoltar({
  t,
  lendo,
  arrastando,
  erro,
  inputRef,
  onArquivo,
  setArrastando,
}: {
  t: Translator;
  lendo: boolean;
  arrastando: boolean;
  erro: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onArquivo: (f: File) => void;
  setArrastando: (v: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          const arquivo = e.dataTransfer.files?.[0];
          if (arquivo) onArquivo(arquivo);
        }}
        className={`border-2 border-dashed transition ${
          arrastando
            ? "border-info bg-info/10"
            : "border-border-strong bg-surface-1"
        }`}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={lendo}
          className="flex w-full flex-col items-center justify-center gap-3 px-6 py-14 text-center disabled:cursor-wait"
        >
          <span className="text-4xl" aria-hidden>
            {lendo ? "⏳" : "📄"}
          </span>
          <span className="text-lg font-semibold text-ink">
            {lendo ? t("common.loading") : t("route.uploadDrop")}
          </span>
          <span className="max-w-md text-sm text-ink-muted">
            {/* i18n: precisa de chave — subtexto da área de soltar (lista de
                origens de arquivo aceitas) */}
            {lendo
              ? "Arquivos grandes levam alguns segundos."
              : "Ou clique para escolher. Serve o que sai do Strava, Garmin Connect, RideWithGPS, Komoot ou do software de traçado da prova."}
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept=".gpx,application/gpx+xml,text/xml"
          className="sr-only"
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            if (arquivo) onArquivo(arquivo);
          }}
        />
      </div>

      {erro ? (
        <Aviso tone="warn" titulo={t("route.parseError")}>
          {erro}
        </Aviso>
      ) : null}
    </div>
  );
}

function PreviewDaImportacao({
  t,
  locale,
  preview,
  onEscolherSegmento,
  onTrocarArquivo,
  onConfirmar,
  salvando,
  linha,
  centroInicial,
  enquadrarEm,
}: {
  t: Translator;
  locale: Locale;
  preview: PreviewImportacao;
  onEscolherSegmento: (i: number) => void;
  onTrocarArquivo: () => void;
  onConfirmar: () => void;
  salvando: boolean;
  linha: LatLng[];
  centroInicial?: [number, number];
  enquadrarEm: number;
}) {
  const fmt = useFormat();

  return (
    <Cartao className="overflow-hidden">
      <div className="border-b border-border p-5 sm:p-6">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-faint">
          {/* i18n: precisa de chave — "Conferindo antes de gravar" */}
          Conferindo antes de gravar
        </p>
        <h2 className="titulo mt-1 font-semibold text-ink text-xl">
          {preview.nomeArquivo}
        </h2>

        <dl className="mt-5 grid gap-5 sm:grid-cols-3">
          <div>
            <dt className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-faint">
              {t("race.distance")}
            </dt>
            <dd className="medido tnum mt-1 text-3xl text-ink">
              {fmt.distance(preview.distanciaM)}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-faint">
              {t("race.elevation")}
            </dt>
            <dd className="medido tnum mt-1 text-3xl text-ink">
              {formatElevationGain(preview.ganhoElevacaoM, locale)}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-faint">
              {/* i18n: precisa de chave — "Pontos de geometria" */}
              Pontos de geometria
            </dt>
            <dd className="medido tnum mt-1 text-3xl text-ink">
              {formatInteger(preview.pontosNoBanco, locale)}
            </dd>
          </div>
        </dl>

        {preview.segmentos.length > 1 ? (
          <fieldset className="mt-6 border border-border bg-surface-2 p-4">
            <legend className="px-1 text-sm font-medium text-ink">
              {t("route.chooseSegment")}
            </legend>
            <p className="mt-1 text-xs text-ink-faint">
              {/* i18n: precisa de chave — por que os traçados não são unidos */}
              O arquivo tem {preview.segmentos.length} traçados. Juntar todos
              criaria um salto no meio da prova, então escolha um.
            </p>
            <div className="mt-3 space-y-2">
              {preview.segmentos.map((seg, i) => (
                <label
                  key={i}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 border px-3 py-2 ${
                    i === preview.indiceEscolhido
                      ? "border-info bg-info/10"
                      : "border-border hover:border-border-strong"
                  }`}
                >
                  <input
                    type="radio"
                    name="segmento"
                    checked={i === preview.indiceEscolhido}
                    onChange={() => onEscolherSegmento(i)}
                    className="h-4 w-4"
                  />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block truncate font-medium text-ink">
                      {/* i18n: precisa de chave — "Traçado {n}" */}
                      {seg.name ?? `Traçado ${i + 1}`}
                    </span>
                    <span className="tnum block text-xs text-ink-faint">
                      {t("route.pointCount", {
                        count: formatInteger(seg.points.length, locale),
                      })}{" "}
                      ·{" "}
                      {/* i18n: precisa de chave — tipo do traçado no GPX
                          (trilha gravada / rota planejada / waypoints soltos) */}
                      {seg.kind === "track"
                        ? "trilha gravada"
                        : seg.kind === "route"
                          ? "rota planejada"
                          : "waypoints soltos"}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {preview.avisos.length > 0 ? (
          <Aviso
            tone="warn"
            /* i18n: precisa de chave — "N pontos de atenção neste arquivo" */
            titulo={
              preview.avisos.length === 1
                ? "Um ponto de atenção neste arquivo"
                : `${preview.avisos.length} pontos de atenção neste arquivo`
            }
            className="mt-6"
          >
            <ul className="list-disc space-y-1 pl-5">
              {preview.avisos.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </Aviso>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Botao
            type="button"
            variant="primary"
            size="lg"
            onClick={onConfirmar}
            disabled={salvando}
          >
            {/* i18n: precisa de chave — "Confirmar e usar este percurso" */}
            {salvando ? t("common.saving") : "Confirmar e usar este percurso"}
          </Botao>
          <Botao
            type="button"
            variant="ghost"
            onClick={onTrocarArquivo}
            disabled={salvando}
          >
            {/* i18n: precisa de chave — "Escolher outro arquivo" */}
            Escolher outro arquivo
          </Botao>
        </div>
      </div>

      <RouteDrawMap
        vertices={linha}
        selecionado={null}
        onSelecionar={() => {}}
        onCommit={() => {}}
        onPreview={() => {}}
        somenteLeitura
        centroInicial={centroInicial}
        enquadrarEm={enquadrarEm}
        className="h-[420px] w-full"
      />
    </Cartao>
  );
}

function EditorDeDesenho({
  t,
  fmt,
  vertices,
  selecionado,
  distanciaM,
  podeDesfazer,
  salvando,
  centroInicial,
  enquadrarEm,
  onSelecionar,
  onCommit,
  onPreview,
  onDesfazer,
  onApagarVertice,
  onFechar,
  onLimpar,
  onEnquadrar,
  onCancelar,
  onSalvar,
}: {
  t: Translator;
  fmt: { distance: (m: number | null) => string };
  vertices: LatLng[];
  selecionado: number | null;
  distanciaM: number;
  podeDesfazer: boolean;
  salvando: boolean;
  centroInicial?: [number, number];
  enquadrarEm: number;
  onSelecionar: (i: number | null) => void;
  onCommit: (v: LatLng[]) => void;
  onPreview: (v: LatLng[]) => void;
  onDesfazer: () => void;
  onApagarVertice: () => void;
  onFechar: () => void;
  onLimpar: () => void;
  onEnquadrar: () => void;
  onCancelar: () => void;
  onSalvar: () => void;
}) {
  const excedeu = vertices.length > MAX_DRAWN_POINTS;

  return (
    <Cartao className="overflow-hidden">
      <div className="border-b border-border p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="titulo font-semibold text-ink text-xl">
              {t("route.drawTitle")}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-ink-muted">
              {t("route.drawHint")}{" "}
              {/* i18n: precisa de chave — atalhos de teclado do desenho
                  (Delete apaga o vértice, Ctrl+Z desfaz) */}
              <Tecla>Delete</Tecla> apaga o vértice selecionado (ou clique com o
              botão direito). <Tecla>Ctrl</Tecla>+<Tecla>Z</Tecla> desfaz.
            </p>
          </div>

          <div className="flex gap-6">
            <div>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-faint">
                {t("race.distance")}
              </p>
              <p className="medido tnum mt-0.5 text-2xl text-ink">
                {fmt.distance(distanciaM)}
              </p>
            </div>
            <div>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-faint">
                {/* i18n: precisa de chave — "Vértices" */}
                Vértices
              </p>
              <p className="medido tnum mt-0.5 text-2xl text-ink">
                {vertices.length}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Botao
            type="button"
            variant="primary"
            onClick={onSalvar}
            disabled={salvando || vertices.length < 2 || excedeu}
          >
            {/* i18n: precisa de chave — "Salvar percurso" */}
            {salvando ? t("common.saving") : "Salvar percurso"}
          </Botao>
          <Botao
            type="button"
            variant="secondary"
            onClick={onDesfazer}
            disabled={!podeDesfazer}
          >
            ↶ {t("route.undo")}
          </Botao>
          <Botao
            type="button"
            variant="ghost"
            onClick={onApagarVertice}
            disabled={selecionado === null}
          >
            {/* i18n: precisa de chave — "Apagar vértice" */}
            Apagar vértice
            {selecionado !== null ? ` ${selecionado + 1}` : ""}
          </Botao>
          <Botao
            type="button"
            variant="ghost"
            onClick={onFechar}
            disabled={vertices.length < 3}
          >
            {/* i18n: precisa de chave — "Fechar circuito" */}
            Fechar circuito
          </Botao>
          <Botao
            type="button"
            variant="ghost"
            onClick={onEnquadrar}
            disabled={vertices.length === 0}
          >
            {t("map.fitRoute")}
          </Botao>
          <Botao
            type="button"
            variant="ghost"
            onClick={onLimpar}
            disabled={vertices.length === 0}
          >
            {t("route.clear")}
          </Botao>
          <Botao type="button" variant="quiet" onClick={onCancelar}>
            {t("common.cancel")}
          </Botao>
        </div>

        {/* i18n: precisa de chave — os dois avisos do desenho (excesso de
            vértices e "um vértice só não é percurso") */}
        {excedeu ? (
          <Aviso tone="warn" className="mt-4">
            {vertices.length} vértices é mais do que um traçado desenhado à mão
            deveria ter (limite {MAX_DRAWN_POINTS}). Se o percurso é mesmo
            longo, importe um GPX.
          </Aviso>
        ) : vertices.length === 1 ? (
          <Aviso tone="warn" className="mt-4">
            Um vértice só não é percurso. Clique no mapa para marcar por onde a
            prova passa.
          </Aviso>
        ) : null}
      </div>

      <RouteDrawMap
        vertices={vertices}
        selecionado={selecionado}
        onSelecionar={onSelecionar}
        onCommit={onCommit}
        onPreview={onPreview}
        centroInicial={centroInicial}
        enquadrarEm={enquadrarEm}
        className="h-[520px] w-full"
      />
    </Cartao>
  );
}

function Tecla({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border-strong bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-ink">
      {children}
    </kbd>
  );
}

// ---------------------------------------------------------------------------
// Apoio
// ---------------------------------------------------------------------------

function somaDistancia(pontos: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < pontos.length; i++) {
    total += haversineMeters(pontos[i - 1]!, pontos[i]!);
  }
  return total;
}

function montarPreview(
  nomeArquivo: string,
  metadataName: string | null,
  segmentos: GpxSegment[],
  indice: number,
  avisosDoParse: string[],
): PreviewImportacao {
  const segmento = segmentos[indice];
  if (!segmento) {
    throw new GpxParseError("Traçado escolhido não existe no arquivo.");
  }

  if (segmento.points.length > MAX_UPLOAD_POINTS) {
    throw new GpxParseError(
      `Este traçado tem ${segmento.points.length.toLocaleString("pt-BR")} pontos, acima do limite de ${MAX_UPLOAD_POINTS.toLocaleString("pt-BR")}. Recorte o arquivo para o trecho da prova.`,
    );
  }

  const { track, warnings } = buildRouteTrack(segmento.points);

  const linha = simplifyToBudget(
    track.points.map(([lng, lat]) => ({ lat, lng })),
    RENDER_POINT_BUDGET,
  ).points;

  return {
    nomeArquivo,
    nomeSugerido: segmento.name ?? metadataName ?? null,
    segmentos,
    indiceEscolhido: indice,
    avisosDoParse,
    avisos: [...avisosDoParse, ...warnings],
    pontosCrus: toWirePoints(segmento.points),
    linhaPreview: linha,
    distanciaM: track.totalDistanceM,
    ganhoElevacaoM: track.elevationGainM,
    pontosNoBanco: track.points.length,
  };
}

function mensagemDeErroDeArquivo(e: unknown): string {
  if (e instanceof GpxParseError || e instanceof RouteTrackError) {
    return e.message;
  }
  if (e instanceof Error && e.name === "NotReadableError") {
    return "Não foi possível ler o arquivo do disco. Copie-o para outra pasta e tente de novo.";
  }
  return "Não foi possível interpretar este arquivo. Confirme que é um .gpx e que ele abre em outro programa.";
}
