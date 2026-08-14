/**
 * As duas telas.
 *
 * As capturas entram emolduradas e sobre fundo escuro dentro da moldura,
 * porque é assim que o produto é: o painel fica seis horas ligado numa sala de
 * direção, muitas vezes projetado, e ali o escuro é ergonomia. Clarear a
 * captura para "combinar" com a landing seria mostrar um produto que não
 * existe.
 *
 * E o vermelho que aparecer nessas imagens não é decoração da página. Dentro
 * do produto vermelho quer dizer uma coisa só — alguém precisa de socorro. Se
 * uma captura for retocada para o vermelho ficar mais bonito no site, ela
 * passa a mentir sobre a única cor que não pode mentir.
 */

import { SlotImagemView } from "@/components/marketing/SlotMidia";
import { Secao } from "@/components/marketing/Secao";
import { SLOTS } from "@/components/marketing/midia";

const PAINEL = [
  "Mapa ao vivo com todos os veículos, cada papel com sua cor e sua idade de dado.",
  "Janela entre abertura e fechamento, marcada como medida ou projetada.",
  "Fila de alertas com o apoio mais próximo já sugerido — e o porquê da sugestão por escrito.",
  "Saúde de conexão veículo a veículo: quem está ao vivo, quem atrasou, quem sumiu.",
];

const APP = [
  "Entra com o código de 6 caracteres. Sem conta, sem loja de aplicativos.",
  "Botões de alerta grandes, para mão com luva e carro em movimento.",
  "Continua enviando com a tela apagada e acumula tudo quando o sinal cai.",
  "No idioma do aparelho, a partir do mesmo link que todo mundo recebeu.",
];

export function DuasTelas() {
  return (
    <Secao id="telas" km="124" rotulo="As duas telas">
      <h2 className="fr-h2" id="telas-titulo">
        Uma sala de direção.
        <br />
        <span className="fr-forte">Um celular por veículo.</span>
      </h2>

      <div className="fr-telas" style={{ marginTop: "2.5rem" }}>
        <article className="fr-tela" data-reveal>
          <SlotImagemView slot={SLOTS.painel} rotulo="Captura · painel /dashboard" />
          <div className="fr-tela__texto">
            <span className="fr-eyebrow">Painel da direção</span>
            <h3 className="fr-h3">O que a direção vê</h3>
            <ul className="fr-marcadores">
              {PAINEL.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </article>

        <article className="fr-tela fr-tela--app" data-reveal>
          <SlotImagemView
            slot={SLOTS.app}
            rotulo="Captura · app /motorista"
            className="fr-slot--telefone"
          />
          <div className="fr-tela__texto">
            <span className="fr-eyebrow">App do motorista</span>
            <h3 className="fr-h3">O que o motorista vê</h3>
            <ul className="fr-marcadores">
              {APP.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </article>
      </div>
    </Secao>
  );
}
