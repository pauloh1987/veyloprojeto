-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "contato" TEXT NOT NULL DEFAULT '',
    "telefone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "instagram" TEXT NOT NULL DEFAULT '',
    "cidade" TEXT NOT NULL DEFAULT '',
    "segmento" TEXT NOT NULL DEFAULT '',
    "etapa" TEXT NOT NULL DEFAULT 'PROSPECCAO',
    "responsavel" TEXT NOT NULL DEFAULT '',
    "proximoContatoEm" DATETIME,
    "anotacoes" TEXT NOT NULL DEFAULT '',
    "estabelecimentoId" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Lead_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LinkAcessoAdmin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" DATETIME NOT NULL,
    "usadoEm" DATETIME
);

-- CreateTable
CREATE TABLE "SessaoAdmin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "criadaEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" DATETIME NOT NULL
);

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
    "plano" TEXT NOT NULL DEFAULT 'EQUIPE',
    "antecedenciaMinMin" INTEGER NOT NULL DEFAULT 120,
    "janelaAgendamentoSemanas" INTEGER NOT NULL DEFAULT 8,
    "confirmacaoAutomatica" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assinanteDesde" DATETIME,
    "parceira" BOOLEAN NOT NULL DEFAULT false,
    "testeAte" DATETIME,
    "guiaPassos" TEXT NOT NULL DEFAULT '',
    "guiaEscondidoEm" DATETIME
);
INSERT INTO "new_Estabelecimento" ("antecedenciaMinMin", "assinanteDesde", "confirmacaoAutomatica", "corDestaque", "criadoEm", "endereco", "foto", "fuso", "guiaEscondidoEm", "guiaPassos", "id", "janelaAgendamentoSemanas", "logoFundo", "nome", "plano", "slug", "telefone") SELECT "antecedenciaMinMin", "assinanteDesde", "confirmacaoAutomatica", "corDestaque", "criadoEm", "endereco", "foto", "fuso", "guiaEscondidoEm", "guiaPassos", "id", "janelaAgendamentoSemanas", "logoFundo", "nome", "plano", "slug", "telefone" FROM "Estabelecimento";
DROP TABLE "Estabelecimento";
ALTER TABLE "new_Estabelecimento" RENAME TO "Estabelecimento";
CREATE UNIQUE INDEX "Estabelecimento_slug_key" ON "Estabelecimento"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Lead_estabelecimentoId_key" ON "Lead"("estabelecimentoId");

-- CreateIndex
CREATE INDEX "Lead_etapa_idx" ON "Lead"("etapa");

-- CreateIndex
CREATE INDEX "LinkAcessoAdmin_email_idx" ON "LinkAcessoAdmin"("email");
