/**
 * Quais rótulos de veículo cabem na tela sem se atropelar.
 *
 * O PROBLEMA É O COMBOIO ANDAR JUNTO. Abertura, moto e ambulância
 * frequentemente estão no mesmo quilômetro, e num zoom de prova inteira isso
 * são três rótulos ocupando os mesmos quarenta pixels. Empilhados, viram uma
 * mancha ilegível — e a mancha some justamente com o nome que o diretor
 * procurava.
 *
 * A saída não é diminuir a fonte nem esconder tudo: é escolher. Mostrar os que
 * cabem, na ordem de quem importa mais, e calar o resto — que continua no mapa
 * como disco colorido, só sem nome. Isso é o que mapa profissional faz, e é
 * por isso que rótulo de cidade some quando se dá zoom out.
 *
 * A ORDEM DE QUEM IMPORTA, e ela não é discutível:
 *
 *   1. quem tem alerta aberto — é a razão de alguém estar olhando o mapa
 *   2. o veículo selecionado — o diretor acabou de clicar nele
 *   3. abertura e fechamento — definem a janela, são a pergunta do dia
 *   4. o resto, pela ordem do comboio
 *
 * Módulo puro: recebe caixas e devolve quem fica. Sem DOM, sem MapLibre — é o
 * que permite testar a regra com retângulos conhecidos em vez de com um mapa
 * de mentira.
 */

export interface CaixaRotulo {
  id: string;
  /** Prioridade: MENOR aparece primeiro. Ver a ordem no topo do arquivo. */
  prioridade: number;
  /** Centro do rótulo em pixels de tela. */
  x: number;
  y: number;
  largura: number;
  altura: number;
}

/**
 * Folga entre rótulos, em pixels.
 *
 * Dois rótulos que se encostam sem sobrepor ainda leem como um bloco só. A
 * folga é o que faz o olho separar um do outro.
 */
const FOLGA = 4;

function colide(a: CaixaRotulo, b: CaixaRotulo): boolean {
  return (
    Math.abs(a.x - b.x) * 2 < a.largura + b.largura + FOLGA * 2 &&
    Math.abs(a.y - b.y) * 2 < a.altura + b.altura + FOLGA * 2
  );
}

/**
 * Devolve os ids dos rótulos que devem ficar visíveis.
 *
 * Guloso por prioridade: percorre do mais importante ao menos, e cada um só
 * entra se não bater em ninguém que já entrou. É O(n²), e isso é proposital —
 * com uma dúzia de veículos a estrutura espacial que evitaria o quadrado
 * custaria mais para manter do que economiza, e roda a cada quadro de
 * arrasto do mapa.
 */
export function rotulosVisiveis(caixas: CaixaRotulo[]): Set<string> {
  const ordenadas = [...caixas].sort((a, b) => {
    if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade;
    // Desempate estável pelo id: sem isto, dois veículos de mesma prioridade
    // trocariam de lugar entre quadros e os rótulos piscariam.
    return a.id.localeCompare(b.id);
  });

  const aceitas: CaixaRotulo[] = [];
  const visiveis = new Set<string>();

  for (const caixa of ordenadas) {
    if (aceitas.some((outra) => colide(caixa, outra))) continue;
    aceitas.push(caixa);
    visiveis.add(caixa.id);
  }

  return visiveis;
}

export interface PrioridadeEntrada {
  temAlerta: boolean;
  selecionado: boolean;
  referencia: boolean;
  /** Posição no comboio, de `ROLE_META.convoyOrder`. */
  ordemComboio: number;
}

/** A ordem descrita no topo do arquivo, como número comparável. */
export function prioridadeDoRotulo(e: PrioridadeEntrada): number {
  if (e.temAlerta) return 0;
  if (e.selecionado) return 1;
  if (e.referencia) return 2;
  // O comboio entra somado a 3 para nunca alcançar as faixas acima, e
  // dividido para caber entre 3 e 4 — assim a ordem interna dele é
  // preservada sem inverter a hierarquia.
  return 3 + Math.min(0.99, Math.max(0, e.ordemComboio) / 1000);
}
