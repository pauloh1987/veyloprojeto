import "dotenv/config";
import { defineConfig } from "prisma/config";

// Config separado do prisma.config.ts (SQLite/local): usado só para gerar o Prisma Client
// de produção (schema.production.prisma → Postgres). A migração do banco em si não passa por
// aqui: quem aplica as migrações SQL de prisma/migracoes-producao no banco de produção (Neon)
// é scripts/aplicar-migracoes.mjs, no build. `prisma generate` não precisa de conexão viva,
// por isso usar process.env direto (sem o helper `env()`, que falharia ao carregar o config
// sem a variável) é seguro.
export default defineConfig({
  schema: "prisma/schema.production.prisma",
  datasource: {
    url: process.env.POSTGRES_URL ?? "",
  },
});
