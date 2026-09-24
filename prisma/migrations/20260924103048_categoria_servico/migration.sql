-- CreateTable
CREATE TABLE "CategoriaServico" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "estabelecimentoId" TEXT NOT NULL,
    CONSTRAINT "CategoriaServico_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Servico" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "duracaoMin" INTEGER NOT NULL,
    "precoCentavos" INTEGER NOT NULL,
    "cor" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "estabelecimentoId" TEXT NOT NULL,
    "categoriaId" TEXT,
    CONSTRAINT "Servico_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Servico_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaServico" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Servico" ("ativo", "cor", "descricao", "duracaoMin", "estabelecimentoId", "id", "nome", "precoCentavos") SELECT "ativo", "cor", "descricao", "duracaoMin", "estabelecimentoId", "id", "nome", "precoCentavos" FROM "Servico";
DROP TABLE "Servico";
ALTER TABLE "new_Servico" RENAME TO "Servico";
CREATE INDEX "Servico_estabelecimentoId_idx" ON "Servico"("estabelecimentoId");
CREATE INDEX "Servico_categoriaId_idx" ON "Servico"("categoriaId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CategoriaServico_estabelecimentoId_idx" ON "CategoriaServico"("estabelecimentoId");
