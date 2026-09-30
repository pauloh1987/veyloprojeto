import { existsSync, readFileSync } from "node:fs";
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
 *   npm run db:copiar-para-neon -- --backup <arquivo.json>
 *       usa como origem um backup diário (netlify/functions/backup-diario.mts, baixado com
 *       `netlify blobs:get backups-diarios <data>`) em vez de ORIGEM_URL. O backup não tem
 *       sessões de login nem tokens de e-mail/senha, que simplesmente não são copiados.
 *
 * No destino, antes de copiar, aplica as migrações de prisma/migracoes-producao e registra
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

type Modelo = (typeof TABELAS)[number]["modelo"];

/** Nome de cada tabela dentro do JSON do backup diário (ver backup-diario.mts). */
const CHAVE_NO_BACKUP: Partial<Record<Modelo, string>> = {
  estabelecimento: "estabelecimentos",
  profissional: "profissionais",
  categoriaServico: "categorias",
  servico: "servicos",
  servicoProfissional: "servicoProfissional",
  horarioFuncionamento: "horarios",
  bloqueio: "bloqueios",
  cliente: "clientes",
  usuario: "usuarios",
  agendamento: "agendamentos",
  mensagem: "mensagens",
  relogioSimulado: "relogioSimulado",
};

/** De onde os dados saem: o banco atual (ORIGEM_URL) ou um arquivo de backup. */
interface Origem {
  linhas(modelo: Modelo): Promise<Record<string, unknown>[]>;
  contar(): Promise<Record<string, number>>;
  fechar(): Promise<void>;
}

function origemDoBanco(url: string): Origem {
  const cliente = conectarPrisma(url);
  return {
    linhas: (modelo) => cliente[modelo].findMany(),
    contar: () => contar(cliente),
    fechar: () => cliente.$disconnect(),
  };
}

function origemDoBackup(arquivo: string): Origem {
  const backup = JSON.parse(readFileSync(arquivo, "utf8")) as Record<string, unknown>;
  const linhasDe = (modelo: Modelo): Record<string, unknown>[] => {
    const chave = CHAVE_NO_BACKUP[modelo];
    const valor = chave ? backup[chave] : undefined;
    return Array.isArray(valor) ? valor : [];
  };
  console.log(`Origem: backup gerado em ${String(backup.geradoEm ?? "data desconhecida")}`);
  return {
    linhas: async (modelo) => linhasDe(modelo),
    contar: async () => Object.fromEntries(TABELAS.map(({ modelo }) => [modelo, linhasDe(modelo).length])),
    fechar: async () => {},
  };
}

function lerEnderecos(usandoBackup: boolean): { origem?: string; destino: string } {
  if (!process.env.DESTINO_URL && existsSync(".env.migracao")) process.loadEnvFile(".env.migracao");
  const origem = process.env.ORIGEM_URL || undefined;
  const destino = process.env.DESTINO_URL;
  if (!destino) throw new Error("Faltou DESTINO_URL no .env.migracao.");
  if (!usandoBackup && !origem) throw new Error("Faltou ORIGEM_URL no .env.migracao (ou use --backup <arquivo>).");
  if (origem && origem === destino) throw new Error("ORIGEM_URL e DESTINO_URL são o mesmo banco.");
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

async function copiar(origem: Origem, destino: Cliente): Promise<void> {
  for (const { modelo, tabela } of TABELAS) {
    const linhas = await origem.linhas(modelo);
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
  const indiceBackup = argumentos.indexOf("--backup");
  const arquivoBackup = indiceBackup >= 0 ? argumentos[indiceBackup + 1] : undefined;
  if (indiceBackup >= 0 && (!arquivoBackup || !existsSync(arquivoBackup))) {
    throw new Error("Informe o arquivo de backup depois de --backup (e confira se ele existe).");
  }
  const { origem: urlOrigem, destino: urlDestino } = lerEnderecos(Boolean(arquivoBackup));

  if (!somenteConferir) await prepararDestino(urlDestino, substituir);

  const origem = arquivoBackup ? origemDoBackup(arquivoBackup) : origemDoBanco(urlOrigem!);
  const destino = conectarPrisma(urlDestino);
  try {
    if (!somenteConferir) {
      console.log("Copiando...");
      await copiar(origem, destino);
    }
    const tudoIgual = imprimirComparacao(await origem.contar(), await contar(destino));
    console.log(tudoIgual ? "\nOs dois bancos estão com as mesmas contagens." : "\nHá diferenças entre os bancos.");
    if (!tudoIgual) process.exitCode = 1;
  } finally {
    await origem.fechar();
    await destino.$disconnect();
  }
}

principal().catch((erro) => {
  console.error(`\nErro: ${erro instanceof Error ? erro.message : erro}`);
  process.exitCode = 1;
});
