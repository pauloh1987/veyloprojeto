-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN "valorServicoCentavos" INTEGER;
ALTER TABLE "Agendamento" ADD COLUMN "valorTotalCentavos" INTEGER;

-- CreateTable
CREATE TABLE "AdicionalAtendimento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agendamentoId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    CONSTRAINT "AdicionalAtendimento_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "estabelecimentoId" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "forma" TEXT NOT NULL,
    "recebidoEm" DATETIME,
    "formaRecebimento" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pagamento_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pagamento_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AdicionalAtendimento_agendamentoId_idx" ON "AdicionalAtendimento"("agendamentoId");

-- CreateIndex
CREATE INDEX "Pagamento_estabelecimentoId_recebidoEm_idx" ON "Pagamento"("estabelecimentoId", "recebidoEm");

-- CreateIndex
CREATE INDEX "Pagamento_agendamentoId_idx" ON "Pagamento"("agendamentoId");
