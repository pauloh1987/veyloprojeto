import path from "node:path";
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

declare global {
  // eslint-disable-next-line no-var
  var veyloPrisma: PrismaClient | undefined;
}

/**
 * Em produção "sem servidor" (Netlify/Vercel) o sistema de arquivos do deploy é somente
 * leitura, exceto /tmp — e /tmp começa vazio a cada instância fria. Para a demonstração
 * funcionar (login, criar agendamento etc.) sem um banco hospedado de verdade, copiamos o
 * banco semeado no build para /tmp na primeira requisição de cada instância e usamos essa
 * cópia gravável. Local e em desenvolvimento, nada disso entra em ação.
 */
function resolverUrlBanco(): string {
  const urlConfigurada = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const rodandoSemServidor = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL);
  if (!rodandoSemServidor) return urlConfigurada;

  const caminhoOrigem = path.join(process.cwd(), "prisma", "dev.db");
  const caminhoGravavel = path.join("/tmp", "veylo-dev.db");

  try {
    if (!fs.existsSync(caminhoGravavel) && fs.existsSync(caminhoOrigem)) {
      fs.copyFileSync(caminhoOrigem, caminhoGravavel);
    }
    return `file:${caminhoGravavel}`;
  } catch {
    // Se a cópia falhar por algum motivo, cai de volta pro caminho original (só leitura).
    return urlConfigurada;
  }
}

function criarPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: resolverUrlBanco() });
  return new PrismaClient({ adapter });
}

export const db = globalThis.veyloPrisma ?? criarPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.veyloPrisma = db;
}
