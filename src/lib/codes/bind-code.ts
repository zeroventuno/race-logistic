/**
 * Códigos de vínculo.
 *
 * O código é digitado por um motorista, muitas vezes lendo de um papel
 * impresso, dentro de um carro, com pressa, antes da largada. Todo o desenho
 * abaixo sai dessa cena:
 *
 *  - ALFABETO CROCKFORD BASE32. Sem I, L, O e U. `I` e `1` e `l` são o mesmo
 *    borrão numa impressão ruim; `O` e `0` idem. `U` fica de fora para reduzir
 *    a chance de o gerador produzir uma palavra ofensiva por acaso.
 *
 *  - NORMALIZAÇÃO GENEROSA NA ENTRADA. Quem digitou `O` queria `0`; quem
 *    digitou `l` queria `1`. Aceitar isso não enfraquece nada — só evita que o
 *    motorista fique preso na tela de vínculo achando que o código está errado.
 *
 *  - ALEATORIEDADE CRIPTOGRÁFICA COM AMOSTRAGEM POR REJEIÇÃO. `Math.random()`
 *    seria adivinhável, e o resto simples de 256 pelo tamanho do alfabeto
 *    enviesaria as primeiras letras. Nada disso é catastrófico num MVP, mas o
 *    código certo custa a mesma linha.
 */

/** Crockford Base32: 32 símbolos, sem I, L, O, U. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export const BIND_CODE_LENGTH = 6;

/** Espaço total = 32^6 ≈ 1,07 bilhão. */
export const BIND_CODE_SPACE = Math.pow(ALPHABET.length, BIND_CODE_LENGTH);

export function generateBindCode(
  randomBytes: (n: number) => Uint8Array = defaultRandomBytes,
): string {
  const out: string[] = [];

  while (out.length < BIND_CODE_LENGTH) {
    // Pede com folga para quase sempre resolver numa rodada.
    const bytes = randomBytes(BIND_CODE_LENGTH * 2);

    for (const byte of bytes) {
      // Rejeição: 256 não é múltiplo de 32... na verdade é (256 = 8 × 32), mas
      // a checagem fica aqui de propósito para o código continuar correto se
      // alguém mexer no alfabeto depois.
      const limit = 256 - (256 % ALPHABET.length);
      if (byte >= limit) continue;

      out.push(ALPHABET[byte % ALPHABET.length]!);
      if (out.length === BIND_CODE_LENGTH) break;
    }
  }

  return out.join("");
}

function defaultRandomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return buf;
}

/**
 * Normaliza o que o motorista digitou para a forma canônica.
 * Devolve `null` se, depois de limpar, não sobrar um código plausível.
 */
export function normalizeBindCode(input: string): string | null {
  if (typeof input !== "string") return null;

  // Limite de tamanho ANTES de qualquer processamento: sem isto, uma entrada
  // de megabytes passa por normalização Unicode e várias regex antes de ser
  // recusada, e a rota de vínculo vira um alvo de negação de serviço barato.
  if (input.length > 64) return null;

  const cleaned = input
    // NFKC resolve o caso que mais aparece na prática: entrada em largura
    // total ("Ａ１Ｂ２Ｃ３"), que é o que um teclado IME ou uma colagem de PDF
    // produz. Sem ela, o código certo é descartado como lixo.
    //
    // O que NFKC NÃO resolve, e vale registrar: ligaduras continuam expandindo.
    // "ﬁ" é um único caractere que vira "fi", então uma entrada de 5 caracteres
    // pode sair com 6 e passar na checagem de comprimento. Não é falha de
    // segurança — o resultado ainda precisa coincidir com um código real, e o
    // limite de tentativas cobre adivinhação — mas significa que
    // `cleaned.length === 6` não prova que a pessoa digitou 6 caracteres.
    //
    // Homóglifos de outros alfabetos (o "А" cirílico, que é visualmente
    // idêntico ao "A" latino) NÃO são convertidos, de propósito: são recusados
    // pelo filtro seguinte. Converter seria adivinhar, e adivinhar errado aqui
    // vincula o celular ao veículo errado.
    .normalize("NFKC")
    .toUpperCase()
    // Tudo que não é alfanumérico é separador: hífen, espaço, ponto.
    .replace(/[^A-Z0-9]/g, "")
    // Aliases de decodificação do Crockford Base32, e SÓ eles.
    //
    // A tentação é mapear mais coisas ("Q parece 0", "U parece V"), e isso é
    // um erro em duas direções. Para dentro: Q é símbolo VÁLIDO do alfabeto —
    // mapeá-lo para 0 quebraria todo código sorteado que contivesse Q, e o
    // motorista veria "código inválido" digitando exatamente o que estava no
    // papel. Para fora: U não pertence ao alfabeto, então um U digitado é
    // certamente um erro — mas convertê-lo em V poderia acertar por acidente o
    // código de OUTRA posição, e vincular o celular ao veículo errado é pior
    // que recusar. Erro desconhecido se recusa; não se adivinha.
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");

  if (cleaned.length !== BIND_CODE_LENGTH) return null;

  for (const ch of cleaned) {
    if (!ALPHABET.includes(ch)) return null;
  }

  return cleaned;
}

/** Forma de exibição: `ABC-123`, mais fácil de ler em voz alta e de copiar. */
export function formatBindCode(code: string): string {
  const normalized = code.toUpperCase();
  if (normalized.length !== BIND_CODE_LENGTH) return normalized;
  return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
}

/**
 * Gera um código verificando colisão contra um conjunto já existente.
 *
 * Com 32^6 posições e algumas dezenas de códigos por prova, colisão é
 * astronomicamente improvável — mas "improvável" não é "impossível", e o
 * índice único no banco transformaria a colisão num erro 500 na cara do
 * diretor durante o cadastro. Tentar de novo é mais barato que explicar.
 */
export function generateUniqueBindCode(
  taken: ReadonlySet<string>,
  maxAttempts = 20,
  randomBytes?: (n: number) => Uint8Array,
): string {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateBindCode(randomBytes);
    if (!taken.has(code)) return code;
  }

  throw new Error(
    `Não foi possível gerar um código único em ${maxAttempts} tentativas.`,
  );
}
