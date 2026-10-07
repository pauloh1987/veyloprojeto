-- AlterEnum
ALTER TYPE "StatusAgendamento" ADD VALUE 'AGUARDANDO_CLIENTE';

-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "confirmarAte" TIMESTAMP(3);

