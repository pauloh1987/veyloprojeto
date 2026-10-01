-- AlterTable
ALTER TABLE "Estabelecimento" ADD COLUMN     "guiaEscondidoEm" TIMESTAMP(3),
ADD COLUMN     "guiaPassos" TEXT NOT NULL DEFAULT '';

-- Quem já recebe agendamentos pelo link já passou pela configuração inicial: o guia começa
-- escondido para essas contas (dá para mostrar de novo em Configurações).
UPDATE "Estabelecimento" SET "guiaEscondidoEm" = CURRENT_TIMESTAMP
WHERE "id" IN (SELECT DISTINCT "estabelecimentoId" FROM "Agendamento" WHERE "origem" = 'LINK');
