-- AlterTable
ALTER TABLE "Estabelecimento" ADD COLUMN "assinanteDesde" DATETIME;

-- Contas que já existiam antes do período de teste grátis existir viram assinantes retroativamente,
-- pra não ficarem "expiradas" da noite pro dia por causa de uma regra que não existia quando elas
-- foram criadas. Só cadastros feitos a partir de agora entram de fato no período de teste.
UPDATE "Estabelecimento" SET "assinanteDesde" = "criadoEm" WHERE "assinanteDesde" IS NULL;
