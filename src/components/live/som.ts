"use client";

/**
 * Aviso sonoro de alerta novo.
 *
 * Um painel de 6 horas não é olhado 6 horas. O diretor fala no rádio, atende
 * telefone, olha o mapa impresso — e um acidente que aparece só como pixel
 * vermelho pode passar minutos sem ser visto. O som existe para isso e só para
 * isso: ele toca quando chega um alerta que NENHUM humano reconheceu ainda.
 *
 * Três decisões que fazem a diferença entre um aviso e um irritante:
 *
 *  1. TOCA UMA VEZ POR ALERTA. Alarme repetido é alarme desligado. A repetição
 *    fica a cargo do pulso visual, que não cansa o ouvido de ninguém.
 *
 *  2. DUAS VOZES. Acidente tem um padrão de três notas descendentes, o resto
 *    tem uma nota só. Sob pressão dá para saber a gravidade sem olhar.
 *
 *  3. SÍNTESE, NÃO ARQUIVO. Sem MP3 para carregar: o som precisa funcionar num
 *    trailer com internet ruim, e um `<audio>` que não baixou é silêncio no
 *    momento errado.
 *
 * Navegador nenhum deixa tocar áudio antes de um gesto do usuário, e essa é uma
 * regra boa. O módulo não finge que conseguiu: `bloqueado()` responde a verdade
 * e a interface mostra um botão para destravar — porque um diretor que ACHA que
 * tem som e não tem está pior do que um que sabe que não tem.
 */

type Ctor = typeof AudioContext;

let ctx: AudioContext | null = null;
let falhou = false;

function contexto(): AudioContext | null {
  if (falhou) return null;
  if (ctx) return ctx;

  if (typeof window === "undefined") return null;

  const Impl: Ctor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;

  if (!Impl) {
    falhou = true;
    return null;
  }

  try {
    ctx = new Impl();
  } catch {
    falhou = true;
    return null;
  }

  return ctx;
}

/** O navegador está segurando o áudio à espera de um gesto? */
export function somBloqueado(): boolean {
  const c = contexto();
  if (!c) return true;
  return c.state !== "running";
}

/**
 * Chamar DENTRO de um manipulador de clique — fora dele o navegador recusa.
 *
 * `comTeste` toca um bipe curtíssimo para confirmar que a cadeia inteira
 * funciona. Vale quando a pessoa clicou no botão "ativar som" e espera ouvir
 * algo; não vale no destravamento oportunista que acontece no primeiro clique
 * qualquer da tela, onde um bipe do nada é só susto.
 */
export async function ativarSom(comTeste = true): Promise<boolean> {
  const c = contexto();
  if (!c) return false;

  try {
    if (c.state !== "running") await c.resume();
  } catch {
    return false;
  }

  if (comTeste) tocar("teste");
  return c.state === "running";
}

export type TomDeAlerta = "critico" | "normal" | "teste";

export function tocar(tom: TomDeAlerta): void {
  const c = contexto();
  if (!c || c.state !== "running") return;

  const agora = c.currentTime;

  if (tom === "teste") {
    nota(c, 880, agora, 0.06, 0.06);
    return;
  }

  if (tom === "critico") {
    // Três notas descendentes: o padrão que veículos de emergência usam, e que
    // o ouvido reconhece como "vá olhar agora" sem precisar aprender.
    nota(c, 988, agora, 0.16, 0.32);
    nota(c, 740, agora + 0.2, 0.16, 0.32);
    nota(c, 988, agora + 0.4, 0.24, 0.32);
    return;
  }

  nota(c, 660, agora, 0.18, 0.22);
}

function nota(
  c: AudioContext,
  frequencia: number,
  inicio: number,
  duracao: number,
  volume: number,
): void {
  const osc = c.createOscillator();
  const ganho = c.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(frequencia, inicio);

  // Envelope: sem ele, ligar e desligar o oscilador produz um "clique" que soa
  // como defeito do equipamento — exatamente o que ninguém quer ouvir numa sala
  // de direção de prova.
  ganho.gain.setValueAtTime(0, inicio);
  ganho.gain.linearRampToValueAtTime(volume, inicio + 0.015);
  ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);

  osc.connect(ganho);
  ganho.connect(c.destination);
  osc.start(inicio);
  osc.stop(inicio + duracao + 0.05);
}
