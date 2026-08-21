"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { AuthState } from "@/app/login/actions";
import { Aviso, Botao, Campo, entradaClasse } from "@/components/director/ui";
import { useT } from "@/lib/i18n/client";

/** As quatro telas que este formulário atende. */
export type ModoAuth = "login" | "cadastro" | "recuperar" | "nova-senha";

/**
 * Formulário de entrada e de cadastro.
 *
 * Um componente só para os dois porque a diferença entre eles é literalmente
 * dois campos — e porque manter os dois em arquivos separados garantiria que um
 * ganhasse uma correção de acessibilidade que o outro não recebe.
 *
 * A ação vem por prop: quem monta a página decide se é `entrar` ou `cadastrar`.
 */
export function AuthForm({
  modo,
  acao,
  estadoInicial,
}: {
  modo: ModoAuth;
  acao: (estado: AuthState, formData: FormData) => Promise<AuthState>;
  /**
   * Mensagem já presente na primeira renderização.
   *
   * Serve para quem chega de fora com algo a ser dito — hoje, o link de
   * confirmação que expirou. Sem isto a pessoa cairia no login sem explicação
   * nenhuma, que é o mesmo beco que o aviso de "confirmação enviada" existe
   * para evitar do outro lado.
   */
  estadoInicial?: AuthState;
}) {
  const t = useT();
  const [estado, submeter, pendente] = useActionState<AuthState, FormData>(
    acao,
    estadoInicial ?? {},
  );

  const ehCadastro = modo === "cadastro";

  /*
   * QUATRO TELAS, UMA MATRIZ.
   *
   * Recuperar acesso e definir senha nova são subconjuntos do que já estava
   * aqui — e o motivo de não os separar é o mesmo da nota acima: um formulário
   * de autenticação em arquivo próprio é um formulário que não recebe a
   * próxima correção de acessibilidade. Erro por campo, `aria`, autocomplete e
   * estado pendente valem para os quatro de graça.
   */
  const mostra = {
    nome: modo === "cadastro",
    email: modo === "cadastro" || modo === "login" || modo === "recuperar",
    senha: modo === "cadastro" || modo === "login" || modo === "nova-senha",
    confirmacao: modo === "cadastro" || modo === "nova-senha",
    // O rodapé de "já tem conta / primeira vez" não faz sentido para quem
    // chegou por um link de e-mail: a pessoa não está escolhendo entre entrar
    // e cadastrar, está no meio de uma tarefa.
    rodape: modo === "cadastro" || modo === "login",
  };

  const rotuloBotao =
    modo === "cadastro"
      ? t("auth.signUp")
      : modo === "login"
        ? t("auth.signIn")
        : modo === "recuperar"
          ? t("auth.recoverSubmit")
          : t("auth.newPasswordSubmit");

  return (
    <form action={submeter} className="space-y-5" noValidate>
      {estado.erro ? (
        <Aviso tone="warn" titulo={t("auth.errorTitle")}>
          {estado.erro}
        </Aviso>
      ) : null}

      {estado.aviso ? (
        <Aviso tone="ok" titulo={t("auth.noticeTitle")}>
          {estado.aviso}
        </Aviso>
      ) : null}

      {mostra.nome ? (
        <Campo
          label={t("auth.name")}
          htmlFor="nome"
          obrigatorio
          erro={estado.campos?.nome}
          hint={t("auth.nameHint")}
        >
          <input
            id="nome"
            name="nome"
            type="text"
            autoComplete="name"
            defaultValue={estado.valores?.nome ?? ""}
            className={entradaClasse(estado.campos?.nome)}
            placeholder={t("auth.namePlaceholder")}
          />
        </Campo>
      ) : null}

      <Campo
        label={t("auth.email")}
        htmlFor="email"
        obrigatorio
        erro={estado.campos?.email}
      >
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={estado.valores?.email ?? ""}
          className={entradaClasse(estado.campos?.email)}
          placeholder={t("auth.emailPlaceholder")}
        />
      </Campo>

      {mostra.senha ? (
      <Campo
        label={t("auth.password")}
        htmlFor="senha"
        obrigatorio
        erro={estado.campos?.senha}
        hint={ehCadastro ? t("auth.passwordHint") : undefined}
      >
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete={
            modo === "login" ? "current-password" : "new-password"
          }
          className={entradaClasse(estado.campos?.senha)}
        />
      </Campo>
      ) : null}

      {mostra.confirmacao ? (
        <Campo label={t("auth.passwordRepeat")} htmlFor="confirmacao" obrigatorio>
          <input
            id="confirmacao"
            name="confirmacao"
            type="password"
            autoComplete="new-password"
            className={entradaClasse(null)}
          />
        </Campo>
      ) : null}

      <Botao
        type="submit"
        variant="marca"
        size="lg"
        className="w-full"
        disabled={pendente}
      >
        {pendente ? t("auth.submitting") : rotuloBotao}
      </Botao>

      {/* O caminho de saída para quem não lembra a senha. Fica só no login:
          em cadastro não há senha a esquecer, e nas outras duas a pessoa já
          está nesse caminho. */}
      {modo === "login" ? (
        <p className="text-center text-sm">
          <Link
            href="/recuperar"
            className="text-ink-muted underline underline-offset-4 hover:text-ink"
          >
            {t("auth.forgotLink")}
          </Link>
        </p>
      ) : null}

      {mostra.rodape ? (
      <p className="text-center text-sm text-ink-muted">
        {ehCadastro ? (
          <>
            {t("auth.haveAccount")}{" "}
            <Link
              href="/login"
              className="text-info underline underline-offset-4"
            >
              {t("auth.signInLink")}
            </Link>
          </>
        ) : (
          <>
            {t("auth.firstTime")}{" "}
            <Link
              href="/signup"
              className="text-info underline underline-offset-4"
            >
              {t("auth.signUpLink")}
            </Link>
          </>
        )}
      </p>
      ) : null}
    </form>
  );
}
