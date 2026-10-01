-- CreateTable
CREATE TABLE "Custo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT '',
    "valor" REAL NOT NULL,
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "frequencia" TEXT NOT NULL DEFAULT 'MENSAL',
    "observacao" TEXT NOT NULL DEFAULT '',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Estabelecimento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "fuso" TEXT NOT NULL DEFAULT 'America/Recife',
    "corDestaque" TEXT NOT NULL DEFAULT '#0EA5A0',
    "foto" TEXT,
    "logoFundo" TEXT NOT NULL DEFAULT '#FFFFFF',
    "plano" TEXT NOT NULL DEFAULT 'EQUIPE',
    "antecedenciaMinMin" INTEGER NOT NULL DEFAULT 120,
    "janelaAgendamentoSemanas" INTEGER NOT NULL DEFAULT 8,
    "confirmacaoAutomatica" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assinanteDesde" DATETIME,
    "parceira" BOOLEAN NOT NULL DEFAULT false,
    "testeAte" DATETIME,
    "contaDeTeste" BOOLEAN NOT NULL DEFAULT false,
    "guiaPassos" TEXT NOT NULL DEFAULT '',
    "guiaEscondidoEm" DATETIME
);
INSERT INTO "new_Estabelecimento" ("antecedenciaMinMin", "assinanteDesde", "confirmacaoAutomatica", "corDestaque", "criadoEm", "endereco", "foto", "fuso", "guiaEscondidoEm", "guiaPassos", "id", "janelaAgendamentoSemanas", "logoFundo", "nome", "parceira", "plano", "slug", "telefone", "testeAte") SELECT "antecedenciaMinMin", "assinanteDesde", "confirmacaoAutomatica", "corDestaque", "criadoEm", "endereco", "foto", "fuso", "guiaEscondidoEm", "guiaPassos", "id", "janelaAgendamentoSemanas", "logoFundo", "nome", "parceira", "plano", "slug", "telefone", "testeAte" FROM "Estabelecimento";
DROP TABLE "Estabelecimento";
ALTER TABLE "new_Estabelecimento" RENAME TO "Estabelecimento";
CREATE UNIQUE INDEX "Estabelecimento_slug_key" ON "Estabelecimento"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Custos que a equipe informou em 30/09/2026 (dá para editar na tela Financeiro do admin).
INSERT INTO "Custo" ("id", "nome", "categoria", "valor", "moeda", "frequencia", "observacao", "ativo", "criadoEm", "atualizadoEm") VALUES
  ('custo-claude', 'Claude (assinatura)', 'Ferramentas', 110, 'BRL', 'MENSAL', 'Assinatura usada para desenvolver o sistema.', true, strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'), strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')),
  ('custo-netlify', 'Netlify (site e servidor)', 'Infraestrutura', 9, 'USD', 'MENSAL', 'Plano Personal: 1.000 créditos por mês; cada deploy gasta 15.', true, strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'), strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')),
  ('custo-dominio', 'Domínio veyloagenda.com.br', 'Infraestrutura', 40, 'BRL', 'ANUAL', 'Registro.br.', true, strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'), strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')),
  ('custo-whatsapp', 'WhatsApp (Meta + Twilio)', 'Mensagens', 0.013, 'USD', 'POR_MENSAGEM', 'Estimativa por mensagem: Meta cerca de US$ 0,008 + Twilio US$ 0,005. Confira na fatura da Twilio.', true, strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'), strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')),
  ('custo-neon', 'Neon (banco de dados)', 'Infraestrutura', 0, 'BRL', 'MENSAL', 'Plano grátis: até 100 horas de computação por mês.', true, strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'), strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')),
  ('custo-resend', 'Resend (e-mails)', 'Infraestrutura', 0, 'BRL', 'MENSAL', 'Plano grátis: até 3.000 e-mails por mês.', true, strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'), strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'));
