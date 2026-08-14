#!/usr/bin/env node
/**
 * Aplicador de migrações.
 *
 * Cada arquivo em supabase/migrations roda uma única vez, dentro de uma
 * transação, e fica registrado em `public._migrations` com o hash do conteúdo.
 * Se um arquivo já aplicado for editado depois, o script recusa em vez de
 * aplicar silenciosamente — divergência entre o repositório e o banco de
 * produção é exatamente o tipo de coisa que só aparece no dia da prova.
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

dotenv.config({ path: join(ROOT, ".env.local"), quiet: true });

const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");
const RESET = process.argv.includes("--reset");

/** Arquivos cuja divergência de hash foi conferida e aceita à mão. */
const ACCEPT_HASH = process.argv
  .filter((a) => a.startsWith("--accept-hash="))
  .map((a) => a.slice("--accept-hash=".length));

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "\n  DATABASE_URL não está definida.\n\n" +
      "  Abra .env.local e cole a connection string de:\n" +
      "  Supabase → Project Settings → Database → Connection string → URI\n" +
      "  (trocando [YOUR-PASSWORD] pela senha real do banco)\n",
  );
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
  // O pooler do Supabase às vezes demora para acordar um projeto novo.
  connectionTimeoutMillis: 30_000,
  statement_timeout: 120_000,
});

function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

async function main() {
  await client.connect();

  const { rows: dbInfo } = await client.query(
    "select current_database() as db, version() as version",
  );
  console.log(`  Conectado em ${dbInfo[0].db}`);

  if (RESET) {
    // `--reset` apaga TUDO. Sem trava, um `npm run db:reset` com o .env.local
    // de produção carregado derruba o banco da prova sem uma única pergunta.
    if (process.env.ALLOW_DB_RESET !== "yes") {
      throw new Error(
        "--reset apaga o schema public inteiro (todas as provas, posições, alertas e histórico).\n" +
          "  Para confirmar que é isso mesmo, rode com ALLOW_DB_RESET=yes:\n" +
          "    ALLOW_DB_RESET=yes npm run db:reset",
      );
    }

    const { rows: counts } = await client.query(`
      select coalesce((select count(*) from public.races), 0) as races
    `).catch(() => ({ rows: [{ races: 0 }] }));

    console.log(
      `\n  --reset: derrubando o schema public inteiro (${counts[0].races} prova(s) serão apagadas).\n`,
    );

    await client.query(`
      drop schema if exists public cascade;
      create schema public;
      grant usage on schema public to anon, authenticated, service_role;
      grant all on schema public to postgres;
    `);

    // Restaurar os privilégios PADRÃO, e não só os do schema.
    //
    // `drop schema cascade` leva junto as entradas de pg_default_acl. Sem
    // recriá-las, toda tabela criada DEPOIS nasce sem permissão nenhuma para
    // anon/authenticated/service_role, e o PostgREST responde 42501 em tudo —
    // um banco que parece migrado e não responde a nada.
    await client.query(`
      alter default privileges in schema public
        grant all on tables to anon, authenticated, service_role;
      alter default privileges in schema public
        grant all on functions to anon, authenticated, service_role;
      alter default privileges in schema public
        grant all on sequences to anon, authenticated, service_role;
    `);

    // Os tipos enum ficam no schema public, então o drop acima já os levou.
    // O trigger em auth.users precisa ser removido à mão porque vive em auth.
    await client.query(
      "drop trigger if exists on_auth_user_created on auth.users",
    );
  }

  // O ledger de migrações é criado aqui, e não por uma migração — então o
  // "RLS em tudo" das migrações nunca o cobriu. Era a única tabela do schema
  // sem RLS, e com privilégios totais para `authenticated`: qualquer usuário
  // cadastrado (o cadastro é aberto) podia apagar a linha de uma migração já
  // aplicada e fazer o próximo deploy morrer em "policy already exists", ou
  // inserir um nome futuro com hash errado e travar o migrate para sempre.
  await client.query(`
    create table if not exists public._migrations (
      name        text primary key,
      hash        text not null,
      applied_at  timestamptz not null default now()
    );

    alter table public._migrations enable row level security;

    revoke all on public._migrations from anon, authenticated;
  `);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("  Nenhuma migração encontrada.");
    return;
  }

  const { rows: applied } = await client.query(
    "select name, hash from public._migrations",
  );
  const appliedByName = new Map(applied.map((r) => [r.name, r.hash]));

  let ran = 0;

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    const hash = sha256(sql);
    const previous = appliedByName.get(file);

    if (previous) {
      if (previous !== hash) {
        // Saída para a edição legítima: mudar um comentário de uma migração
        // já aplicada não altera o banco, e forçar `--reset` por causa disso
        // treinaria a equipe a usar a opção destrutiva por rotina — que é como
        // se apaga um banco de produção por engano.
        //
        // O aceite é explícito e por arquivo. Nunca automático: o guarda existe
        // porque divergência entre repositório e produção só aparece no dia da
        // prova.
        if (ACCEPT_HASH.includes(file)) {
          await client.query(
            "update public._migrations set hash = $2 where name = $1",
            [file, hash],
          );
          console.log(`  ± ${file} (hash aceito — confirme que a mudança é cosmética)`);
          continue;
        }

        throw new Error(
          `A migração ${file} já foi aplicada mas o arquivo mudou desde então.\n\n` +
            `  Se a mudança altera o banco, crie uma migração nova.\n` +
            `  Se for cosmética (comentário, formatação), aceite o hash novo:\n` +
            `    npm run db:migrate -- --accept-hash=${file}\n`,
        );
      }
      console.log(`  · ${file} (já aplicada)`);
      continue;
    }

    process.stdout.write(`  → ${file} ... `);

    try {
      await client.query("begin");
      await client.query(sql);
      await client.query(
        "insert into public._migrations (name, hash) values ($1, $2)",
        [file, hash],
      );
      await client.query("commit");
      console.log("ok");
      ran++;
    } catch (err) {
      await client.query("rollback");
      console.log("FALHOU");
      throw err;
    }
  }

  console.log(
    `\n  ${ran} migração(ões) aplicada(s), ${files.length - ran} já estava(m) no banco.\n`,
  );
}

main()
  .catch((err) => {
    console.error(`\n  Erro: ${err.message}\n`);
    if (err.position && err.internalQuery) {
      console.error(`  SQL: ${err.internalQuery}\n`);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => {});
  });
