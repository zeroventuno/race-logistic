/**
 * A landing.
 *
 * A página é um road book: abre na largada, passa pelos marcos de
 * quilometragem de cada seção e termina no flamme rouge, a 1 km da chegada,
 * que é onde ficam as duas portas de entrada do sistema. A ordem não é
 * decorativa — é a ordem em que um organizador decide: primeiro reconhece o
 * problema que ele já tem, depois vê o número que prova a solução, depois
 * descobre quanto trabalho dá, e só então escolhe uma porta.
 *
 * O conteúdo da antiga raiz (o seletor motorista/direção) virou a seção
 * `Fecho`. Os dois caminhos continuam iguais: /motorista e /dashboard.
 */

import { Argumentos } from "@/components/marketing/Argumentos";
import { Cabecalho } from "@/components/marketing/Cabecalho";
import { ComoFunciona } from "@/components/marketing/ComoFunciona";
import { DuasTelas } from "@/components/marketing/DuasTelas";
import { Fecho } from "@/components/marketing/Fecho";
import { Heroi } from "@/components/marketing/Heroi";
import { Numeros } from "@/components/marketing/Numeros";
import { Problema } from "@/components/marketing/Problema";
import { Rodape } from "@/components/marketing/Rodape";

export default function Home() {
  return (
    <>
      <a href="#conteudo" className="fr-sr">
        Pular para o conteúdo
      </a>
      <Cabecalho />
      <main id="conteudo">
        <Heroi />
        <Numeros />
        <Problema />
        <Argumentos />
        <ComoFunciona />
        <DuasTelas />
        <Fecho />
      </main>
      <Rodape />
    </>
  );
}
