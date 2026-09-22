import "dotenv/config";
import { defineConfig } from "prisma/config";

// Config separado do prisma.config.ts (SQLite/local): usado só para gerar o Prisma Client
// de produção (schema.production.prisma → Postgres). A migração do banco em si NÃO passa
// por aqui — a Netlify não expõe a URL de conexão para o build.command customizado, só
// para o runtime da aplicação, então quem aplica o schema é o mecanismo próprio dela
// (netlify/database/migrations), automaticamente antes do build rodar. `prisma generate`
// não precisa de conexão viva, por isso usar process.env direto (sem o helper `env()`, que
// falharia ao carregar o config sem a variável) é seguro. O nome certo é NETLIFY_DB_URL —
// não NETLIFY_DATABASE_URL — conferido no código-fonte de @netlify/database.
export default defineConfig({
  schema: "prisma/schema.production.prisma",
  datasource: {
    url: process.env.NETLIFY_DB_URL ?? "",
  },
});
