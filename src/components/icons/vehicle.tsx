import {
  IconAmbulance,
  IconCar,
  IconFlag,
  IconFlagCheck,
  IconMapPin,
  IconMotorbike,
  IconTool,
  IconTrafficCone,
  IconTrash,
  type IconProps,
} from "@tabler/icons-react";

import type { PositionRole, VehicleIconName } from "@/lib/types";
import { ROLE_META } from "@/lib/types";

/**
 * Pictogramas dos veículos.
 *
 * Substituem os emoji que estavam sendo usados. Emoji parecia econômico e
 * falha nas quatro condições que este produto tem:
 *
 *   - desenha diferente em cada sistema (a moto do iOS não é a do Android,
 *     e no Windows várias viram um retângulo);
 *   - não aceita cor, então o marcador não pode carregar o papel na cor;
 *   - fica minúsculo e ilegível dentro de um marcador de mapa de 28 px;
 *   - some ou vira quadrado na folha de códigos impressa em preto e branco.
 *
 * Tabler Icons (MIT), traço uniforme, desenhados para tamanho pequeno.
 * Importados um a um para o empacotador descartar o resto do conjunto.
 *
 * A escolha de cada símbolo:
 *   abertura   bandeira lisa — o veículo que ABRE a estrada
 *   fechamento bandeira quadriculada — encerra a prova, libera a via
 *   vassoura   a própria vassoura, que é o nome da função
 *   moto/carro os veículos, literais
 *   ambulância a cruz é reconhecida sem legenda em qualquer idioma
 *   mecânico   ferramenta
 *   fiscal     cone, que é o que ele planta na estrada
 */

const BY_NAME: Record<
  VehicleIconName,
  (props: IconProps) => React.ReactNode
> = {
  lead: IconFlag,
  closing: IconFlagCheck,
  broom: IconTrash,
  moto: IconMotorbike,
  ambulance: IconAmbulance,
  mechanic: IconTool,
  support: IconCar,
  marshal: IconTrafficCone,
  other: IconMapPin,
};

export interface VehicleIconProps {
  role: PositionRole;
  size?: number;
  /** Espessura do traço. Aumente em tamanho pequeno para não sumir. */
  stroke?: number;
  className?: string;
  /**
   * Texto alternativo. Sem ele o ícone é decorativo e fica escondido do
   * leitor de tela — que é o certo quando o rótulo já está ao lado.
   */
  title?: string;
}

export function VehicleIcon({
  role,
  size = 20,
  stroke = 2,
  className,
  title,
}: VehicleIconProps) {
  const Icon = BY_NAME[ROLE_META[role].icon] ?? IconMapPin;

  return (
    <Icon
      size={size}
      stroke={stroke}
      className={className}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      role={title ? "img" : undefined}
    />
  );
}

/**
 * Marcador do mapa: o pictograma em SVG puro, para injetar num elemento DOM
 * do MapLibre (que não renderiza React).
 *
 * Fundo sólido na cor do papel e traço claro por cima — um ícone vazado sobre
 * o mapa desaparece assim que passa por cima de uma estrada clara.
 */
export function vehicleMarkerSvg(role: PositionRole, colorHex: string): string {
  const paths = MARKER_PATHS[ROLE_META[role].icon] ?? MARKER_PATHS.other;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24">`,
    `<circle cx="12" cy="12" r="11" fill="${colorHex}" stroke="#0a0c10" stroke-width="1.5"/>`,
    `<g transform="translate(3.6 3.6) scale(0.7)" fill="none" stroke="#0a0c10"`,
    ` stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${paths}</g>`,
    `</svg>`,
  ].join("");
}

/**
 * Geometria simplificada para o marcador.
 *
 * Não reaproveita o path do Tabler de propósito: dentro de um círculo de
 * 30 px, o desenho completo vira borrão. Estas formas são a redução de cada
 * símbolo ao que ainda se lê nesse tamanho.
 */
const MARKER_PATHS: Record<VehicleIconName, string> = {
  // Bandeira lisa num mastro.
  lead: '<path d="M6 21V4"/><path d="M6 5h11l-2.5 4L17 13H6"/>',
  // Bandeira quadriculada: dois quadrados opostos bastam para a leitura.
  closing:
    '<path d="M6 21V4"/><path d="M6 5h11l-2.5 4L17 13H6"/><path d="M6 5h5.5v4H6z" fill="#0a0c10" stroke="none"/><path d="M11.5 9h5.5v4h-5.5z" fill="#0a0c10" stroke="none"/>',
  // Vassoura: cabo e cerdas.
  broom: '<path d="M17 4 9.5 11.5"/><path d="M12 9l3 3"/><path d="M9 12l-3 5 8 3 2-6z"/>',
  moto: '<circle cx="5.5" cy="17" r="3.5"/><circle cx="18.5" cy="17" r="3.5"/><path d="M9 17h5l3-6h-4l-2-3H8"/><path d="M14 8h3"/>',
  ambulance:
    '<path d="M3 15V7h11v8"/><path d="M14 10h3.5l2.5 3v2H14"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M8.5 10h3M10 8.5v3"/>',
  mechanic:
    '<path d="M15 4a4.5 4.5 0 0 0-5.8 5.8L4 15v4h4l5.2-5.2A4.5 4.5 0 0 0 19 8l-2.6 2.6-2.6-.9-.9-2.6z"/>',
  support:
    '<path d="M3 15v-3l2-4h12l2 4v3"/><circle cx="7" cy="16" r="2"/><circle cx="17" cy="16" r="2"/><path d="M9 16h6"/>',
  marshal: '<path d="M12 3 7 19h10L12 3z"/><path d="M4 21h16"/><path d="M9.5 12h5"/>',
  other: '<path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
};
