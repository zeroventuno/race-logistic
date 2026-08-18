"use client";

import { useState } from "react";

import { useT } from "@/lib/i18n/client";

/**
 * O formulário de contato do rodapé.
 *
 * É o único caminho entre "gostei" e "falo com quem": não há preço na página,
 * não há pagamento, e o ciclo de venda deste produto começa numa conversa. Por
 * isso ele mora no rodapé mas não é rodapé — é o fecho comercial.
 *
 * TRÊS CAMPOS, e a razão de não serem cinco: cada campo a mais é uma chance de
 * alguém desistir no meio. Nome, e-mail e o que a pessoa quer bastam para
 * responder; a prova, a data e o tamanho aparecem na conversa. A organização
 * fica opcional porque metade de quem escreve é de uma federação e a outra
 * metade é um clube de vinte pessoas — obrigar a preencher isso faz o segundo
 * grupo sentir que a ferramenta não é para ele.
 *
 * O CAMPO `website` É UMA ARMADILHA. Fica escondido, nenhum humano o preenche,
 * e robô de formulário preenche tudo que encontra. É o que substitui um CAPTCHA
 * — que dependeria de serviço de terceiro e obrigaria um diretor de prova a
 * identificar semáforos numa grade para pedir um orçamento.
 *
 * O ERRO NUNCA APAGA O QUE FOI ESCRITO. Se o envio falhar, o texto continua no
 * campo e o endereço de e-mail aparece ao lado como saída — quem escreveu
 * quatro parágrafos não pode perdê-los porque a rede caiu.
 */

type Estado = "parado" | "enviando" | "enviado" | "erro";

export function Contato({ email }: { email: string }) {
  const t = useT();
  const [estado, setEstado] = useState<Estado>("parado");
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (estado === "enviando") return;

    const form = evento.currentTarget;
    const dados = Object.fromEntries(new FormData(form));

    setEstado("enviando");
    setErro(null);

    try {
      const resposta = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });

      const corpo = (await resposta.json().catch(() => null)) as
        | { ok?: boolean; erro?: string }
        | null;

      if (!resposta.ok || !corpo?.ok) {
        setErro(corpo?.erro ?? t("landing.contact.failed"));
        setEstado("erro");
        return;
      }

      form.reset();
      setEstado("enviado");
    } catch {
      // Rede caída. A mensagem não se perde: o formulário não é limpo.
      setErro(t("landing.contact.failed"));
      setEstado("erro");
    }
  }

  if (estado === "enviado") {
    return (
      <div className="fr-contato__ok" role="status">
        <p className="fr-contato__ok-titulo">{t("landing.contact.sentTitle")}</p>
        <p className="fr-body">{t("landing.contact.sentBody")}</p>
      </div>
    );
  }

  return (
    <form className="fr-contato" onSubmit={enviar} noValidate>
      <div className="fr-contato__linha">
        <label className="fr-contato__campo">
          <span className="fr-eyebrow">{t("landing.contact.name")}</span>
          <input name="name" type="text" required maxLength={120} autoComplete="name" />
        </label>

        <label className="fr-contato__campo">
          <span className="fr-eyebrow">{t("landing.contact.email")}</span>
          <input
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
          />
        </label>
      </div>

      <label className="fr-contato__campo">
        <span className="fr-eyebrow">
          {t("landing.contact.organization")}{" "}
          <span className="fr-contato__opcional">{t("common.optional")}</span>
        </span>
        <input
          name="organization"
          type="text"
          maxLength={200}
          autoComplete="organization"
        />
      </label>

      <label className="fr-contato__campo">
        <span className="fr-eyebrow">{t("landing.contact.message")}</span>
        <textarea
          name="message"
          required
          rows={4}
          maxLength={4000}
          placeholder={t("landing.contact.messagePlaceholder")}
        />
      </label>

      {/* A armadilha. `aria-hidden` e fora da ordem de tabulação: para quem
          usa leitor de tela ela não existe, e para o robô ela é só mais um
          campo de texto. */}
      <div className="fr-contato__armadilha" aria-hidden="true">
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {erro ? (
        <p className="fr-contato__erro" role="alert">
          {erro}{" "}
          <a href={`mailto:${email}`} className="fr-contato__email">
            {email}
          </a>
        </p>
      ) : null}

      <button
        type="submit"
        className="fr-btn fr-btn--rouge"
        disabled={estado === "enviando"}
      >
        {estado === "enviando"
          ? t("landing.contact.sending")
          : t("landing.contact.send")}
      </button>
    </form>
  );
}
