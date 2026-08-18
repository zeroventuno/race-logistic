import { describe, expect, it } from "vitest";

import { enderecoDeVinculo, qrSvg } from "@/lib/codes/qr";

/**
 * O QR da folha de códigos.
 *
 * O que se protege aqui não é a biblioteca — ela é madura e não precisa dos
 * meus testes. É o CONTRATO em volta dela: para onde o código aponta, e se o
 * símbolo sai em condições de ser lido de uma folha impressa amassada.
 */

describe("enderecoDeVinculo", () => {
  it("aponta para a tela do motorista com o código no parâmetro", () => {
    expect(enderecoDeVinculo("https://flammerouge.org", "ABC123")).toBe(
      "https://flammerouge.org/driver?c=ABC123",
    );
  });

  // A base vem de uma variável de ambiente que alguém preenche à mão, e barra
  // sobrando no fim é o erro de digitação mais comum que existe.
  it("não deixa barra dobrada quando a base termina em barra", () => {
    expect(enderecoDeVinculo("https://flammerouge.org/", "ABC123")).toBe(
      "https://flammerouge.org/driver?c=ABC123",
    );
  });
});

describe("qrSvg", () => {
  it("devolve SVG escalável, sem largura fixa", async () => {
    const svg = await qrSvg("https://flammerouge.org/driver?c=ABC123");

    expect(svg).toBeTruthy();
    expect(svg).toContain("<svg");
    expect(svg).toContain("viewBox");
    // Largura fixa brigaria com o tamanho em milímetros que a folha impõe.
    expect(svg).not.toMatch(/<svg[^>]*\swidth="/);
    expect(svg).not.toMatch(/<svg[^>]*\sheight="/);
  });

  // A margem branca é o que a câmera usa para achar a borda do símbolo. Sem
  // ela o QR encostado noutro elemento simplesmente não lê — e é a economia de
  // espaço que mais tenta quem está diagramando a folha.
  it("mantém a zona de silêncio de 4 módulos", async () => {
    const svg = (await qrSvg("https://flammerouge.org/driver?c=ABC123"))!;
    const viewBox = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);

    expect(viewBox).toBeTruthy();
    const lado = Number(viewBox![1]);

    // Versão 2 do QR tem 25 módulos de dado; com 4 de margem de cada lado o
    // símbolo inteiro passa de 30. O número exato depende do conteúdo — o que
    // se afirma é que a margem está lá.
    expect(lado).toBeGreaterThan(25 + 8 - 1);
  });

  it("aguenta um código longo sem quebrar a folha", async () => {
    const enorme = `https://flammerouge.org/driver?c=${"A".repeat(400)}`;
    expect(await qrSvg(enorme)).toBeTruthy();
  });

  // Um QR que não sai não pode derrubar a folha inteira: as outras posições
  // continuam imprimindo, e esta imprime só com o código digitável.
  it("devolve nulo em vez de lançar quando não dá para codificar", async () => {
    // Além do limite de capacidade de qualquer versão de QR.
    const impossivel = "x".repeat(10_000);
    expect(await qrSvg(impossivel)).toBeNull();
  });
});
