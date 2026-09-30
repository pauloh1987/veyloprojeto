import pg from "pg";
import { aplicarMigracoesPendentes } from "./migracoes-postgres.mjs";

/**
 * Roda no build da Netlify (netlify.toml), antes do `next build`: aplica no banco de produção
 * (Neon, em POSTGRES_URL) as migrações de `netlify/database/migrations` que ainda não foram
 * aplicadas. Sem POSTGRES_URL não faz nada: é o caso do ambiente local e da produção enquanto
 * ela ainda usa o banco da própria Netlify, que aplica essas migrações sozinho.
 */
const url = process.env.POSTGRES_URL;
if (!url) {
  console.log("[migracoes] POSTGRES_URL não definida: nada a aplicar.");
  process.exit(0);
}

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
