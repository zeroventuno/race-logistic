"use client";

import { useState, useTransition } from "react";

import { Botao } from "@/components/director/ui";

import { definirCota } from "./actions";

/**
 * O campo que solta ou tranca uma conta.
 *
 * A PRIMEIRA VERSÃO GRAVAVA AO SAIR DO CAMPO, SEM BOTÃO, e estava errada. O
 * argumento era arrumação: um "Salvar" por linha encheria a tela. O custo era
 * de outra natureza — quem digitava não tinha como saber se tinha gravado, e
 * a próxima coisa que essa pessoa faz é justamente SAIR desta tela para criar
 * a prova que estava travada. Sair da tela é o gesto que dispara a gravação e
 * é o mesmo que impede de ver se ela deu certo: o `blur` corre junto com a
 * navegação, e o erro, quando existe, aparece numa tela que já não está lá.
 *
 * Aconteceu de verdade: cota subida de 3 para 4, prova recusada em seguida,
 * e o banco continuava em 3.
 *
 * O BOTÃO SÓ APARECE QUANDO HÁ O QUE SALVAR. Assim a tela parada continua
 * limpa — a preocupação original era legítima — e a linha que está sendo
 * mexida ganha um alvo explícito. Enter também grava, para quem prefere o
 * teclado.
 *
 * O VALOR DIGITADO NÃO SOME QUANDO A GRAVAÇÃO FALHA. A versão anterior
 * devolvia o número antigo junto com a mensagem de erro, o que apagava a
 * intenção de quem estava ali: para tentar de novo era preciso digitar de
 * novo. O número fica, o erro fica ao lado, e o botão continua disponível.
 */
export function CotaCampo({
  userId,
  cota,
  usadas,
}: {
  userId: string;
  cota: number;
  usadas: number;
}) {
  const [valor, setValor] = useState(String(cota));
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pendente, iniciar] = useTransition();

  const n = Number(valor);
  const valido = valor.trim() !== "" && Number.isInteger(n) && n >= 0 && n <= 999;
  const sujo = valor !== String(cota);

  const gravar = () => {
    if (!sujo || !valido || pendente) return;

    setErro(null);
    setSalvo(false);

    iniciar(async () => {
      const r = await definirCota(userId, n);
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      // O `revalidatePath` da ação traz `cota` nova por props; o estado local
      // já está no mesmo número, então nada pisca.
      setSalvo(true);
    });
  };

  const reverter = () => {
    setValor(String(cota));
    setErro(null);
    setSalvo(false);
  };

  // Já usou tudo que tinha? A linha merece um sinal, porque é a única razão
  // pela qual alguém entra nesta tela: descobrir quem está esbarrando no teto.
  //
  // Compara com `cota`, o valor GRAVADO — nunca com o que está digitado. Um
  // número que ainda não foi salvo não solta ninguém, e apagar o aviso antes
  // da hora faria a tela mentir exatamente sobre o que ela existe para dizer.
  const noTeto = usadas >= cota;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="tnum text-sm text-ink-muted">{usadas} /</span>

      <input
        type="number"
        min={0}
        max={999}
        step={1}
        value={valor}
        disabled={pendente}
        onChange={(e) => {
          setValor(e.target.value);
          setErro(null);
          setSalvo(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            gravar();
          }
          if (e.key === "Escape") reverter();
        }}
        aria-label="Cota de provas"
        aria-invalid={erro ? true : undefined}
        className={`tnum h-9 w-16 border bg-surface-0 px-2 text-sm text-ink disabled:opacity-50 ${
          erro ? "border-critical" : noTeto ? "border-warn" : "border-border"
        }`}
      />

      {sujo ? (
        <>
          <Botao
            type="button"
            size="sm"
            variant="primary"
            onClick={gravar}
            disabled={!valido || pendente}
          >
            {pendente ? "salvando" : "salvar"}
          </Botao>
          {!pendente ? (
            <Botao type="button" size="sm" variant="quiet" onClick={reverter}>
              cancelar
            </Botao>
          ) : null}
        </>
      ) : null}

      {!sujo && salvo ? (
        <span className="text-xs text-ok">salvo</span>
      ) : null}

      {!sujo && !salvo && noTeto ? (
        <span className="text-xs text-warn">no teto</span>
      ) : null}

      {erro ? <span className="text-xs text-critical">{erro}</span> : null}
    </div>
  );
}
