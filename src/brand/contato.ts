/**
 * O endereço de contato da landing.
 *
 * CONSTANTE, e não variável de ambiente. Não é segredo, não muda entre
 * pré-visualização e produção, e um `env` esquecido no painel da Vercel
 * esconderia o único caminho de contato da página sem quebrar nada — o pior
 * tipo de falha, a que não aparece.
 *
 * Fica no `brand` porque é isso que ele é: parte de como a marca se apresenta,
 * ao lado do nome e da bandeirola, e não configuração de infraestrutura.
 */
export const CONTATO_EMAIL = "cristiano@zeroventuno.com";
