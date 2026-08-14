-- ===========================================================================
-- Correção: `generate_bind_code` não enxergava o pgcrypto
--
-- `gen_random_bytes` vem do pgcrypto, e no Supabase a extensão é instalada no
-- schema `extensions`, não em `public`. Como as funções de emissão de código
-- fixam `search_path = public, pg_temp` — o que está certo, um SECURITY
-- DEFINER com search_path mutável é escalada de privilégio esperando
-- acontecer — a chamada falhava com "function gen_random_bytes(integer) does
-- not exist".
--
-- O sintoma era enganoso: CRIAR posição funcionava, porque o `default` da
-- coluna é avaliado com o search_path da sessão do chamador, que inclui
-- `extensions`. Só REEMITIR um código quebrava. Ou seja, o caminho normal de
-- cadastro passava nos testes e o botão "gerar código novo" — usado quando o
-- motorista perde o papel impresso, no dia da prova — morria.
--
-- A correção é acrescentar `extensions` ao search_path fixo. Continua fixo, e
-- portanto continua seguro.
-- ===========================================================================

create or replace function public.generate_bind_code()
returns text
language plpgsql
volatile
set search_path = public, extensions, pg_temp
as $$
declare
  -- Crockford Base32: sem I, L, O, U. 32 divide 256, então o módulo é
  -- uniforme sem precisar de amostragem por rejeição.
  alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  bytes bytea := gen_random_bytes(6);
  result text := '';
  i integer;
begin
  for i in 0..5 loop
    result := result || substr(alphabet, 1 + (get_byte(bytes, i) % 32), 1);
  end loop;
  return result;
end;
$$;

create or replace function public.issue_bind_code(
  p_position_id uuid,
  p_valid_for interval default interval '30 days'
)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_race_id uuid;
  v_code text;
  v_attempt integer := 0;
begin
  select race_id into v_race_id
  from public.race_positions where id = p_position_id;

  if v_race_id is null then
    raise exception 'Posição não encontrada.' using errcode = 'no_data_found';
  end if;

  if not public.can_edit_race(v_race_id) then
    raise exception 'Sem permissão para emitir código nesta prova.'
      using errcode = 'insufficient_privilege';
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_code := public.generate_bind_code();

    begin
      update public.race_positions
        set bind_code = v_code,
            bind_code_issued_at = now(),
            bind_code_expires_at = now() + p_valid_for,
            bind_code_revoked_at = null
      where id = p_position_id;

      return v_code;
    exception when unique_violation then
      if v_attempt >= 20 then
        raise exception 'Não foi possível gerar um código único.';
      end if;
    end;
  end loop;
end;
$$;

revoke execute on function public.generate_bind_code() from public, anon;
revoke execute on function public.issue_bind_code(uuid, interval) from public, anon;
grant execute on function public.issue_bind_code(uuid, interval) to authenticated;
