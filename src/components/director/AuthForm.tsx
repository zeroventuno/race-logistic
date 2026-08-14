"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { AuthState } from "@/app/login/actions";
import { Aviso, Botao, Campo, entradaClasse } from "@/components/director/ui";

/**
 * Formulário de entrada e de cadastro.
 *
 * Um componente só para os dois porque a diferença entre eles é literalmente
 * dois campos — e porque manter os dois em arquivos separados garantiria que um
 * ganhasse uma correção de acessibilidade que o outro não recebe.
 *
 * A ação vem por prop: quem monta a página decide se é `entrar` ou `cadastrar`.
 *
 * i18n: precisa de chaves — o dicionário ainda não tem namespace de
 * autenticação. Todo o texto visível deste componente (rótulos dos campos,
 * dicas, botões, links entre entrar e cadastrar) e as mensagens de erro de
 * `src/app/login/actions.ts` estão em português literal, listadas no relatório.
 */
export function AuthForm({
  modo,
  acao,
}: {
  modo: "login" | "cadastro";
  acao: (estado: AuthState, formData: FormData) => Promise<AuthState>;
}) {
  const [estado, submeter, pendente] = useActionState<AuthState, FormData>(
    acao,
    {},
  );

  const ehCadastro = modo === "cadastro";

  return (
    <form action={submeter} className="space-y-5" noValidate>
      {estado.erro ? (
        <Aviso tone="warn" titulo="Não deu para continuar">
          {estado.erro}
        </Aviso>
      ) : null}

      {estado.aviso ? (
        <Aviso tone="ok" titulo="Quase lá">
          {estado.aviso}
        </Aviso>
      ) : null}

      {ehCadastro ? (
        <Campo
          label="Seu nome"
          htmlFor="nome"
          obrigatorio
          erro={estado.campos?.nome}
          hint="Aparece para a equipe da prova."
        >
          <input
            id="nome"
            name="nome"
            type="text"
            autoComplete="name"
            defaultValue={estado.valores?.nome ?? ""}
            className={entradaClasse(estado.campos?.nome)}
            placeholder="Marina Ferrero"
          />
        </Campo>
      ) : null}

      <Campo
        label="E-mail"
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
          placeholder="direcao@suaprova.it"
        />
      </Campo>

      <Campo
        label="Senha"
        htmlFor="senha"
        obrigatorio
        erro={estado.campos?.senha}
        hint={ehCadastro ? "Mínimo de 8 caracteres." : undefined}
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
        <Campo label="Repita a senha" htmlFor="confirmacao" obrigatorio>
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
          ? "Aguarde…"
          : ehCadastro
            ? "Criar conta"
            : "Entrar no painel"}
      </Botao>

      <p className="text-center text-sm text-ink-muted">
        {ehCadastro ? (
          <>
            Já tem conta?{" "}
            <Link
              href="/login"
              className="text-info underline underline-offset-4"
            >
              Entrar
            </Link>
          </>
        ) : (
          <>
            Primeira vez?{" "}
            <Link
              href="/cadastro"
              className="text-info underline underline-offset-4"
            >
              Criar conta de direção
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
