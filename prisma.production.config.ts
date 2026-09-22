import "dotenv/config";
import { defineConfig } from "prisma/config";

// Config separado do prisma.config.ts (SQLite/local): usado só pelos comandos de CLI que
// operam sobre o Postgres de produção (schema.production.prisma), incluindo onde procurar
// as migrações — sem isso, `migrate deploy` cairia de volta em prisma/migrations, que é
// SQL de SQLite. Usa process.env direto (em vez do helper `env()` do Prisma) porque esse
// helper falha ao só *carregar* o config se a variável não existir — e localmente
// NETLIFY_DATABASE_URL nunca existe (só é injetada pela Netlify em produção).
export default defineConfig({
  schema: "prisma/schema.production.prisma",
  migrations: {
    path: "prisma/migrations-production",
  },
  datasource: {
    url: process.env.NETLIFY_DATABASE_URL ?? "",
  },
});
