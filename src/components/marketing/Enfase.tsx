/**
 * Negrito dentro de uma frase traduzida.
 *
 * O parágrafo do primeiro argumento tem três números que são a piada inteira
 * da página: 0,05 km em linha reta, 37,3 km pela estrada, 1,5 km atrás. Sem
 * peso eles se dissolvem no meio de sessenta palavras, e a comparação — que é
 * o produto — passa despercebida.
 *
 * O problema é que `t()` devolve texto, não JSX: não dá para pôr `<b>` no meio
 * de uma chave. As alternativas eram quebrar cada frase em três chaves (e
 * pedir a um tradutor que respeitasse a ordem das partes em alemão, onde ela
 * muda) ou perder o destaque. Nenhuma das duas serve.
 *
 * Então o dicionário marca o trecho com `**assim**`, que é a convenção que
 * qualquer tradutor já reconhece, e este componente a transforma em `<b>`. É
 * deliberadamente burro: não é Markdown, não aninha, não tem escape. Se algum
 * dia precisar de mais do que negrito, o certo é trocar a abordagem, não
 * ensinar mais sintaxe a esta função.
 */

export function Enfase({ texto }: { texto: string }) {
  const partes = texto.split("**");

  return (
    <>
      {partes.map((parte, i) =>
        // Índice ímpar = entre dois marcadores. A chave é o índice porque a
        // lista é derivada de uma string imutável: nada reordena.
        i % 2 === 1 ? <b key={i}>{parte}</b> : parte,
      )}
    </>
  );
}
