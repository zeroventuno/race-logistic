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
import { getTranslator } from "@/lib/i18n/server";

/**
 * O TRADUTOR DESCE POR PROPRIEDADE, e não por contexto.
 *
 * Todas as seções abaixo são componentes de servidor: o texto delas é HTML
 * antes de o navegador existir, e nenhuma precisa de JavaScript para aparecer.
 * Transformá-las em componentes de cliente só para poder chamar `useT()`
 * mandaria a landing inteira — a página que mais precisa carregar rápido — para
 * dentro do pacote do navegador. Pegar o tradutor uma vez aqui e passá-lo
 * adiante custa uma propriedade por seção e mantém tudo no servidor.
 */
export default async function Home() {
  const { locale, t } = await getTranslator();

  return (
    <>
      <a href="#conteudo" className="fr-sr">
        {t("landing.skip")}
      </a>
      <Cabecalho t={t} />
      <main id="conteudo">
        <Heroi t={t} />
        <Numeros t={t} locale={locale} />
        <Problema t={t} />
        <Argumentos t={t} />
        <ComoFunciona t={t} />
        <DuasTelas t={t} />
        <Fecho t={t} />
      </main>
      <Rodape t={t} />
    </>
  );
}
