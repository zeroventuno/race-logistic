import { describe, expect, it } from "vitest";

/**
 * O gatilho de "enquadrar", isolado da árvore de React.
 *
 * Esta lógica já quebrou uma vez de um jeito que nem o compilador nem os
 * testes viam: a propriedade chegava ao componente e ninguém a lia, porque a
 * edição que deveria criar o efeito não foi aplicada. O botão existia, o tipo
 * batia, e clicar não fazia nada.
 *
 * O que se testa aqui é o CONTRATO do token, que é a parte com regra:
 * montagem não enquadra, cada clique enquadra uma vez, e dois cliques seguidos
 * enquadram duas — que é o motivo de ser um contador e não um booleano.
 */

/** O mesmo predicado do efeito em `MapaAoVivo`. */
function criarGatilho(tokenInicial: number) {
  let ultimo = tokenInicial;
  return function deveEnquadrar(token: number): boolean {
    if (token === ultimo) return false;
    ultimo = token;
    return true;
  };
}

describe("gatilho de enquadrar", () => {
  it("não enquadra na montagem", () => {
    // O mapa já se enquadra sozinho ao carregar o percurso. Refazer isso na
    // montagem desfaria o zoom que o diretor deu enquanto o painel acordava.
    const deve = criarGatilho(0);
    expect(deve(0)).toBe(false);
  });

  it("não enquadra na montagem nem quando o painel já tem histórico", () => {
    // Remontar o mapa (troca de tema, por exemplo) com o contador em 7 não
    // pode disparar um enquadramento que ninguém pediu.
    const deve = criarGatilho(7);
    expect(deve(7)).toBe(false);
  });

  it("enquadra a cada clique, inclusive dois seguidos", () => {
    const deve = criarGatilho(0);
    expect(deve(1)).toBe(true);
    expect(deve(2)).toBe(true);
    expect(deve(3)).toBe(true);
  });

  it("não enquadra de novo se o componente rerenderizar sem clique", () => {
    // Um veículo se move, o painel rerenderiza, o token continua o mesmo.
    // Enquadrar aqui jogaria a câmera do diretor para longe do que ele olhava.
    const deve = criarGatilho(0);
    expect(deve(1)).toBe(true);
    expect(deve(1)).toBe(false);
    expect(deve(1)).toBe(false);
  });
});
