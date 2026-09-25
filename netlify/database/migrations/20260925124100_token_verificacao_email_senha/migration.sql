-- CreateEnum
CREATE TYPE "TipoTokenVerificacao" AS ENUM ('CONFIRMAR_EMAIL', 'REDEFINIR_SENHA');

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "emailVerificadoEm" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TokenVerificacao" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" "TipoTokenVerificacao" NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenVerificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TokenVerificacao_usuarioId_idx" ON "TokenVerificacao"("usuarioId");

-- AddForeignKey
ALTER TABLE "TokenVerificacao" ADD CONSTRAINT "TokenVerificacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

