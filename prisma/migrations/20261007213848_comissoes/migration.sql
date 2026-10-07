-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN "comissaoPercentual" INTEGER;

-- CreateTable
CREATE TABLE "PagamentoComissao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "estabelecimentoId" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "mesReferencia" TEXT NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "pagoEm" DATETIME NOT NULL,
    "observacao" TEXT NOT NULL DEFAULT '',
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PagamentoComissao_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PagamentoComissao_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PagamentoComissao_estabelecimentoId_mesReferencia_idx" ON "PagamentoComissao"("estabelecimentoId", "mesReferencia");

-- CreateIndex
CREATE INDEX "PagamentoComissao_profissionalId_idx" ON "PagamentoComissao"("profissionalId");
