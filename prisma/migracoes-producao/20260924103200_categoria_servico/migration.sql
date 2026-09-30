-- AlterTable
ALTER TABLE "Servico" ADD COLUMN     "categoriaId" TEXT;

-- CreateTable
CREATE TABLE "CategoriaServico" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "estabelecimentoId" TEXT NOT NULL,

    CONSTRAINT "CategoriaServico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoriaServico_estabelecimentoId_idx" ON "CategoriaServico"("estabelecimentoId");

-- CreateIndex
CREATE INDEX "Servico_categoriaId_idx" ON "Servico"("categoriaId");

-- AddForeignKey
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaServico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoriaServico" ADD CONSTRAINT "CategoriaServico_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

