import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var veyloPrisma: PrismaClient | undefined;
}

/**
 * Em produção (Netlify) o banco é o Postgres gerenciado (Netlify Database, injetado em
 * NETLIFY_DATABASE_URL) — schema dedicado em schema.production.prisma, client gerado à
 * parte em src/generated/prisma-pg (import tardio: esse módulo só existe depois do build
 * de produção rodar `prisma generate` contra aquele schema). Local e em testes, nada disso
 * entra em ação — continua o arquivo SQLite de sempre, sem exigir rede.
 */
function resolverUrlBancoSqlite(): string {
  return process.env.DATABASE_URL ?? "file:./prisma/dev.db";
}

function criarPrismaClient(): PrismaClient {
  const urlPostgres = process.env.NETLIFY_DATABASE_URL;
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
