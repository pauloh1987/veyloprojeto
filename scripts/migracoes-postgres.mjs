import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/** Migrações SQL do banco de produção (Postgres, no Neon), uma por subpasta, aplicadas em
 * ordem alfabética (o nome começa pela data). Até 30/09/2026 ficavam em
 * netlify/database/migrations, onde o Netlify Database as aplicava sozinho; saíram de lá para
 * a Netlify não recriar esse banco. */
export const PASTA_MIGRACOES = path.join(process.cwd(), "prisma", "migracoes-producao");

const TABELA_CONTROLE = "_veylo_migracoes";

export async function listarMigracoes(pasta = PASTA_MIGRACOES) {
  const entradas = await readdir(pasta, { withFileTypes: true });
  return entradas
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => entrada.name)
    .sort();
}

/** Aplica, em ordem, as migrações que ainda não constam na tabela de controle. Cada uma roda
 * numa transação própria: se uma falhar, ela não fica pela metade e as seguintes não rodam.
 * `client` é um `pg.Client` já conectado. */
export async function aplicarMigracoesPendentes(client, { pasta = PASTA_MIGRACOES, log = console.log } = {}) {
  await client.query(
    `CREATE TABLE IF NOT EXISTS "${TABELA_CONTROLE}" (nome text PRIMARY KEY, aplicada_em timestamptz NOT NULL DEFAULT now())`,
  );
  const { rows } = await client.query(`SELECT nome FROM "${TABELA_CONTROLE}"`);
  const aplicadas = new Set(rows.map((linha) => linha.nome));
  const pendentes = (await listarMigracoes(pasta)).filter((nome) => !aplicadas.has(nome));

  for (const nome of pendentes) {
    const sql = await readFile(path.join(pasta, nome, "migration.sql"), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(`INSERT INTO "${TABELA_CONTROLE}" (nome) VALUES ($1)`, [nome]);
      await client.query("COMMIT");
      log(`  aplicada: ${nome}`);
    } catch (erro) {
      await client.query("ROLLBACK");
      throw new Error(`Falha na migração ${nome}: ${erro instanceof Error ? erro.message : erro}`);
    }
  }
  return pendentes;
}
