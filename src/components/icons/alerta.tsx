import {
  IconAlertTriangle,
  IconFirstAidKit,
  IconTool,
  type IconProps,
} from "@tabler/icons-react";

import type { AlertCategory, AlertIconName } from "@/lib/types";
import { ALERT_CATEGORY_META } from "@/lib/types";

/**
 * Pictogramas das categorias de alerta.
 *
 * Mesma razão dos veículos, com um agravante: estes ficam no botão de
 * emergência do app do motorista. Um emoji ali é desenhado pelo sistema
 * operacional do aparelho, e a ambulância do iOS não é a do Android — dois
 * motoristas na mesma prova, com o mesmo papel, olhando símbolos diferentes
 * para a mesma ação. Num botão que alguém aperta com luva, dentro de um carro
 * em movimento, depois de ver alguém cair.
 *
 * A escolha de cada símbolo:
 *   medical     a maleta de primeiros socorros — a cruz é lida sem legenda em
 *               qualquer idioma, e é mais direta que o desenho da ambulância
 *               em corpo pequeno (o veículo já tem o dele)
 *   mechanical  a mesma ferramenta do carro de apoio mecânico, de propósito:
 *               o alerta e quem o atende têm que se reconhecer na tela
 *   other       o triângulo, que é a placa de perigo genérica da estrada
 */

const BY_NAME: Record<AlertIconName, (props: IconProps) => React.ReactNode> = {
  medical: IconFirstAidKit,
  mechanical: IconTool,
  other: IconAlertTriangle,
};

export interface AlertIconProps {
  category: AlertCategory;
  size?: number;
  stroke?: number;
  className?: string;
  /** Sem título o ícone é decorativo — o certo quando o rótulo está ao lado. */
  title?: string;
}

export function AlertIcon({
  category,
  size = 20,
  stroke = 2,
  className,
  title,
}: AlertIconProps) {
  const Icon = BY_NAME[ALERT_CATEGORY_META[category].icon] ?? IconAlertTriangle;

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
 * O mesmo glifo em SVG puro, para os marcadores DOM do MapLibre — que não
 * renderiza React. Geometria simplificada: dentro de um marcador de 36 px o
 * desenho completo do Tabler vira borrão.
 */
export function alertGlyphSvg(
  category: AlertCategory,
  strokeHex: string,
  size = 20,
): string {
  const paths = MARKER_PATHS[ALERT_CATEGORY_META[category].icon] ?? MARKER_PATHS.other;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"`,
    ` fill="none" stroke="${strokeHex}" stroke-width="2.2" stroke-linecap="round"`,
    ` stroke-linejoin="round" aria-hidden="true">${paths}</svg>`,
  ].join("");
}

const MARKER_PATHS: Record<AlertIconName, string> = {
  // Maleta com a cruz.
  medical:
    '<path d="M3 8h18v12H3z"/><path d="M9 8V5h6v3"/><path d="M12 11.5v5M9.5 14h5"/>',
  // A mesma chave do apoio mecânico.
  mechanical:
    '<path d="M15 4a4.5 4.5 0 0 0-5.8 5.8L4 15v4h4l5.2-5.2A4.5 4.5 0 0 0 19 8l-2.6 2.6-2.6-.9-.9-2.6z"/>',
  // Triângulo de perigo.
  other: '<path d="M12 4 2.5 20h19L12 4z"/><path d="M12 10v4"/><path d="M12 17h.01"/>',
};
