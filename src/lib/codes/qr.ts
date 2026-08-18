import QRCode from "qrcode";

/**
 * O QR da folha de códigos.
 *
 * O QUE ELE RESOLVE. O endereço impresso mais o código somam vinte e tantos
 * caracteres digitados à mão, num celular, com luva, minutos antes da largada.
 * Cada caractere é uma chance de erro no pior momento possível. Com o QR o
 * motorista aponta a câmera e está dentro.
 *
 * O CÓDIGO CONTINUA IMPRESSO AO LADO, e isso não é redundância: câmera
 * quebrada, lente suja, celular velho, motorista que nunca escaneou nada. O QR
 * é o caminho rápido, não o único — e uma folha que só funciona com câmera é
 * uma folha que falha justamente com quem tem mais dificuldade.
 *
 * SVG, E NÃO PNG. A folha é impressa, e impressora tem resolução muito maior
 * que tela. Um PNG gerado para caber na tela sai serrilhado no papel — e um QR
 * serrilhado é um QR que a câmera lê na terceira tentativa, de cócoras, com o
 * celular a dois centímetros. Vetor sai nítido em qualquer densidade, do jato
 * de tinta de escritório à gráfica.
 *
 * CORREÇÃO DE ERRO ALTA. Uma folha de briefing amassa, molha, pega graxa e
 * anda dobrada no bolso do macacão. O nível Q recupera cerca de um quarto do
 * símbolo danificado e custa só um pouco de densidade — a troca certa para
 * papel que vai para a estrada, e errada para um QR de tela.
 */

/** Recuperação de ~25% do símbolo. Ver o cabeçalho. */
const CORRECAO = "Q" as const;

/**
 * Zona de silêncio, em módulos.
 *
 * A especificação pede 4. Reduzir é a economia de espaço mais tentadora e a
 * mais cara: sem a margem branca a câmera não acha a borda do símbolo, e o QR
 * simplesmente não lê quando impresso encostado em outro elemento.
 */
const MARGEM = 4;

/**
 * O endereço que o QR carrega.
 *
 * O código vai no parâmetro `c`, e a tela de vínculo o consome e o APAGA da
 * barra de endereço em seguida (ver `BindScreen`). Sem isso ele ficaria no
 * histórico do navegador do motorista e poderia vazar no cabeçalho de
 * referência para qualquer coisa que a página carregasse depois.
 */
export function enderecoDeVinculo(base: string, codigo: string): string {
  const limpo = base.replace(/\/+$/, "");
  return `${limpo}/driver?c=${encodeURIComponent(codigo)}`;
}

/**
 * O QR como SVG pronto para embutir.
 *
 * Devolve `null` em vez de lançar: um código que não vira QR não pode impedir
 * a folha inteira de sair. A posição continua imprimindo com o código
 * digitável, que é o caminho que sempre funcionou.
 */
export async function qrSvg(url: string): Promise<string | null> {
  try {
    const svg = await QRCode.toString(url, {
      type: "svg",
      errorCorrectionLevel: CORRECAO,
      margin: MARGEM,
      // Preto puro sobre branco puro. Impressora doméstica em escala de cinza
      // transforma qualquer cor intermediária em chumbo, e o contraste do QR é
      // a única coisa que a câmera tem para trabalhar.
      color: { dark: "#000000", light: "#ffffff" },
    });

    // O `width`/`height` fixos que a biblioteca escreve brigam com o tamanho
    // que o CSS da folha quer dar. Só o `viewBox` importa para escalar.
    return svg
      .replace(/\swidth="[^"]*"/, "")
      .replace(/\sheight="[^"]*"/, "")
      .replace("<svg", '<svg preserveAspectRatio="xMidYMid meet"');
  } catch (erro) {
    console.error("[qr] não foi possível gerar:", (erro as Error).message);
    return null;
  }
}
