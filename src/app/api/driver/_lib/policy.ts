/**
 * Políticas de acionamento e visibilidade de alertas.
 *
 * Separado de `dispatch.ts` porque aquele módulo é `server-only` (fala com o
 * banco) e estas são decisões PURAS — números com justificativa operacional,
 * que precisam ser testáveis sem levantar meio servidor junto.
 */

import type { AlertCategory } from "@/lib/types";

/**
 * Raio de aviso de proximidade e tempo de vida no mapa, por categoria.
 *
 * O raio é distância AO LONGO DO PERCURSO até o ponto do alerta. Os valores
 * saem da velocidade típica de um veículo de apoio (~60 km/h = 1 km/min):
 *
 *  - medical, 3 km ≈ 3 minutos de aviso. É o que dá tempo de reduzir a
 *    velocidade e chegar preparado numa cena de acidente, em vez de aparecer em
 *    cima dela numa curva.
 *  - mechanical, 1,5 km ≈ 1,5 minuto. Um carro parado no acostamento precisa
 *    ser evitado, não antecipado de longe.
 *  - other, 2 km. Meio-termo: pode ser estrada bloqueada, pode ser nada.
 *
 * A validade no mapa segue a mesma lógica: um socorro médico continua relevante
 * por horas; uma parada mecânica se resolve em minutos e vira poluição visual
 * se ficar. Alerta resolvido some antes disso, de qualquer forma.
 */
export const CATEGORY_VISIBILITY: Record<
  AlertCategory,
  { proximityRadiusM: number; visibleForMs: number }
> = {
  medical: { proximityRadiusM: 3000, visibleForMs: 3 * 60 * 60_000 },
  mechanical: { proximityRadiusM: 1500, visibleForMs: 45 * 60_000 },
  other: { proximityRadiusM: 2000, visibleForMs: 2 * 60 * 60_000 },
};

/**
 * Estados em que um acionamento ainda ocupa o veículo.
 *
 * `open` fica de fora: alerta aberto não tem dono. `resolved` e `cancelled`
 * liberam o veículo para o próximo chamado.
 */
export const OCCUPYING_STATUSES = ["dispatched", "en_route", "on_scene"] as const;

/**
 * Espera antes de reconsiderar um alerta que ficou sem ninguém.
 *
 * Cresce a cada tentativa, com teto: o cenário do túnel se resolve em segundos
 * quando o veículo reaparece — daí o primeiro intervalo curto —, mas um alerta
 * numa prova sem veículo despachável nenhum não pode ficar varrendo o banco a
 * cada 30 s pelo resto do dia.
 */
export function dispatchRetryDelayMs(attempts: number): number {
  return Math.min(5 * 60_000, 30_000 * Math.pow(2, Math.max(0, attempts)));
}
