-- AlterEnum
ALTER TYPE "CanalMensagem" ADD VALUE 'WHATSAPP';

-- AlterTable
ALTER TABLE "Mensagem" ADD COLUMN     "variaveisTemplate" TEXT;

