"use client";

import { useEffect, useState, useTransition } from "react";

import { Botao } from "@/components/director/ui";
import { useT } from "@/lib/i18n/client";

import { MapaDeBloqueios } from "./MapaDeBloqueios";

import {
  acrescentar,
  alternar,
  detectar,
  remover,
  renomear,
  type Resultado as Resposta,
} from "./actions";

export interface PontoNaTela {
  id: string;
  offsetM: number;
  nome: string | null;
  detectado: boolean;
  ativo: boolean;
  /** Onde o quilômetro cai no mapa. Nulo se o percurso não resolveu. */
  lat: number | null;
  lng: number | null;
}

/**
 * Podar, nomear e acrescentar pontos de bloqueio.
 *
 * É usada uma vez por prova, na mesa, com o documento da prefeitura ao lado —
 * não em movimento e não sob pressão.
 *
 * NASCEU SEM MAPA, com o argumento de que a pessoa está conferindo uma lista
 * contra outra lista. Era meia verdade e a metade que faltava derrubava a
 * tela: a lista da prefeitura traz NOMES, e quem nunca dirigiu aquele trecho
 * não liga "km 37,4" a lugar nenhum. Sem saber onde o ponto fica, manter ou
 * desligar vira sorteio — e foi exatamente o que aconteceu no primeiro uso.
 *
 * A seleção anda nos dois sentidos: clicar no quilômetro aproxima o ponto no
 * mapa, clicar no ponto marca a linha.
 *
 * DESLIGAR NÃO É APAGAR. O que veio da detecção só pode ser desligado, porque
 * apagar faria a próxima detecção trazer tudo de volta e o trabalho de podar
 * teria que ser refeito. Remover existe só para o que foi cadastrado à mão.
 *
 * LIGAR E DESLIGAR ACONTECE NA HORA, no estado local, e o servidor confirma por
 * baixo. Antes cada caixa disparava revalidação da rota inteira: a tela piscava
 * duas vezes antes de a caixa mudar, e quem estava podando cem pontos apanhava
 * a cada linha. Só o que muda a LISTA — detectar, acrescentar, remover — espera
 * o servidor, porque aí a tela realmente não sabe o resultado.
 */
