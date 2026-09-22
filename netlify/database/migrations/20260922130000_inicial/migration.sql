-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Plano" AS ENUM ('SOLO', 'EQUIPE');

-- CreateEnum
CREATE TYPE "PapelUsuario" AS ENUM ('DONO', 'PROFISSIONAL');

-- CreateEnum
CREATE TYPE "StatusAgendamento" AS ENUM ('PENDENTE', 'CONFIRMADO', 'ATENDIDO', 'FALTOU', 'CANCELADO');

-- CreateEnum
CREATE TYPE "OrigemAgendamento" AS ENUM ('LINK', 'MANUAL');

-- CreateEnum
CREATE TYPE "TipoMensagem" AS ENUM ('CONFIRMACAO', 'LEMBRETE', 'CONVITE_RETORNO');

-- CreateEnum
CREATE TYPE "CanalMensagem" AS ENUM ('SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "StatusMensagem" AS ENUM ('PENDENTE', 'ENVIADA', 'ERRO', 'CANCELADA');

-- CreateTable
CREATE TABLE "Estabelecimento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "fuso" TEXT NOT NULL DEFAULT 'America/Recife',
    "corDestaque" TEXT NOT NULL DEFAULT '#0EA5A0',
    "foto" TEXT,
    "plano" "Plano" NOT NULL DEFAULT 'SOLO',
    "antecedenciaMinMin" INTEGER NOT NULL DEFAULT 120,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Estabelecimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" "PapelUsuario" NOT NULL,
    "estabelecimentoId" TEXT NOT NULL,
    "profissionalId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sessao" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sessao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profissional" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "foto" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "estabelecimentoId" TEXT NOT NULL,

    CONSTRAINT "Profissional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servico" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "duracaoMin" INTEGER NOT NULL,
    "precoCentavos" INTEGER NOT NULL,
    "cor" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "estabelecimentoId" TEXT NOT NULL,

    CONSTRAINT "Servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicoProfissional" (
    "servicoId" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,

    CONSTRAINT "ServicoProfissional_pkey" PRIMARY KEY ("servicoId","profissionalId")
);

-- CreateTable
CREATE TABLE "HorarioFuncionamento" (
    "id" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "abre" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "almocoInicio" TEXT,
    "almocoFim" TEXT,
    "fechado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "HorarioFuncionamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bloqueio" (
    "id" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT NOT NULL,

    CONSTRAINT "Bloqueio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "observacoes" TEXT,
    "estabelecimentoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agendamento" (
    "id" TEXT NOT NULL,
    "estabelecimentoId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "status" "StatusAgendamento" NOT NULL DEFAULT 'PENDENTE',
    "origem" "OrigemAgendamento" NOT NULL,
    "observacao" TEXT,
    "tokenPublico" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agendamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelogioSimulado" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "offsetMin" INTEGER NOT NULL DEFAULT 0,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RelogioSimulado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mensagem" (
    "id" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "tipo" "TipoMensagem" NOT NULL,
    "canal" "CanalMensagem" NOT NULL,
    "status" "StatusMensagem" NOT NULL DEFAULT 'PENDENTE',
    "texto" TEXT NOT NULL,
    "agendadaPara" TIMESTAMP(3) NOT NULL,
    "enviadaEm" TIMESTAMP(3),

    CONSTRAINT "Mensagem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Estabelecimento_slug_key" ON "Estabelecimento"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_profissionalId_key" ON "Usuario"("profissionalId");

-- CreateIndex
CREATE INDEX "Usuario_estabelecimentoId_idx" ON "Usuario"("estabelecimentoId");

-- CreateIndex
CREATE INDEX "Sessao_usuarioId_idx" ON "Sessao"("usuarioId");

-- CreateIndex
CREATE INDEX "Profissional_estabelecimentoId_idx" ON "Profissional"("estabelecimentoId");

-- CreateIndex
CREATE INDEX "Servico_estabelecimentoId_idx" ON "Servico"("estabelecimentoId");

-- CreateIndex
CREATE UNIQUE INDEX "HorarioFuncionamento_profissionalId_diaSemana_key" ON "HorarioFuncionamento"("profissionalId", "diaSemana");

-- CreateIndex
CREATE INDEX "Bloqueio_profissionalId_inicio_fim_idx" ON "Bloqueio"("profissionalId", "inicio", "fim");

-- CreateIndex
CREATE INDEX "Cliente_estabelecimentoId_idx" ON "Cliente"("estabelecimentoId");

-- CreateIndex
CREATE UNIQUE INDEX "Agendamento_tokenPublico_key" ON "Agendamento"("tokenPublico");

-- CreateIndex
CREATE INDEX "Agendamento_profissionalId_inicio_idx" ON "Agendamento"("profissionalId", "inicio");

-- CreateIndex
CREATE INDEX "Agendamento_estabelecimentoId_inicio_idx" ON "Agendamento"("estabelecimentoId", "inicio");

-- CreateIndex
CREATE INDEX "Mensagem_status_agendadaPara_idx" ON "Mensagem"("status", "agendadaPara");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sessao" ADD CONSTRAINT "Sessao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profissional" ADD CONSTRAINT "Profissional_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicoProfissional" ADD CONSTRAINT "ServicoProfissional_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicoProfissional" ADD CONSTRAINT "ServicoProfissional_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioFuncionamento" ADD CONSTRAINT "HorarioFuncionamento_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bloqueio" ADD CONSTRAINT "Bloqueio_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

