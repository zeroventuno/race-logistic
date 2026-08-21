import "server-only";

/**
 * Quem é dono da ferramenta.
 *
 * A LISTA MORA NO AMBIENTE, E NÃO NO BANCO, e essa é a decisão inteira. Um
 * campo `is_admin` em `profiles` seria mais cômodo e é o que quase todo mundo
 * faz — mas cria uma linha que, no dia em que qualquer rota de atualização de
 * perfil tiver um defeito, vira escalada de privilégio. Aqui não existe linha
 * para virar: a fonte da verdade é a variável na Vercel, que já é a fronteira
 * de confiança do projeto, e ninguém que usa o produto alcança.
 *
 * FALHA FECHADA. Sem a variável definida, ninguém é administrador — nem em
 * desenvolvimento. O erro que isso causa é "não consigo entrar no meu próprio
 * painel", que se resolve em trinta segundos; o erro oposto seria um painel
 * com a lista de todos os usuários aberto porque alguém esqueceu de definir
 * uma variável no deploy.
 *
 * Quando houver um segundo administrador, o caminho é `app_metadata` do
 * Supabase, que só o papel de serviço escreve. Enquanto for uma pessoa, isto
 * é mais seguro e mais simples.
 */
const LISTA = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function ehAdministrador(email: string | null | undefined): boolean {
  if (!email || LISTA.length === 0) return false;
  return LISTA.includes(email.toLowerCase());
}

/** A lista está configurada? Serve para a tela explicar o vazio. */
export function listaDeAdminsVazia(): boolean {
  return LISTA.length === 0;
}
