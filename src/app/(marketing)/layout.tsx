import type { Metadata } from "next";

import { Movimento } from "@/components/marketing/Movimento";

import "./marketing.css";

/**
 * Casca da landing.
 *
 * O grupo de rotas existe para isolar o tema: `globals.css` pinta o app
 * inteiro de escuro, e as duas regras de `:has(.fr-landing)` em
 * `marketing.css` trocam isso apenas onde esta casca estiver montada. Nenhum
 * arquivo compartilhado precisou ser editado — o painel e o app do motorista
 * continuam exatamente como estavam.
 */
export const metadata: Metadata = {
  title: "Flamme Rouge — direção de prova ao vivo para ciclismo de estrada",
  description:
    "Posição de cada veículo de apoio medida pela estrada, janela entre carro de abertura e vassoura medida como tempo intermediário, e alerta que aciona o socorro certo por categoria. O GPS é o celular do motorista.",
  openGraph: {
    title: "Flamme Rouge — direção de prova ao vivo",
    description:
      "Num teste real, uma moto estava a 0,05 km em linha reta e 37,3 km pela estrada de um acidente. O sistema acionou a ambulância que estava 1,5 km atrás.",
    type: "website",
    locale: "pt_BR",
  },
};

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="fr-landing">
      {children}
      <Movimento />
    </div>
  );
}
