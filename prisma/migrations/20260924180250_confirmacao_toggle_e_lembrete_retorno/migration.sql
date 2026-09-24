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
    "confirmacaoAutomatica" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assinanteDesde" DATETIME
);
INSERT INTO "new_Estabelecimento" ("antecedenciaMinMin", "assinanteDesde", "corDestaque", "criadoEm", "endereco", "foto", "fuso", "id", "logoFundo", "nome", "plano", "slug", "telefone") SELECT "antecedenciaMinMin", "assinanteDesde", "corDestaque", "criadoEm", "endereco", "foto", "fuso", "id", "logoFundo", "nome", "plano", "slug", "telefone" FROM "Estabelecimento";
DROP TABLE "Estabelecimento";
ALTER TABLE "new_Estabelecimento" RENAME TO "Estabelecimento";
CREATE UNIQUE INDEX "Estabelecimento_slug_key" ON "Estabelecimento"("slug");
CREATE TABLE "new_Mensagem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agendamentoId" TEXT,
    "clienteId" TEXT,
    "tipo" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "texto" TEXT NOT NULL,
    "variaveisTemplate" TEXT,
    "agendadaPara" DATETIME NOT NULL,
    "enviadaEm" DATETIME,
    CONSTRAINT "Mensagem_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Mensagem_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Mensagem" ("agendadaPara", "agendamentoId", "canal", "enviadaEm", "id", "status", "texto", "tipo", "variaveisTemplate") SELECT "agendadaPara", "agendamentoId", "canal", "enviadaEm", "id", "status", "texto", "tipo", "variaveisTemplate" FROM "Mensagem";
DROP TABLE "Mensagem";
ALTER TABLE "new_Mensagem" RENAME TO "Mensagem";
CREATE INDEX "Mensagem_status_agendadaPara_idx" ON "Mensagem"("status", "agendadaPara");
CREATE INDEX "Mensagem_clienteId_idx" ON "Mensagem"("clienteId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
