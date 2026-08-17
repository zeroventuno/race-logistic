"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { AuthState } from "@/app/login/actions";
import { Aviso, Botao, Campo, entradaClasse } from "@/components/director/ui";
import { useT } from "@/lib/i18n/client";

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
}: {
  modo: "login" | "cadastro";
  acao: (estado: AuthState, formData: FormData) => Promise<AuthState>;
}) {
  const t = useT();
  const [estado, submeter, pendente] = useActionState<AuthState, FormData>(
    acao,
    {},
  );

  const ehCadastro = modo === "cadastro";

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

      {ehCadastro ? (
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
          autoComplete={ehCadastro ? "new-password" : "current-password"}
          className={entradaClasse(estado.campos?.senha)}
        />
      </Campo>

      {ehCadastro ? (
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
        {pendente
          ? t("auth.submitting")
          : ehCadastro
            ? t("auth.signUp")
            : t("auth.signIn")}
      </Botao>

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
    </form>
  );
}
