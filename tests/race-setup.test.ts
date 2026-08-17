import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  isColisaoDeCodigo,
  isColisaoDeOrdinal,
  chaveDeErroDoBanco,
} from "@/app/(director)/_lib/db-errors";
import {
  formatElevationGain,
  formatInteger,
  formatRaceDate,
  normalizePhone,
  normalizePlate,
} from "@/app/(director)/_lib/format";
import { formatDistance, formatDuration } from "@/lib/i18n/format";
import { computeReadiness } from "@/app/(director)/_lib/readiness";
import {
  MAX_UPLOAD_POINTS,
  RENDER_POINT_BUDGET,
  compactTrackPoints,
  fromWirePoints,
  toWirePoints,
  validateWirePoints,
} from "@/app/(director)/_lib/track-payload";
import {
  timeZoneOffsetMs,
  utcToZonedInputs,
  zonedToUtc,
} from "@/app/(director)/_lib/timezone";
import { generateUniqueBindCode, normalizeBindCode } from "@/lib/codes/bind-code";
import { simplifyToBudget } from "@/lib/geo/simplify";
import { parseGpx } from "@/lib/gpx/parse";
import { buildRouteTrack } from "@/lib/route/track";

import { buildHairpinRoute, toGpxXml } from "./fixtures/routes";

// ---------------------------------------------------------------------------
// Prontidão da prova
// ---------------------------------------------------------------------------

describe("computeReadiness", () => {
  const vazio = {
    hasActiveRoute: false,
    positionCount: 0,
    hasReferenceLead: false,
    hasReferenceSweep: false,
    hasScheduledStart: false,
  };

  it("bloqueia uma prova recém-criada e lista o que falta", () => {
    const r = computeReadiness(vazio);
    expect(r.ready).toBe(false);
    expect(r.blocking.map((i) => i.key).sort()).toEqual([
      "lead",
      "positions",
      "route",
      "sweep",
    ]);
    expect(r.doneCount).toBe(0);
    expect(r.requiredCount).toBe(4);
  });

  it("libera com percurso, posições e as duas referências", () => {
    const r = computeReadiness({
      hasActiveRoute: true,
      positionCount: 5,
      hasReferenceLead: true,
      hasReferenceSweep: true,
      hasScheduledStart: false,
    });
    expect(r.ready).toBe(true);
    expect(r.doneCount).toBe(4);
    // Horário de largada é opcional: pendente, mas não bloqueia.
    expect(r.pending.map((i) => i.key)).toEqual(["start"]);
  });

  it("não libera quando só uma das referências está marcada", () => {
    const r = computeReadiness({
      ...vazio,
      hasActiveRoute: true,
      positionCount: 3,
      hasReferenceLead: true,
    });
    expect(r.ready).toBe(false);
    expect(r.blocking.map((i) => i.key)).toEqual(["sweep"]);
  });
});

// ---------------------------------------------------------------------------
// Fuso horário
// ---------------------------------------------------------------------------

