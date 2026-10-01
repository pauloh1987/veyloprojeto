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
    "guiaPassos" TEXT NOT NULL DEFAULT '',
    "guiaEscondidoEm" DATETIME
);
INSERT INTO "new_Estabelecimento" ("antecedenciaMinMin", "assinanteDesde", "confirmacaoAutomatica", "corDestaque", "criadoEm", "endereco", "foto", "fuso", "id", "janelaAgendamentoSemanas", "logoFundo", "nome", "plano", "slug", "telefone") SELECT "antecedenciaMinMin", "assinanteDesde", "confirmacaoAutomatica", "corDestaque", "criadoEm", "endereco", "foto", "fuso", "id", "janelaAgendamentoSemanas", "logoFundo", "nome", "plano", "slug", "telefone" FROM "Estabelecimento";
DROP TABLE "Estabelecimento";
ALTER TABLE "new_Estabelecimento" RENAME TO "Estabelecimento";
CREATE UNIQUE INDEX "Estabelecimento_slug_key" ON "Estabelecimento"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Quem já recebe agendamentos pelo link já passou pela configuração inicial: o guia começa
-- escondido para essas contas (dá para mostrar de novo em Configurações).
UPDATE "Estabelecimento" SET "guiaEscondidoEm" = strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')
WHERE "id" IN (SELECT DISTINCT "estabelecimentoId" FROM "Agendamento" WHERE "origem" = 'LINK');
