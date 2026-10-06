-- AlterTable
ALTER TABLE "Estabelecimento" ADD COLUMN     "avisoCancelamento" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "avisoNovoAgendamento" BOOLEAN NOT NULL DEFAULT true;

