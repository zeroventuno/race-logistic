/**
 * Herói.
 *
 * O PONTO DE VISTA É O ARGUMENTO. A cena é de dentro do carro, na altura dos
 * olhos de quem dirige a prova — não é uma imagem de ciclismo, é a cadeira do
 * cliente. Quem chega já está sentado onde o produto é usado antes de ler uma
 * linha de texto.
 *
 * O VÉU. A versão anterior desta página resolvia o contraste por composição:
 * o escuro ficava contido num palco emoldurado de branco e o texto pesado
 * vivia embaixo, no papel. Funcionava, mas partia a primeira tela em dois
 * pedaços — a foto de um lado, a promessa do outro — e a foto virava ilustração
 * de cabeçalho em vez de ser o argumento.
 *
 * O sistema de design pede o contrário, e está certo: a foto ocupa a tela
 * inteira e o texto vive sobre ela. O contraste passa a ser problema do
 * gradiente, e ele é resolvido em quatro paradas em vez de duas — escuro no
 * topo (onde passa o cabeçalho), quase limpo no terço em que está o sol,
 * fechando de novo na base (onde está o H1). É o mesmo raciocínio de antes,
 * aplicado dentro do quadro em vez de em volta dele.
 *
 * O ARCO É O LOGOTIPO, e essa piada só funciona em movimento: a bandeirola da
 * marca é o arco do último quilômetro pendurado sobre a estrada, e quando ele
 * sai de quadro a assinatura assenta no lugar dele. Por isso a marca só aparece
 * aqui QUANDO HÁ VÍDEO. Com a foto parada não há arco saindo de cena, e repetir
 * o letreiro que já está no cabeçalho seria só uma marca a mais na tela. O
 * sincronismo está em `Movimento.tsx`, o segundo exato em `midia.ts`.
 *
 * O PÔSTER É A IMAGEM PRINCIPAL. Boa parte das visitas nunca vê um quadro em
 * movimento: economia de dados, autoplay bloqueado, 4G ruim no estacionamento
 * do evento. Enquanto a filmagem não chega, o quadro é ocupado por uma cena
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
      {/* Três casos, e cada um cobre a falta do anterior.
          1. Há vídeo         → o vídeo, com o pôster no atributo.
          2. Só pôster        → a imagem ocupa o quadro. É o caso NORMAL:
                                a filmagem é opcional, a foto não.
          3. Nem um nem outro → a cena desenhada, que se sustenta parada. */}
      {temFoto ? (
        <picture>
          {HEROI.posterSet!.formatos.map((formato) => (
            <source
              key={formato}
              type={`image/${formato}`}
              // Sangra a largura toda da janela agora, então a variante
              // escolhida tem que ser a maior em qualquer tela grande.
              sizes="100vw"
              srcSet={HEROI.posterSet!.larguras
                .map((l) => `${HEROI.posterSet!.base}-${l}.${formato} ${l}w`)
                .join(", ")}
            />
          ))}
          <img
            className="fr-hero__poster"
            // Parallax só na imagem. O sistema permite 0.10–0.28 em fundo;
            // 0.26 é o topo dessa faixa, que é onde a estrada "passa" sem
            // descolar a foto do quadro.
            data-parallax="0.26"
            src={`${HEROI.posterSet!.base}-${HEROI.posterSet!.larguras.at(-1)}.webp`}
            alt={HEROI.alt}
            width={1536}
            height={1024}
            // É o elemento de maior pintura da página: carregar tarde atrasa a
            // métrica que mede a primeira impressão.
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
          // Ambiente, não conteúdo: sem som, sem controles, fora da ordem de
          // tabulação. O que o vídeo mostra está escrito no `alt` da ficha do
          // slot e repetido em texto logo abaixo.
          aria-hidden="true"
          tabIndex={-1}
        >
          {HEROI.fontes?.map((f) => (
            <source key={f.src} src={f.src} type={f.type} />
          ))}
        </video>
      )}

      <div className="fr-hero__veu" aria-hidden="true" />

      <div className="fr-shell fr-hero__conteudo">
        <div className="fr-hero__texto">
          {temVideo ? (
            <div className="fr-hero__marca">
              <Assinatura size={34} tremular color="#ffffff" />
            </div>
          ) : (
            <p className="fr-hero__olho" data-reveal>
              <span className="fr-hero__risco" aria-hidden="true" />
              Direção de prova ao vivo
            </p>
          )}

          <h1 className="fr-h1 fr-hero__titulo" data-reveal data-delay="80">
            Direção de prova ao vivo,
            <br />
            <span className="fr-forte">medida pela estrada.</span>
          </h1>

          <p className="fr-lead fr-hero__lead" data-reveal data-delay="180">
            Cada veículo de apoio no percurso em tempo real. A janela entre
            abertura e fechamento medida como um tempo intermediário de
            cronometragem, não estimada. E o socorro escolhido pela distância
            que o carro vai realmente percorrer.
          </p>

          <div className="fr-hero__acoes" data-reveal data-delay="280">
            <Link href="/dashboard" className="fr-btn fr-btn--rouge">
              Abrir o painel da direção
              <span aria-hidden="true">→</span>
            </Link>
            <Link href="/motorista" className="fr-btn fr-btn--linha">
              Sou motorista, tenho um código
            </Link>
          </div>
        </div>

        {/* Rodapé do quadro: o porquê do nome, e o convite para rolar. */}
        <div className="fr-hero__base">
          <p className="fr-hero__nota">
            A flamme rouge marca o último quilômetro. Aqui ela marca o número
            que a direção precisa: quanto falta, medido, não estimado.
          </p>
          <span className="fr-hero__percorra" aria-hidden="true">
            Percorra
            <span className="fr-hero__seta">↓</span>
          </span>
        </div>
      </div>
    </div>
  );
}
