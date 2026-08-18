/**
 * `server-only` neutralizado no ambiente de teste.
 *
 * O pacote de verdade existe para EXPLODIR quando um módulo de servidor é
 * importado de um componente de cliente — é assim que uma chave de API deixa
 * de vazar para o navegador por descuido de import. A proteção é real e fica.
 *
 * Só que ela também explode dentro do Vitest, que não é nem servidor nem
 * cliente. Sem este apelido, a escolha seria entre testar o módulo e manter a
 * proteção — e a proteção é a que não se pode perder.
 */
export {};