describe("zonedToUtc", () => {
  it("converte horário de verão europeu (CEST, UTC+2)", () => {
    const d = zonedToUtc("2026-07-12", "09:30", "Europe/Rome");
    expect(d?.toISOString()).toBe("2026-07-12T07:30:00.000Z");
  });

  it("converte horário padrão europeu (CET, UTC+1)", () => {
    const d = zonedToUtc("2026-01-18", "09:30", "Europe/Rome");
    expect(d?.toISOString()).toBe("2026-01-18T08:30:00.000Z");
  });

  it("acerta a largada logo depois da virada do horário de verão", () => {
    // Em 2026 a Itália entra no horário de verão em 29/03 às 02:00 locais.
    const antes = zonedToUtc("2026-03-29", "01:30", "Europe/Rome");
    const depois = zonedToUtc("2026-03-29", "03:30", "Europe/Rome");
    expect(antes?.toISOString()).toBe("2026-03-29T00:30:00.000Z");
    expect(depois?.toISOString()).toBe("2026-03-29T01:30:00.000Z");
  });

  it("converte fuso do hemisfério sul", () => {
    const d = zonedToUtc("2026-07-12", "06:00", "America/Sao_Paulo");
    expect(d?.toISOString()).toBe("2026-07-12T09:00:00.000Z");
  });

  it("recusa entrada malformada em vez de inventar uma data", () => {
    expect(zonedToUtc("12/07/2026", "09:30", "Europe/Rome")).toBeNull();
    expect(zonedToUtc("2026-07-12", "9h30", "Europe/Rome")).toBeNull();
    expect(zonedToUtc("2026-07-12", "09:30", "Marte/Olympus")).toBeNull();
    expect(zonedToUtc("2026-07-12", "25:00", "Europe/Rome")).toBeNull();
  });

  it("fecha o ciclo com utcToZonedInputs", () => {
    const iso = zonedToUtc("2026-09-05", "14:05", "Europe/Rome")!.toISOString();
    expect(utcToZonedInputs(iso, "Europe/Rome")).toEqual({
      date: "2026-09-05",
      time: "14:05",
    });
  });

  it("mede o offset de UTC como zero", () => {
    expect(timeZoneOffsetMs(new Date("2026-07-12T00:00:00Z"), "UTC")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Erros do banco
// ---------------------------------------------------------------------------

describe("chaveDeErroDoBanco", () => {
  it("explica a colisão de percurso ativo sem falar em índice", () => {
    const r = chaveDeErroDoBanco({
      code: "23505",
      message:
        'duplicate key value violates unique constraint "route_tracks_one_active_per_race"',
    });
    expect(r).toEqual({ chave: "errors.db.routeRaceConflict" });
  });

  it("reconhece os índices de referência única", () => {
    expect(
      chaveDeErroDoBanco({
        code: "23505",
        message: 'violates unique constraint "race_positions_one_lead"',
      }),
    ).toEqual({ chave: "errors.db.oneLead" });
    expect(
      chaveDeErroDoBanco({
        code: "23505",
        message: 'violates unique constraint "race_positions_one_sweep"',
      }),
    ).toEqual({ chave: "errors.db.oneSweep" });
  });

  it("classifica colisão de código e de ordem para permitir nova tentativa", () => {
    const codigo = {
      code: "23505",
      message: 'violates unique constraint "race_positions_bind_code_unique"',
    };
    const ordem = {
      code: "23505",
      message: 'violates unique constraint "race_positions_race_id_ordinal_key"',
    };
    expect(isColisaoDeCodigo(codigo)).toBe(true);
    expect(isColisaoDeOrdinal(codigo)).toBe(false);
    expect(isColisaoDeOrdinal(ordem)).toBe(true);
    expect(isColisaoDeCodigo(ordem)).toBe(false);
  });

  it("traduz violação de RLS em permissão, não em erro técnico", () => {
    expect(chaveDeErroDoBanco({ code: "42501", message: "denied" })).toEqual({
      chave: "errors.forbidden",
    });
  });

  it("cai na chave padrão quando não reconhece o erro", () => {
    expect(chaveDeErroDoBanco({ code: "XX000", message: "boom" })).toEqual({
      chave: "errors.db.saveFailed",
    });
    expect(chaveDeErroDoBanco(null)).toEqual({ chave: "errors.db.saveFailed" });
  });

  // A frase de gatilho é a exceção declarada: ela vem escrita do SQL e passa
  // inteira, sem chave. Se alguém trocar isso por uma chave genérica, o
  // diretor perde a única explicação boa que o banco sabe dar.
  it("deixa passar a frase escrita por um gatilho do schema", () => {
    expect(
      chaveDeErroDoBanco({
        code: "P0001",
        message: "Esta posição já transmitiu e não pode ser removida.",
      }),
    ).toEqual({ texto: "Esta posição já transmitiu e não pode ser removida." });
  });
});

// ---------------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------------

describe("formatação", () => {
  it("usa o separador decimal do idioma na mesma distância", () => {
    // Mesmo número, três idiomas: é isto que quebra quando alguém escreve
    // `toFixed(1) + " km"` à mão em vez de usar o formatador.
    expect(formatDistance(54_869, "pt-BR")).toBe("54,9 km");
    expect(formatDistance(54_869, "it")).toBe("54,9 km");
    expect(formatDistance(54_869, "en")).toBe("54.9 km");
  });

  it("muda a precisão com a grandeza", () => {
    expect(formatDistance(840, "pt-BR")).toBe("840 m");
    expect(formatDistance(1000, "pt-BR")).toBe("1,00 km");
    expect(formatDistance(123_456, "pt-BR")).toBe("123 km");
    expect(formatDistance(null, "pt-BR")).toBe("—");
  });

  it("formata a janela alvo como duração, não como número solto", () => {
    expect(formatDuration(45 * 60, "pt-BR")).toContain("45");
    expect(formatDuration(95 * 60, "pt-BR")).toContain("35");
    expect(formatDuration(null, "pt-BR")).toBe("—");
  });

  it("distingue ganho de elevação de distância percorrida", () => {
    expect(formatElevationGain(null, "pt-BR")).toBe("—");
    expect(formatElevationGain(1156.1, "pt-BR")).toBe("+1.156 m");
    expect(formatElevationGain(1156.1, "en")).toBe("+1,156 m");
  });

  it("mostra a data da largada no fuso da prova, não no do servidor", () => {
    // 23:30 UTC de 4/set é 5/set em Roma — a lista precisa dizer 5.
    const iso = "2026-09-04T23:30:00.000Z";
    expect(formatRaceDate(iso, "pt-BR", "Europe/Rome")).toContain("5");
    expect(formatRaceDate(iso, "pt-BR", "UTC")).toContain("4");
    expect(formatRaceDate(null, "pt-BR", "Europe/Rome")).toBe("—");
  });

  it("agrupa milhares conforme o idioma", () => {
    expect(formatInteger(2174, "pt-BR")).toBe("2.174");
    expect(formatInteger(2174, "en")).toBe("2,174");
  });

  it("limpa telefone e placa sem destruir o que é significativo", () => {
    expect(normalizePhone("+39 (333) 000-0000")).toBe("+393330000000");
    expect(normalizePhone("39+333")).toBe("39333");
    expect(normalizePlate(" ab-123 cd ")).toBe("AB123CD");
  });
});

// ---------------------------------------------------------------------------
// Contrato de envio do percurso
// ---------------------------------------------------------------------------

describe("validateWirePoints", () => {
  it("recusa lista curta demais para ser um percurso", () => {
    expect(validateWirePoints([[44.9, 7.6, null]]).ok).toBe(false);
    expect(validateWirePoints("nada").ok).toBe(false);
  });

  it("aponta qual ponto está errado", () => {
    const r = validateWirePoints([
      [44.9, 7.6, 100],
      [91, 7.6, 100],
    ]);
    expect(r.ok).toBe(false);
    expect(r.error).toContain("ponto 2");
    expect(r.error).toContain("latitude");
  });

  it("recusa percurso acima do teto de pontos", () => {
    const gigante = Array.from({ length: MAX_UPLOAD_POINTS + 1 }, () => [
      44.9, 7.6, null,
    ]);
    const r = validateWirePoints(gigante);
    expect(r.ok).toBe(false);
    expect(r.error).toContain("limite");
  });

  it("aceita elevação ausente e normaliza para null", () => {
    const r = validateWirePoints([
      [44.9, 7.6],
      [44.91, 7.61, "312"],
    ]);
    expect(r.ok).toBe(true);
    expect(r.points?.[0]?.[2]).toBeNull();
    expect(r.points?.[1]?.[2]).toBe(312);
  });

  it("sobrevive à ida e volta pelo formato de fio", () => {
    const original = [
      { lat: 44.7012511, lng: 8.0353874, ele: 250.04 },
      { lat: 44.7013721, lng: 8.0354171, ele: 252.71 },
    ];
    const voltou = fromWirePoints(toWirePoints(original));
    expect(voltou[0]?.lat).toBeCloseTo(44.7012511, 6);
    expect(voltou[1]?.ele).toBeCloseTo(252.7, 1);
  });
});

describe("compactTrackPoints", () => {
  it("encolhe os números sem quebrar a cumulativa crescente", () => {
    const { track } = buildRouteTrack(
      Array.from({ length: 500 }, (_, i) => ({
        lat: 44.9 + i * 0.0001,
        lng: 7.6,
        ele: 300 + i * 0.13,
      })),
    );

    const compacto = compactTrackPoints(track.points);

    expect(compacto.length).toBe(track.points.length);
    for (let i = 1; i < compacto.length; i++) {
      expect(compacto[i]![2]).toBeGreaterThan(compacto[i - 1]![2]);
    }
    // A cumulativa final não pode desviar mais que um milímetro do original —
    // é ela que vira o "quilômetro da prova" de cada veículo.
    expect(compacto[compacto.length - 1]![2]).toBeCloseTo(
      track.totalDistanceM,
      2,
    );

    const antes = JSON.stringify(track.points).length;
    const depois = JSON.stringify(compacto).length;
    expect(depois).toBeLessThan(antes);
  });
});

// ---------------------------------------------------------------------------
// GPX real: Giro delle Langhe (Piemonte), roteado sobre estradas do OSM
// ---------------------------------------------------------------------------

describe("percurso real (tests/fixtures/real-route.gpx)", () => {
  const xml = readFileSync(
    new URL("./fixtures/real-route.gpx", import.meta.url),
    "utf8",
  );

  it("mede entre 54,6 e 55,2 km e fica dentro das Langhe", () => {
    const { segments, warnings } = parseGpx(xml);
    expect(segments.length).toBe(1);
    expect(warnings).toEqual([]);

    const segmento = segments[0]!;
    expect(segmento.kind).toBe("track");
    expect(segmento.points.length).toBe(2175);

    const { track } = buildRouteTrack(segmento.points);

    expect(track.totalDistanceM).toBeGreaterThan(54_600);
    expect(track.totalDistanceM).toBeLessThan(55_200);

    expect(track.bbox.minLat).toBeGreaterThanOrEqual(44.5);
    expect(track.bbox.maxLat).toBeLessThanOrEqual(44.8);
    expect(track.bbox.minLng).toBeGreaterThanOrEqual(7.8);
    expect(track.bbox.maxLng).toBeLessThanOrEqual(8.1);

    expect(track.elevationGainM).not.toBeNull();
    expect(track.elevationGainM!).toBeGreaterThan(0);
  });

  it("cabe no orçamento de pontos do mapa sem encurtar a geometria de cálculo", () => {
    const { segments } = parseGpx(xml);
    const { track } = buildRouteTrack(segments[0]!.points);

    const render = simplifyToBudget(
      track.points.map(([lng, lat]) => ({ lat, lng })),
      RENDER_POINT_BUDGET,
    );

    expect(render.points.length).toBeLessThanOrEqual(RENDER_POINT_BUDGET);
    // A geometria completa continua completa: simplificar só serve para desenhar.
    expect(track.points.length).toBeGreaterThan(2000);
  });

  it("é o mesmo percurso depois de atravessar o formato de fio", () => {
    const { segments } = parseGpx(xml);
    const direto = buildRouteTrack(segments[0]!.points).track;
    const viaRede = buildRouteTrack(
      fromWirePoints(toWirePoints(segments[0]!.points)),
    ).track;

    // 7 casas de coordenada são ~1 cm por ponto; em 55 km o desvio acumulado
    // tem que continuar na casa dos centímetros.
    expect(viaRede.totalDistanceM).toBeCloseTo(direto.totalDistanceM, 0);
  });
});

// ---------------------------------------------------------------------------
// GPX sintético e arquivos grandes
// ---------------------------------------------------------------------------

describe("importação de GPX sintético", () => {
  it("recupera o comprimento conhecido do percurso em grampo", () => {
    const rota = buildHairpinRoute(10);
    const xml = toGpxXml(rota.points, { name: "Grampo" });

    const { segments } = parseGpx(xml);
    const { track } = buildRouteTrack(segments[0]!.points);

    const esperado = rota.marks.finish;
    expect(Math.abs(track.totalDistanceM - esperado)).toBeLessThan(
      esperado * 0.005,
    );
  });

  it("deixa o diretor escolher entre dois percursos no mesmo arquivo", () => {
    const curto = buildHairpinRoute(200).points.slice(0, 6);
    const longo = buildHairpinRoute(10).points;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="teste" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>Deslocamento</name><trkseg>
${curto.map((p) => `<trkpt lat="${p.lat}" lon="${p.lng}"></trkpt>`).join("\n")}
  </trkseg></trk>
  <trk><name>Prova</name><trkseg>
${longo.map((p) => `<trkpt lat="${p.lat}" lon="${p.lng}"></trkpt>`).join("\n")}
  </trkseg></trk>
</gpx>`;

    const resultado = parseGpx(xml);
    expect(resultado.segments.length).toBe(2);
    expect(resultado.warnings.join(" ")).toContain("Escolha qual");

    // O padrão da interface é o segmento mais longo — aqui, o da prova.
    const maisLongo = resultado.segments.reduce((a, b) =>
      b.points.length > a.points.length ? b : a,
    );
    expect(maisLongo.name).toBe("Prova");
  });
});

describe("GPX grande", () => {
  it("processa mais de 10 mil pontos e ainda cabe no orçamento do mapa", () => {
    const rota = buildHairpinRoute(1);
    expect(rota.points.length).toBeGreaterThan(10_000);

    const xml = toGpxXml(rota.points, { name: "Grande" });
    const inicio = Date.now();

    const { segments } = parseGpx(xml);
    const { track } = buildRouteTrack(segments[0]!.points);
    const render = simplifyToBudget(
      track.points.map(([lng, lat]) => ({ lat, lng })),
      RENDER_POINT_BUDGET,
    );

    const decorrido = Date.now() - inicio;

    expect(track.points.length).toBeGreaterThan(10_000);
    expect(render.points.length).toBeLessThanOrEqual(RENDER_POINT_BUDGET);
    expect(Math.abs(track.totalDistanceM - rota.marks.finish)).toBeLessThan(
      rota.marks.finish * 0.005,
    );

    // Folga enorme de propósito: o número serve para pegar uma regressão de
    // ordem de grandeza (algo virar O(n²)), não para medir a máquina.
    expect(decorrido).toBeLessThan(15_000);
  });

  it("mantém o JSON de geometria num tamanho que o Postgres aguenta", () => {
    const rota = buildHairpinRoute(1);
    const { track } = buildRouteTrack(rota.points);
    const bytes = JSON.stringify(compactTrackPoints(track.points)).length;

    // ~10 mil pontos precisam ficar bem abaixo do teto de 30 MB do endpoint.
    expect(bytes).toBeLessThan(1_500_000);
  });
});

// ---------------------------------------------------------------------------
// Códigos de vínculo
// ---------------------------------------------------------------------------

describe("sorteio de códigos em lote", () => {
  it("nunca repete dentro do mesmo lote nem contra os já existentes", () => {
    const existentes = new Set(["ABC123", "XYZ789"]);
    const lote: string[] = [];

    for (let i = 0; i < 200; i++) {
      const codigo = generateUniqueBindCode(existentes);
      existentes.add(codigo);
      lote.push(codigo);
    }

    expect(new Set(lote).size).toBe(200);
    expect(lote).not.toContain("ABC123");
    for (const c of lote) {
      expect(c).toMatch(/^[A-Z0-9]{6}$/);
      // Todo código sorteado tem que sobreviver à normalização da entrada do
      // motorista — senão ele digita exatamente o que está no papel e é recusado.
      expect(normalizeBindCode(c)).toBe(c);
    }
  });
});
