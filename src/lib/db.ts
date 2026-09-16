import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

declare global {
  // eslint-disable-next-line no-var
  var veyloPrisma: PrismaClient | undefined;
}

function criarPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  });
  return new PrismaClient({ adapter });
}

export const db = globalThis.veyloPrisma ?? criarPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.veyloPrisma = db;
}
