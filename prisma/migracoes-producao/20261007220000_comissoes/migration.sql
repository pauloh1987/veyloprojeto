-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "comissaoPercentual" INTEGER;

-- CreateTable
CREATE TABLE "PagamentoComissao" (
    "id" TEXT NOT NULL,
    "estabelecimentoId" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "mesReferencia" TEXT NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "pagoEm" TIMESTAMP(3) NOT NULL,
    "observacao" TEXT NOT NULL DEFAULT '',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagamentoComissao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PagamentoComissao_estabelecimentoId_mesReferencia_idx" ON "PagamentoComissao"("estabelecimentoId", "mesReferencia");

-- CreateIndex
CREATE INDEX "PagamentoComissao_profissionalId_idx" ON "PagamentoComissao"("profissionalId");

-- AddForeignKey
ALTER TABLE "PagamentoComissao" ADD CONSTRAINT "PagamentoComissao_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoComissao" ADD CONSTRAINT "PagamentoComissao_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Dados: os atendimentos já finalizados guardam a comissão atual da profissional, para o histórico
-- não mudar se a comissão dela mudar depois (quem não tem comissão definida continua vazio).
UPDATE "Agendamento" AS a
SET "comissaoPercentual" = p."comissaoPercentual"
FROM "Profissional" AS p
WHERE a."profissionalId" = p."id"
  AND a."status" = 'ATENDIDO'
  AND a."comissaoPercentual" IS NULL
  AND p."comissaoPercentual" IS NOT NULL;
