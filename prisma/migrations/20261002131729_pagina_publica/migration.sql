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
    "instagram" TEXT NOT NULL DEFAULT '',
    "apresentacao" TEXT NOT NULL DEFAULT '',
    "avisoAgendamento" TEXT NOT NULL DEFAULT '',
    "plano" TEXT NOT NULL DEFAULT 'EQUIPE',
    "antecedenciaMinMin" INTEGER NOT NULL DEFAULT 120,
    "janelaAgendamentoSemanas" INTEGER NOT NULL DEFAULT 8,
    "confirmacaoAutomatica" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assinanteDesde" DATETIME,
    "parceira" BOOLEAN NOT NULL DEFAULT false,
    "testeAte" DATETIME,
    "contaDeTeste" BOOLEAN NOT NULL DEFAULT false,
    "guiaPassos" TEXT NOT NULL DEFAULT '',
    "guiaEscondidoEm" DATETIME
);
INSERT INTO "new_Estabelecimento" ("antecedenciaMinMin", "assinanteDesde", "confirmacaoAutomatica", "contaDeTeste", "corDestaque", "criadoEm", "endereco", "foto", "fuso", "guiaEscondidoEm", "guiaPassos", "id", "janelaAgendamentoSemanas", "logoFundo", "nome", "parceira", "plano", "slug", "telefone", "testeAte") SELECT "antecedenciaMinMin", "assinanteDesde", "confirmacaoAutomatica", "contaDeTeste", "corDestaque", "criadoEm", "endereco", "foto", "fuso", "guiaEscondidoEm", "guiaPassos", "id", "janelaAgendamentoSemanas", "logoFundo", "nome", "parceira", "plano", "slug", "telefone", "testeAte" FROM "Estabelecimento";
DROP TABLE "Estabelecimento";
ALTER TABLE "new_Estabelecimento" RENAME TO "Estabelecimento";
CREATE UNIQUE INDEX "Estabelecimento_slug_key" ON "Estabelecimento"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
