import type {
  TranslationKey,
  TranslationVars,
  Translator,
} from "@/lib/i18n/translate";

/**
 * Frase desmontada, para o texto que é gravado.
 *
 * POR QUE ISTO EXISTE, já que no resto do sistema basta passar o tradutor
 * adiante: porque quase todo texto é escrito e lido na mesma requisição, e
 * este não é. A justificativa de um acionamento automático é escrita UMA vez,
 * no instante em que o sistema decide, e lida depois por até três pessoas — a
 * direção no painel, o motorista acionado no celular dele, e quem revisar o
 * incidente meses depois. Numa prova internacional, três idiomas. Escolher um
 * na hora de gravar é errar para dois.
 *
 * Então a frase é guardada em pedaços — a chave e os números já calculados — e
 * montada na leitura, no idioma de quem está lendo. Os números são os mesmos
 * para todo mundo; só a moldura muda de língua.
 */
export interface Clausula {
  /** Chave do dicionário. O tipo `Dictionary` garante que ela existe. */
  k: TranslationKey;
  v?: Record<string, ValorDeClausula>;
}

/**
 * O valor de uma variável dentro da cláusula.
 *
 * Os três casos existem porque três coisas diferentes precisam atravessar a
 * gravação e chegar íntegras do outro lado:
 *
 *  - o literal, que é igual em qualquer língua (um nome de veículo, "Moto 3");
 *  - a CHAVE, para o que tem tradução própria (o papel do veículo, a categoria
 *    do alerta) — sem isto, "Ambulância" ficaria congelada em português dentro
 *    de uma frase italiana;
 *  - os METROS crus, para que a distância seja formatada pelo leitor. Isto
 *    conserta de lambuja um defeito que estava anotado no código: a
 *    justificativa vinha com `toFixed`, que sempre usa ponto decimal, e o
 *    painel mostrava "4,00 km" na janela e "2.10 km" na frase ao lado.
 */
export type ValorDeClausula =
  | string
  | number
  | { chave: TranslationKey }
  | { metros: number };

export interface FormatoDeLeitura {
  distance: (metros: number | null) => string;
}

/** Monta a frase no idioma de quem está lendo agora. */
export function montarFrase(
  clausulas: readonly Clausula[],
  t: Translator,
  fmt: FormatoDeLeitura,
  separador = " · ",
): string {
  return clausulas
    .map((c) => t(c.k, resolverVariaveis(c.v, t, fmt)))
    .join(separador);
}

function resolverVariaveis(
  v: Clausula["v"],
  t: Translator,
  fmt: FormatoDeLeitura,
): TranslationVars | undefined {
  if (!v) return undefined;

  const saida: TranslationVars = {};
  for (const [nome, valor] of Object.entries(v)) {
    if (valor !== null && typeof valor === "object") {
      if ("chave" in valor) saida[nome] = t(valor.chave);
      else if ("metros" in valor) saida[nome] = fmt.distance(valor.metros);
      continue;
    }
    saida[nome] = valor;
  }
  return saida;
}

/**
 * Lê o que veio do banco.
 *
 * O `jsonb` chega como `unknown`: pode ser a lista de uma linha nova, `null`
 * numa linha gravada antes desta mudança, ou qualquer coisa se alguém editar a
 * coluna à mão. Nada disso pode derrubar o painel no meio de uma prova, então
 * a validação é por forma e não por confiança — e uma lista malformada vira
 * `null`, que faz a leitura cair no texto congelado.
 */
export function lerClausulas(bruto: unknown): Clausula[] | null {
  if (!Array.isArray(bruto) || bruto.length === 0) return null;

  const saida: Clausula[] = [];
  for (const item of bruto) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const k = (item as { k?: unknown }).k;
    if (typeof k !== "string") return null;

    const v = (item as { v?: unknown }).v;
    if (v !== undefined && (v === null || typeof v !== "object")) return null;

    saida.push({
      k: k as TranslationKey,
      v: v as Clausula["v"],
    });
  }

  return saida;
}

/**
 * A frase para mostrar: a estruturada quando existe, o texto congelado quando
 * não.
 *
 * A reserva não é zelo — são as provas já gravadas, que continuam aparecendo
 * na língua em que foram escritas até o tempo substituí-las. E é também o que
 * mantém legível o acionamento feito à mão pela direção, que é prosa de gente
 * e não tem cláusula nenhuma.
 */
export function fraseOuTexto(
  partes: unknown,
  texto: string | null,
  t: Translator,
  fmt: FormatoDeLeitura,
  separador = " · ",
): string | null {
  const clausulas = lerClausulas(partes);
  return clausulas ? montarFrase(clausulas, t, fmt, separador) : texto;
}
