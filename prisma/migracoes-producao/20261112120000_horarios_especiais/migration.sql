-- CreateTable
CREATE TABLE "HorarioEspecial" (
    "id" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "abre" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "almocoInicio" TEXT,
    "almocoFim" TEXT,
    "fechado" BOOLEAN NOT NULL DEFAULT false,
    "horariosFixos" TEXT,

    CONSTRAINT "HorarioEspecial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HorarioEspecial_profissionalId_data_key" ON "HorarioEspecial"("profissionalId", "data");

-- AddForeignKey
ALTER TABLE "HorarioEspecial" ADD CONSTRAINT "HorarioEspecial_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

