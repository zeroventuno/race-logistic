import "server-only";

/**
 * Aviso por e-mail de que alguém preencheu o formulário de contato.
 *
 * TRÊS DECISÕES, e as três vêm da mesma regra: o aviso não pode ser mais
 * importante que o pedido.
 *
 *  1. É MELHOR-ESFORÇO, SEMPRE. Se o serviço de e-mail estiver fora, o pedido
 *     já está gravado e a pessoa já viu "recebido". Deixar a requisição falhar
 *     aqui transformaria um problema nosso — uma chave vencida, uma API lenta —
 *     em "o formulário do site não funciona" para quem estava tentando comprar.
 *
 *  2. TEM TETO DE ESPERA. Sem ele, um serviço lento não derruba nada, mas deixa
 *     alguém olhando um botão girando por trinta segundos depois de a mensagem
 *     já estar salva.
 *
 *  3. SEM BIBLIOTECA. É um POST com JSON; instalar um SDK para isso acrescenta
 *     uma dependência que precisa de atualização, auditoria e confiança, em
 *     troca de nada.
 *
 * O `reply_to` é o detalhe que faz o aviso valer: o e-mail chega da aplicação,
 * mas responder vai direto para a pessoa que escreveu. Dá para atender do
 * celular sem abrir o painel do banco.
 */

const TIMEOUT_MS = 5000;

export interface PedidoDeContato {
  name: string;
  email: string;
  organization: string | null;
  message: string;
  locale: string;
}

/**
 * Devolve `true` quando o aviso saiu. Nunca lança — quem chama já gravou o
 * pedido e não tem o que fazer com a exceção.
 */
export async function notificarContato(p: PedidoDeContato): Promise<boolean> {
  const chave = process.env.RESEND_API_KEY;
  const para = process.env.CONTACT_NOTIFY_TO;
  const de = process.env.CONTACT_NOTIFY_FROM;

  if (!chave || !para || !de) {
    // Não é erro: é o estado antes de alguém configurar. O pedido está no
    // banco de qualquer jeito. O aviso é explícito para não virar mistério.
    console.warn(
      "[contact] aviso por e-mail desligado: falta RESEND_API_KEY, CONTACT_NOTIFY_TO ou CONTACT_NOTIFY_FROM",
    );
    return false;
  }

  const assunto = p.organization
    ? `Contato — ${p.name} (${p.organization})`
    : `Contato — ${p.name}`;

  try {
    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: de,
        to: [para],
        // Responder cai na caixa de quem escreveu, e não na aplicação.
        reply_to: p.email,
        subject: assunto,
        text: corpo(p),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text().catch(() => "");
      console.error(
        `[contact] aviso por e-mail recusado (${resposta.status}):`,
        detalhe.slice(0, 300),
      );
      return false;
    }

    return true;
  } catch (erro) {
    console.error("[contact] aviso por e-mail falhou:", (erro as Error).message);
    return false;
  }
}

/**
 * Texto puro, e não HTML.
 *
 * O destinatário é uma pessoa só — você — e o que ela precisa é ler o pedido
 * inteiro na notificação do celular, sem abrir nada. HTML aqui só acrescenta
 * peso, risco de cair em spam e uma chance de o cliente de e-mail estragar o
 * recuo de um texto que alguém escreveu com carinho.
 */
function corpo(p: PedidoDeContato): string {
  return [
    p.message,
    "",
    "—",
    `De: ${p.name}`,
    `E-mail: ${p.email}`,
    p.organization ? `Organização: ${p.organization}` : null,
    // O idioma não é estatística: é para responder na língua da pessoa sem
    // ter que adivinhar pelo texto.
    `Escreveu em: ${p.locale}`,
    "",
    "Responder a este e-mail vai direto para quem escreveu.",
  ]
    .filter((l) => l !== null)
    .join("\n");
}