export function EditorDeBloqueios({
  raceId,
  pontos: pontosDoServidor,
  distanciaM,
  rota,
  basemap,
}: {
  raceId: string;
  pontos: PontoNaTela[];
  distanciaM: number;
  rota: [number, number][];
  basemap?: string | null;
}) {
  const t = useT();
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const [pontos, setPontos] = useState(pontosDoServidor);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  // Detectar, acrescentar e remover revalidam a rota, e é por aqui que a lista
  // nova chega. Sem isto o estado local ficaria preso na primeira renderização.
  useEffect(() => setPontos(pontosDoServidor), [pontosDoServidor]);

  const [novoKm, setNovoKm] = useState("");
  const [novoNome, setNovoNome] = useState("");

  const totalKm = distanciaM / 1000;

  const executar = (fn: () => Promise<Resposta>) => {
    setErro(null);
    setAviso(null);
    iniciar(async () => {
      const r = await fn();
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      if (r.novos === undefined) return;

      /*
       * A VARREDURA CONTA ONDE PAROU.
       *
       * O Overpass público não dá conta de um percurso longo de uma vez — ver
       * a medição em `overpass.ts` —, então cada toque avança um trecho. Sem
       * esta frase, tocar de novo pareceria repetir uma operação que já tinha
       * dado certo, e ninguém tocaria: a lista ficaria pela metade sem que a
       * pessoa soubesse que faltava metade.
       */
      const achou =
        r.novos === 0
          ? t("blockpoints.detectedNone")
          : t("blockpoints.detected", { n: r.novos });

      const andamento =
        r.completo === false && r.ateKm !== undefined && r.totalKm !== undefined
          ? " " + t("blockpoints.partial", { ate: r.ateKm, total: r.totalKm })
          : r.completo
            ? " " + t("blockpoints.swept")
            : "";

      setAviso(achou + andamento);
    });
  };

  const adicionar = () => {
    const km = Number(novoKm.replace(",", "."));
    if (!Number.isFinite(km) || km < 0) return;

    if (km > totalKm) {
      setErro(t("blockpoints.outOfRoute", { km: totalKm.toFixed(1) }));
      return;
    }

    executar(async () => {
      const r = await acrescentar(raceId, km * 1000, novoNome.trim() || null);
      if (!r.erro) {
        setNovoKm("");
        setNovoNome("");
      }
      return r;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Botao
          type="button"
          variant="secondary"
          size="sm"
          disabled={pendente}
          onClick={() => executar(() => detectar(raceId))}
        >
          {pendente
            ? t("blockpoints.detecting")
            : pontos.length === 0
              ? t("blockpoints.detect")
              : t("blockpoints.detectAgain")}
        </Botao>
        <span className="text-xs text-ink-faint">
          {totalKm.toFixed(1)} km · OpenStreetMap
        </span>
      </div>

      {aviso ? <p className="text-sm text-ok">{aviso}</p> : null}
      {erro ? <p className="text-sm text-critical">{erro}</p> : null}

      {rota.length > 1 ? (
        <MapaDeBloqueios
          rota={rota}
          pontos={pontos
            .filter((p) => p.lat !== null && p.lng !== null)
            .map((p) => ({ id: p.id, lat: p.lat!, lng: p.lng!, ativo: p.ativo }))}
          selecionado={selecionado}
          onSelecionar={setSelecionado}
          basemap={basemap}
          className="h-72 w-full border border-border sm:h-96"
        />
      ) : null}

      {pontos.length === 0 ? (
        <p className="border border-border bg-surface-1 px-4 py-6 text-center text-sm text-ink-muted">
          {t("blockpoints.empty")}
        </p>
      ) : (
        <ul className="border border-border">
          {pontos.map((p) => (
            <Linha
              key={p.id}
              raceId={raceId}
              p={p}
              pendente={pendente}
              executar={executar}
              selecionado={selecionado === p.id}
              onSelecionar={() => setSelecionado(p.id)}
              onAlternar={(ativo) => {
                // A tela muda AGORA. O servidor confirma por baixo, e se
                // recusar o erro aparece — mas quem clicou não espera.
                setPontos((atual) =>
                  atual.map((x) => (x.id === p.id ? { ...x, ativo } : x)),
                );
                void alternar(raceId, p.id, ativo).then((r) => {
                  if (r.erro) {
                    setErro(r.erro);
                    setPontos((atual) =>
                      atual.map((x) =>
                        x.id === p.id ? { ...x, ativo: !ativo } : x,
                      ),
                    );
                  }
                });
              }}
            />
          ))}
        </ul>
      )}

      <div className="border border-border bg-surface-1 p-4">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-ink-muted">
          {t("blockpoints.add")}
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-faint">{t("blockpoints.km")}</span>
            <input
              type="number"
              min={0}
              max={Math.ceil(totalKm)}
              step="0.1"
              value={novoKm}
              onChange={(e) => setNovoKm(e.target.value)}
              className="tnum h-10 w-24 border border-border bg-surface-0 px-2 text-sm text-ink"
            />
          </label>
          <label className="flex min-w-48 flex-1 flex-col gap-1">
            <span className="text-xs text-ink-faint">{t("blockpoints.name")}</span>
            <input
              type="text"
              value={novoNome}
              maxLength={120}
              placeholder={t("blockpoints.namePlaceholder")}
              onChange={(e) => setNovoNome(e.target.value)}
              className="h-10 w-full border border-border bg-surface-0 px-2 text-sm text-ink"
            />
          </label>
          <Botao
            type="button"
            variant="primary"
            size="sm"
            disabled={pendente || novoKm.trim() === ""}
            onClick={adicionar}
          >
            {t("blockpoints.add")}
          </Botao>
        </div>
      </div>
    </div>
  );
}

function Linha({
  raceId,
  p,
  pendente,
  executar,
  selecionado,
  onSelecionar,
  onAlternar,
}: {
  raceId: string;
  p: PontoNaTela;
  pendente: boolean;
  executar: (fn: () => Promise<Resposta>) => void;
  selecionado: boolean;
  onSelecionar: () => void;
  onAlternar: (ativo: boolean) => void;
}) {
  const t = useT();
  const [nome, setNome] = useState(p.nome ?? "");

  const sujo = nome.trim() !== (p.nome ?? "");

  return (
    <li
      className={`flex flex-wrap items-center gap-3 border-b border-border/60 px-3 py-2.5 last:border-b-0 ${
        p.ativo ? "" : "opacity-45"
      } ${selecionado ? "bg-surface-3" : ""}`}
    >
      <button
        type="button"
        onClick={onSelecionar}
        title={t("blockpoints.km")}
        className="tnum w-14 shrink-0 text-left text-sm text-ink-muted underline decoration-transparent underline-offset-4 transition hover:decoration-current"
      >
        {(p.offsetM / 1000).toFixed(1)}
      </button>

      <input
        type="text"
        value={nome}
        maxLength={120}
        placeholder={t("blockpoints.unnamed")}
        onChange={(e) => setNome(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && sujo) {
            executar(() => renomear(raceId, p.id, nome));
          }
        }}
        className="h-9 min-w-40 flex-1 border border-transparent bg-transparent px-1 text-sm text-ink transition hover:border-border focus:border-border-strong focus:bg-surface-0"
      />

      {sujo ? (
        <Botao
          type="button"
          variant="primary"
          size="sm"
          disabled={pendente}
          onClick={() => executar(() => renomear(raceId, p.id, nome))}
        >
          {pendente ? t("blockpoints.saving") : t("common.save")}
        </Botao>
      ) : null}

      {p.detectado ? (
        <span className="rounded border border-border bg-surface-2 px-1.5 py-px text-[10px] text-ink-faint">
          {t("blockpoints.detectedTag")}
        </span>
      ) : null}

      <label className="flex shrink-0 items-center gap-1.5 text-xs text-ink-muted">
        <input
          type="checkbox"
          checked={p.ativo}
          onChange={(e) => onAlternar(e.target.checked)}
          className="h-4 w-4"
        />
        {t("blockpoints.active")}
      </label>

      {/* Só o cadastrado à mão pode sumir. Ver a nota no topo. */}
      {!p.detectado ? (
        <button
          type="button"
          disabled={pendente}
          onClick={() => executar(() => remover(raceId, p.id))}
          className="text-xs text-ink-faint underline underline-offset-4 transition hover:text-critical"
        >
          {t("blockpoints.remove")}
        </button>
      ) : null}
    </li>
  );
}
