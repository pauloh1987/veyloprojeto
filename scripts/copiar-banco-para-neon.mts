import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { aplicarMigracoesPendentes } from "./migracoes-postgres.mjs";

/**
 * Copia todos os dados do banco de produção atual (Netlify Database) para o Neon.
 *
 * Os dois endereços ficam no arquivo `.env.migracao` (fora do git), preenchido por quem tem
 * acesso aos bancos:
 *   ORIGEM_URL=...   endereço do banco atual (Netlify)
 *   DESTINO_URL=...  endereço do banco novo (Neon)
 * O script nunca imprime esses endereços.
 *
 * Uso:
 *   npm run db:copiar-para-neon                 copia (o destino precisa estar vazio)
 *   npm run db:copiar-para-neon -- --substituir apaga os dados do destino e copia de novo
 *   npm run db:copiar-para-neon -- --conferir   só compara as contagens dos dois bancos
 *
 * No destino, antes de copiar, aplica as migrações de netlify/database/migrations e registra
 * todas como aplicadas, para o build (scripts/aplicar-migracoes.mjs) não repeti-las.
 */

const require = createRequire(import.meta.url);
const { PrismaClient } = require("../src/generated/prisma-pg");

type Cliente = InstanceType<typeof PrismaClient>;

/** Ordem das tabelas respeitando as chaves estrangeiras (quem é referenciado vem antes). */
const TABELAS = [
  { modelo: "estabelecimento", tabela: "Estabelecimento" },
  { modelo: "profissional", tabela: "Profissional" },
  { modelo: "categoriaServico", tabela: "CategoriaServico" },
  { modelo: "servico", tabela: "Servico" },
  { modelo: "servicoProfissional", tabela: "ServicoProfissional" },
  { modelo: "horarioFuncionamento", tabela: "HorarioFuncionamento" },
  { modelo: "bloqueio", tabela: "Bloqueio" },
  { modelo: "cliente", tabela: "Cliente" },
  { modelo: "usuario", tabela: "Usuario" },
  { modelo: "sessao", tabela: "Sessao" },
  { modelo: "tokenVerificacao", tabela: "TokenVerificacao" },
  { modelo: "agendamento", tabela: "Agendamento" },
  { modelo: "mensagem", tabela: "Mensagem" },
  { modelo: "relogioSimulado", tabela: "RelogioSimulado" },
] as const;

const LOTE = 500;

function lerEnderecos(): { origem: string; destino: string } {
  if (!process.env.ORIGEM_URL || !process.env.DESTINO_URL) {
    if (!existsSync(".env.migracao")) {
      throw new Error("Crie o arquivo .env.migracao na pasta do projeto com ORIGEM_URL e DESTINO_URL.");
    }
    process.loadEnvFile(".env.migracao");
  }
  const origem = process.env.ORIGEM_URL;
  const destino = process.env.DESTINO_URL;
  if (!origem || !destino) throw new Error("Faltou ORIGEM_URL ou DESTINO_URL no .env.migracao.");
  if (origem === destino) throw new Error("ORIGEM_URL e DESTINO_URL são o mesmo banco.");
  return { origem, destino };
}

function conectarPrisma(url: string): Cliente {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

async function contar(cliente: Cliente): Promise<Record<string, number>> {
  const contagens: Record<string, number> = {};
  for (const { modelo } of TABELAS) contagens[modelo] = await cliente[modelo].count();
  return contagens;
}

function imprimirComparacao(origem: Record<string, number>, destino: Record<string, number>): boolean {
  let tudoIgual = true;
  console.log("\n  tabela                  origem   destino");
  for (const { modelo, tabela } of TABELAS) {
    const igual = origem[modelo] === destino[modelo];
    if (!igual) tudoIgual = false;
    console.log(
      `  ${tabela.padEnd(22)} ${String(origem[modelo]).padStart(7)} ${String(destino[modelo]).padStart(9)}${igual ? "" : "  <- diferente"}`,
    );
  }
  return tudoIgual;
}

async function prepararDestino(url: string, substituir: boolean): Promise<void> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    console.log("Aplicando a estrutura do banco no destino...");
    await aplicarMigracoesPendentes(client);
    const { rows } = await client.query(`SELECT count(*)::int AS total FROM "Estabelecimento"`);
    if (rows[0].total > 0) {
      if (!substituir) {
        throw new Error("O destino já tem dados. Use --substituir para apagar e copiar de novo.");
      }
      console.log("Apagando os dados atuais do destino (--substituir)...");
      await client.query(`TRUNCATE ${TABELAS.map(({ tabela }) => `"${tabela}"`).join(", ")} CASCADE`);
    }
  } finally {
    await client.end();
  }
}

async function copiar(origem: Cliente, destino: Cliente): Promise<void> {
  for (const { modelo, tabela } of TABELAS) {
    const linhas = await origem[modelo].findMany();
    for (let i = 0; i < linhas.length; i += LOTE) {
      await destino[modelo].createMany({ data: linhas.slice(i, i + LOTE) });
    }
    console.log(`  ${tabela}: ${linhas.length}`);
  }
}

async function principal() {
  const argumentos = process.argv.slice(2);
  const somenteConferir = argumentos.includes("--conferir");
  const substituir = argumentos.includes("--substituir");
  const { origem: urlOrigem, destino: urlDestino } = lerEnderecos();

  if (!somenteConferir) await prepararDestino(urlDestino, substituir);

  const origem = conectarPrisma(urlOrigem);
  const destino = conectarPrisma(urlDestino);
  try {
    if (!somenteConferir) {
      console.log("Copiando...");
      await copiar(origem, destino);
    }
    const tudoIgual = imprimirComparacao(await contar(origem), await contar(destino));
    console.log(tudoIgual ? "\nOs dois bancos estão com as mesmas contagens." : "\nHá diferenças entre os bancos.");
    if (!tudoIgual) process.exitCode = 1;
  } finally {
    await origem.$disconnect();
    await destino.$disconnect();
  }
}

principal().catch((erro) => {
  console.error(`\nErro: ${erro instanceof Error ? erro.message : erro}`);
  process.exitCode = 1;
});
