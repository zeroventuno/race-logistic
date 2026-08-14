"use client";

/**
 * Resolve um token de cor para um valor que bibliotecas de fora do CSS
 * entendam.
 *
 * ISTO EXISTE POR CAUSA DE UM BUG QUE FOI PARA PRODUÇÃO, e o bug é instrutivo:
 * a rota sumiu do mapa.
 *
 * `getComputedStyle(el).getPropertyValue("--route-line")` NÃO resolve o valor
 * de uma propriedade personalizada — devolve o texto como foi escrito. Com os
 * tokens em `light-dark(#1f6fb2, #78bef0)`, o MapLibre recebia exatamente essa
 * string como cor de linha, não conseguia interpretar e a camada do percurso
 * não era desenhada. Nenhum erro de tipo, nenhum teste vermelho: uma string
 * continua sendo uma string.
 *
 * `light-dark()` só é resolvido quando o valor é USADO numa propriedade de
 * verdade. Então é isso que se faz aqui: pinta-se um elemento invisível com o
 * token e lê-se a cor computada dele, que aí sim vem em `rgb(...)`.
 *
 * O elemento é criado e destruído a cada chamada de propósito. Guardá-lo num
 * módulo pareceria economia, mas ele teria que ser invalidado a cada troca de
 * tema — e um cache errado aqui devolve a cor do tema anterior, que é
 * exatamente o sintoma que estamos consertando.
 */
export function resolverCor(token: string, reserva: string): string {
  if (typeof document === "undefined") return reserva;

  const sonda = document.createElement("span");
  sonda.style.color = `var(${token})`;
  sonda.style.position = "absolute";
  sonda.style.pointerEvents = "none";
  sonda.style.opacity = "0";
  document.body.appendChild(sonda);

  const cor = getComputedStyle(sonda).color;
  sonda.remove();

  // Se o token não existe, `color` cai para o herdado — que é uma cor válida
  // qualquer, não a que se pediu. A reserva é mais honesta que um cinza de
  // texto desenhado como se fosse o percurso.
  return cor && cor !== "" ? cor : reserva;
}
