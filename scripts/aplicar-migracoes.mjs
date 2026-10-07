import pg from "pg";
import { aplicarMigracoesPendentes } from "./migracoes-postgres.mjs";

/**
 * Roda no build da Netlify (netlify.toml), antes do `next build`: aplica no banco de produção
 * (Neon, em POSTGRES_URL) as migrações de `prisma/migracoes-producao` que ainda não foram
 * aplicadas. Sem POSTGRES_URL não faz nada: é o caso do ambiente local (SQLite) e das prévias
 * de deploy, que não têm banco de produção configurado.
 */
// No site de teste (branch deploy ou prévia de deploy), as migrações vão para o banco de teste
// (POSTGRES_URL_TESTE, uma branch do Neon) e nunca para o de produção. Sem ele, o build para.
const ehDeployDeTeste = process.env.CONTEXT === "branch-deploy" || process.env.CONTEXT === "deploy-preview";
const url = ehDeployDeTeste ? process.env.POSTGRES_URL_TESTE : process.env.POSTGRES_URL;
if (!url) {
  if (ehDeployDeTeste) {
    console.error("[migracoes] site de teste sem POSTGRES_URL_TESTE: cadastre o banco de teste na Netlify (ver CLAUDE.md).");
    process.exit(1);
  }
  console.log("[migracoes] POSTGRES_URL não definida: nada a aplicar.");
  process.exit(0);
}
console.log(`[migracoes] banco de ${ehDeployDeTeste ? "TESTE" : "produção"}.`);

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const aplicadas = await aplicarMigracoesPendentes(client, { log: (linha) => console.log(`[migracoes]${linha}`) });
  console.log(
    aplicadas.length === 0
      ? "[migracoes] banco já estava em dia."
      : `[migracoes] ${aplicadas.length} migração(ões) aplicada(s).`,
  );
} finally {
  await client.end();
}
