-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN "canceladoPelaClienteEm" DATETIME;
ALTER TABLE "Agendamento" ADD COLUMN "presencaConfirmadaEm" DATETIME;

-- AlterTable
ALTER TABLE "Mensagem" ADD COLUMN "sidProvedor" TEXT;

-- CreateIndex
CREATE INDEX "Mensagem_sidProvedor_idx" ON "Mensagem"("sidProvedor");
