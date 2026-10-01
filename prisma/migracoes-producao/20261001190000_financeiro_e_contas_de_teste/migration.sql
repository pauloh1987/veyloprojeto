-- CreateEnum
CREATE TYPE "MoedaCusto" AS ENUM ('BRL', 'USD');

-- CreateEnum
CREATE TYPE "FrequenciaCusto" AS ENUM ('MENSAL', 'ANUAL', 'POR_MENSAGEM');

-- AlterTable
ALTER TABLE "Estabelecimento" ADD COLUMN     "contaDeTeste" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Custo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT '',
    "valor" DOUBLE PRECISION NOT NULL,
    "moeda" "MoedaCusto" NOT NULL DEFAULT 'BRL',
    "frequencia" "FrequenciaCusto" NOT NULL DEFAULT 'MENSAL',
    "observacao" TEXT NOT NULL DEFAULT '',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Custo_pkey" PRIMARY KEY ("id")
);


-- Custos que a equipe informou em 30/09/2026 (dá para editar na tela Financeiro do admin).
INSERT INTO "Custo" ("id", "nome", "categoria", "valor", "moeda", "frequencia", "observacao", "ativo", "atualizadoEm") VALUES
  ('custo-claude', 'Claude (assinatura)', 'Ferramentas', 110, 'BRL', 'MENSAL', 'Assinatura usada para desenvolver o sistema.', true, CURRENT_TIMESTAMP),
  ('custo-netlify', 'Netlify (site e servidor)', 'Infraestrutura', 9, 'USD', 'MENSAL', 'Plano Personal: 1.000 créditos por mês; cada deploy gasta 15.', true, CURRENT_TIMESTAMP),
  ('custo-dominio', 'Domínio veyloagenda.com.br', 'Infraestrutura', 40, 'BRL', 'ANUAL', 'Registro.br.', true, CURRENT_TIMESTAMP),
  ('custo-whatsapp', 'WhatsApp (Meta + Twilio)', 'Mensagens', 0.013, 'USD', 'POR_MENSAGEM', 'Estimativa por mensagem: Meta cerca de US$ 0,008 + Twilio US$ 0,005. Confira na fatura da Twilio.', true, CURRENT_TIMESTAMP),
  ('custo-neon', 'Neon (banco de dados)', 'Infraestrutura', 0, 'BRL', 'MENSAL', 'Plano grátis: até 100 horas de computação por mês.', true, CURRENT_TIMESTAMP),
  ('custo-resend', 'Resend (e-mails)', 'Infraestrutura', 0, 'BRL', 'MENSAL', 'Plano grátis: até 3.000 e-mails por mês.', true, CURRENT_TIMESTAMP);
