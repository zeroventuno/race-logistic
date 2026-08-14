/**
 * Herói.
 *
 * O PONTO DE VISTA É O ARGUMENTO. A cena é de dentro do carro, na altura dos
 * olhos de quem dirige a prova — não é uma imagem de ciclismo, é a cadeira do
 * cliente. Quem assiste já está sentado onde o produto é usado antes de ler
 * uma linha de texto.
 *
 * O ARCO É O LOGOTIPO. A bandeirola da marca é o arco do último quilômetro
 * pendurado sobre a estrada. Quando ele passa por cima da câmera e sai de
 * quadro, a assinatura assenta no lugar dele: o objeto real vira marca sem
 * precisar de nenhuma legenda explicando a piada. O sincronismo está em
 * `Movimento.tsx` e o segundo exato em `midia.ts`.
 *
 * O VÉU É PROBLEMA DE COMPOSIÇÃO, NÃO DE OPACIDADE. Pavé sob luz do dia é a
 * textura mais ruidosa que existe numa estrada, e escurecer o suficiente para
 * o texto sobreviver transformaria uma página clara numa página escura — que é
 * exatamente o erro que esta landing não pode cometer, porque o produto já é
 * escuro por motivos de ergonomia que não valem aqui. A saída é dividir o
 * trabalho: sobre o vídeo ficam só a marca e uma linha curta, sustentadas por
 * um gradiente de baixo para cima; o H1, o texto de venda e os botões vivem no
 * branco logo abaixo, com contraste de 15:1 e nenhuma sombra. O escuro fica
 * contido no palco, emoldurado de branco — o vídeo continua cinematográfico e
 * a página continua clara.
 *
 * O PÔSTER É A IMAGEM PRINCIPAL. Boa parte das visitas nunca vê um quadro em
 * movimento: economia de dados, autoplay bloqueado, 4G ruim no estacionamento
 * do evento. Enquanto a filmagem não chega, o palco é ocupado por uma cena
 * desenhada que se sustenta parada — e que continua sendo o fundo se o vídeo
 * falhar depois.
 */

import Link from "next/link";

import { CenaPave } from "@/components/marketing/CenaPave";
import { Assinatura } from "@/components/marketing/marca";
import { SLOTS, type SlotVideo } from "@/components/marketing/midia";

const HEROI: SlotVideo = SLOTS.heroi;

export function Heroi() {
  const temVideo = HEROI.fontes !== null && HEROI.fontes.length > 0;
  const temFoto = !temVideo && HEROI.posterSet !== null;

  return (
    <div className="fr-hero" id="fr-heroi">
      <div className="fr-shell">
        <div className="fr-hero__palco">
          {/* Três casos, e o do meio faltava.
              1. Há vídeo         → o vídeo, com o pôster no atributo.
              2. Só pôster        → a imagem ocupa o palco. É o caso NORMAL:
                                    a filmagem é opcional, a foto não.
              3. Nem um nem outro → a cena desenhada, que se sustenta parada. */}
          {temFoto ? (
            <picture>
              {HEROI.posterSet!.formatos.map((formato) => (
                <source
                  key={formato}
                  type={`image/${formato}`}
                  // Medido no DOM, não estimado: o palco fecha em 1184 px
                  // dentro da casca. Declarar menos que a caixa real faz o
                  // navegador escolher a variante pequena e exibi-la ampliada.
                  sizes="(min-width: 1100px) 1200px, 100vw"
                  srcSet={HEROI.posterSet!.larguras
                    .map((l) => `${HEROI.posterSet!.base}-${l}.${formato} ${l}w`)
                    .join(", ")}
                />
              ))}
              <img
                className="fr-hero__poster"
                // Parallax só na imagem. O sistema permite 0.10–0.28 em fundo;
                // 0.26 é o topo dessa faixa, que é onde a estrada "passa" sem
                // descolar a foto da moldura.
                data-parallax="0.26"
                src={`${HEROI.posterSet!.base}-${HEROI.posterSet!.larguras.at(-1)}.webp`}
                alt={HEROI.alt}
                width={1536}
                height={1024}
                // É o elemento de maior pintura da página: carregar tarde
                // atrasa a métrica que mede a primeira impressão.
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </picture>
          ) : !temVideo ? (
            <CenaPave className="fr-hero__poster" />
          ) : null}

          {temVideo && (
            <video
              className="fr-hero__video"
              poster={HEROI.poster ?? undefined}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              disablePictureInPicture
              // Ambiente, não conteúdo: sem som, sem controles, fora da ordem
              // de tabulação. O que o vídeo mostra está escrito no `alt` da
              // ficha do slot e repetido em texto logo abaixo.
              aria-hidden="true"
              tabIndex={-1}
            >
              {HEROI.fontes?.map((f) => (
                <source key={f.src} src={f.src} type={f.type} />
              ))}
            </video>
          )}

          <div className="fr-hero__veu" aria-hidden="true" />

          <div className="fr-hero__conteudo">
            <div className="fr-hero__marca">
              <Assinatura size={34} tremular color="#ffffff" />
            </div>
            <p className="fr-hero__kicker">
              No pavé a prova estica. A janela entre o carro de abertura e o de
              fechamento deixa de ser um número que alguém estima de cabeça — e
              vira o número que decide a hora de devolver a rua ao trânsito.
            </p>
          </div>
        </div>

        <div className="fr-hero__texto">
          <h1 className="fr-h1">
            Direção de prova ao vivo,
            <br />
            <span className="fr-forte">medida pela estrada.</span>
          </h1>

          <div className="fr-hero__base">
            <p className="fr-lead">
              Cada veículo de apoio no percurso em tempo real. A janela entre
              abertura e fechamento medida como um tempo intermediário de
              cronometragem, não estimada. E o socorro escolhido pela distância
              que o carro vai realmente percorrer. O GPS é o celular de quem
              dirige: nada para instalar, nada para embarcar.
            </p>

            <div className="fr-hero__acoes">
              <Link href="/dashboard" className="fr-btn fr-btn--rouge">
                Abrir o painel da direção
              </Link>
              <Link href="/motorista" className="fr-btn fr-btn--linha">
                Sou motorista, tenho um código
              </Link>
            </div>
          </div>
        </div>

        <dl className="fr-provas">
          <div className="fr-provas__item">
            <dt className="fr-eyebrow">Pela estrada</dt>
            <dd>
              <span className="fr-num fr-num--xl fr-num--rouge">37,3</span>
              <span className="fr-unit">km</span>
              <p className="fr-body" style={{ marginTop: "0.5rem" }}>
                separavam a moto do acidente que ela parecia estar vendo. Em
                linha reta, 0,05 km.
              </p>
            </dd>
          </div>
          <div className="fr-provas__item">
            <dt className="fr-eyebrow">Sem sinal</dt>
            <dd>
              <span className="fr-num fr-num--xl">40</span>
              <span className="fr-unit">pontos</span>
              <p className="fr-body" style={{ marginTop: "0.5rem" }}>
                acumulados em dois minutos de túnel chegaram completos, em
                ordem e sem duplicar.
              </p>
            </dd>
          </div>
          <div className="fr-provas__item">
            <dt className="fr-eyebrow">Para entrar</dt>
            <dd>
              <span className="fr-num fr-num--xl">6</span>
              <span className="fr-unit">caracteres</span>
              <p className="fr-body" style={{ marginTop: "0.5rem" }}>
                é tudo que o motorista digita. Sem conta, sem aplicativo, sem
                equipamento.
              </p>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
