-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "canceladoPelaClienteEm" TIMESTAMP(3),
ADD COLUMN     "presencaConfirmadaEm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Mensagem" ADD COLUMN     "sidProvedor" TEXT;

-- CreateIndex
CREATE INDEX "Mensagem_sidProvedor_idx" ON "Mensagem"("sidProvedor");

