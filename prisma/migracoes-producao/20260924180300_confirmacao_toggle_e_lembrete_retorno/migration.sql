-- AlterTable
ALTER TABLE "Estabelecimento" ADD COLUMN     "confirmacaoAutomatica" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Mensagem" ADD COLUMN     "clienteId" TEXT,
ALTER COLUMN "agendamentoId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Mensagem_clienteId_idx" ON "Mensagem"("clienteId");

-- AddForeignKey
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

