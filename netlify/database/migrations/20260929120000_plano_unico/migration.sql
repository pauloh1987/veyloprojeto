-- AlterTable
ALTER TABLE "Estabelecimento" ALTER COLUMN "plano" SET DEFAULT 'EQUIPE';


-- Plano único: todo estabelecimento existente passa a ter todos os recursos.
UPDATE "Estabelecimento" SET "plano" = 'EQUIPE';
