-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('PIX', 'DINHEIRO', 'CREDITO', 'DEBITO', 'FIADO');

-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "valorServicoCentavos" INTEGER,
ADD COLUMN     "valorTotalCentavos" INTEGER;

-- CreateTable
CREATE TABLE "AdicionalAtendimento" (
    "id" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valorCentavos" INTEGER NOT NULL,

    CONSTRAINT "AdicionalAtendimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" TEXT NOT NULL,
    "estabelecimentoId" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "forma" "FormaPagamento" NOT NULL,
    "recebidoEm" TIMESTAMP(3),
    "formaRecebimento" "FormaPagamento",
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdicionalAtendimento_agendamentoId_idx" ON "AdicionalAtendimento"("agendamentoId");

-- CreateIndex
CREATE INDEX "Pagamento_estabelecimentoId_recebidoEm_idx" ON "Pagamento"("estabelecimentoId", "recebidoEm");

-- CreateIndex
CREATE INDEX "Pagamento_agendamentoId_idx" ON "Pagamento"("agendamentoId");

-- AddForeignKey
ALTER TABLE "AdicionalAtendimento" ADD CONSTRAINT "AdicionalAtendimento_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

