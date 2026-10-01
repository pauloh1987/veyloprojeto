-- CreateEnum
CREATE TYPE "EtapaLead" AS ENUM ('PROSPECCAO', 'CONTATO', 'DEMONSTRACAO', 'EM_TESTE', 'FECHADO', 'PERDIDO');

-- AlterTable
ALTER TABLE "Estabelecimento" ADD COLUMN     "parceira" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "testeAte" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "ultimoLoginEm" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "contato" TEXT NOT NULL DEFAULT '',
    "telefone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "instagram" TEXT NOT NULL DEFAULT '',
    "cidade" TEXT NOT NULL DEFAULT '',
    "segmento" TEXT NOT NULL DEFAULT '',
    "etapa" "EtapaLead" NOT NULL DEFAULT 'PROSPECCAO',
    "responsavel" TEXT NOT NULL DEFAULT '',
    "proximoContatoEm" TIMESTAMP(3),
    "anotacoes" TEXT NOT NULL DEFAULT '',
    "estabelecimentoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkAcessoAdmin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),

    CONSTRAINT "LinkAcessoAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessaoAdmin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessaoAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_estabelecimentoId_key" ON "Lead"("estabelecimentoId");

-- CreateIndex
CREATE INDEX "Lead_etapa_idx" ON "Lead"("etapa");

-- CreateIndex
CREATE INDEX "LinkAcessoAdmin_email_idx" ON "LinkAcessoAdmin"("email");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

