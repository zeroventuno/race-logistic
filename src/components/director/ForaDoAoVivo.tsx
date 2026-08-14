"use client";

import { usePathname } from "next/navigation";

/**
 * Esconde a casca da prova na tela Ao vivo.
 *
 * A tela Ao vivo é o mapa ocupando a viewport inteira, com tudo flutuando em
 * vidro por cima. O cabeçalho de prova — voltar, nome, selos, abas — passou a
 * viver DENTRO do cartão de identidade da coluna esquerda, porque num mapa em
 * tela cheia não sobra topo para ele. Mantê-lo aqui também significaria a
 * mesma informação escrita duas vezes na mesma tela.
 *
 * Por que um componente de cliente e não uma condição no layout do servidor:
 * um layout do Next não recebe a rota atual. Dá para descobrir por outros
 * caminhos (ler o cabeçalho `referer`, empurrar a rota por contexto), e todos
 * são mais frágeis do que ler `usePathname` aqui. O custo é um limite de
 * cliente em volta de marcação que já é estática.
 *
 * A alternativa estrutural seria tirar `ao-vivo` de dentro de `[raceId]`, mas
 * isso muda a URL de uma tela que já está em produção e no meio de um teste
 * de campo. Não vale.
 */
export function ForaDoAoVivo({ children }: { children: React.ReactNode }) {
  const rota = usePathname();
  if (rota?.endsWith("/ao-vivo")) return null;
  return <>{children}</>;
}
