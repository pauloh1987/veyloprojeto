import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var veyloPrisma: PrismaClient | undefined;
}

/**
 * Em produção o banco é Postgres, com schema dedicado em schema.production.prisma e client
 * gerado à parte em src/generated/prisma-pg (import tardio: esse módulo só existe depois do
 * build de produção rodar `prisma generate` contra aquele schema). O endereço vem de
 * POSTGRES_URL (Neon, cadastrado por nós na Netlify) e, sem ela, de NETLIFY_DB_URL (o
 * Netlify Database, injetado pela própria Netlify — não NETLIFY_DATABASE_URL; conferido no
 * código-fonte de @netlify/database). A troca para o Neon (30/09/2026) foi para sair da
 * cobrança por hora de banco acordado da Netlify; ver DECISOES.md. Local e em testes, nada
 * disso entra em ação: continua o arquivo SQLite de sempre, sem exigir rede.
 */
function resolverUrlBancoSqlite(): string {
  return process.env.DATABASE_URL ?? "file:./prisma/dev.db";
}

/** No site de teste (src/lib/ambiente.ts) só vale o banco de teste, uma branch do Neon: nunca cai no
 * de produção, nem se a configuração da Netlify estiver errada. */
function resolverUrlPostgres(): string | undefined {
  if (process.env.VEYLO_AMBIENTE === "teste") {
    const url = process.env.POSTGRES_URL_TESTE;
    if (!url) throw new Error("Site de teste sem banco: cadastre POSTGRES_URL_TESTE na Netlify (ver CLAUDE.md).");
    return url;
  }
  return process.env.POSTGRES_URL ?? process.env.NETLIFY_DB_URL;
}

function criarPrismaClient(): PrismaClient {
  const urlPostgres = resolverUrlPostgres();
  if (urlPostgres) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient: PrismaClientPg } = require("../generated/prisma-pg");
    const adapter = new PrismaPg({ connectionString: urlPostgres });
    return new PrismaClientPg({ adapter }) as PrismaClient;
  }

  const adapter = new PrismaBetterSqlite3({ url: resolverUrlBancoSqlite() });
  return new PrismaClient({ adapter });
}

export const db = globalThis.veyloPrisma ?? criarPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.veyloPrisma = db;
}
