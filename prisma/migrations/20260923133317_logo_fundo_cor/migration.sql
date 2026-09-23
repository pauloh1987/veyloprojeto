-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Estabelecimento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "fuso" TEXT NOT NULL DEFAULT 'America/Recife',
    "corDestaque" TEXT NOT NULL DEFAULT '#0EA5A0',
    "foto" TEXT,
    "logoFundo" TEXT NOT NULL DEFAULT '#FFFFFF',
    "plano" TEXT NOT NULL DEFAULT 'SOLO',
    "antecedenciaMinMin" INTEGER NOT NULL DEFAULT 120,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Estabelecimento" ("antecedenciaMinMin", "corDestaque", "criadoEm", "endereco", "foto", "fuso", "id", "nome", "plano", "slug", "telefone") SELECT "antecedenciaMinMin", "corDestaque", "criadoEm", "endereco", "foto", "fuso", "id", "nome", "plano", "slug", "telefone" FROM "Estabelecimento";
DROP TABLE "Estabelecimento";
ALTER TABLE "new_Estabelecimento" RENAME TO "Estabelecimento";
CREATE UNIQUE INDEX "Estabelecimento_slug_key" ON "Estabelecimento"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
