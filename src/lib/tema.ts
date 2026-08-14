/**
 * Preferência de tema — módulo NEUTRO, sem `"use client"`.
 *
 * Este arquivo existe por causa de um bug que foi para produção: a função
 * `temaDoCookie` morava dentro do componente `TemaBotao.tsx`, que é
 * `"use client"`. O Next trata TODO export de um módulo cliente como referência
 * de cliente, então o layout do servidor, ao chamá-la, quebrava em runtime com
 * "Attempted to call temaDoCookie() from the server but temaDoCookie is on the
 * client".
 *
 * O que torna esse erro perigoso é que ele passa por `tsc --noEmit` e por
 * `vitest` — os tipos estão certos e a função é testável isoladamente. Só
 * `next build` conhece a fronteira servidor/cliente. Nenhuma checagem de tipo
 * substitui a compilação real.
 *
 * Regra que fica: helper compartilhado entre servidor e cliente mora em módulo
 * sem diretiva. Só componentes levam `"use client"`.
 */

export type Tema = "system" | "light" | "dark";

export const TEMA_COOKIE = "race_theme";

/** Um ano: a escolha de tema não deve evaporar entre uma prova e a próxima. */
export const TEMA_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Lê a preferência gravada.
 *
 * `system` é o padrão e não é o mesmo que "claro" ou "escuro": significa
 * "acompanhe o sistema operacional", que é o que serve a quem monta a prova de
 * dia e opera à noite.
 */
export function temaDoCookie(valor: string | undefined): Tema {
  return valor === "light" || valor === "dark" ? valor : "system";
}
