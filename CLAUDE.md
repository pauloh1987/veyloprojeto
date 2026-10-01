@AGENTS.md

# Veylo Agenda: contexto do projeto

Leia isto antes de mexer no código. O porquê de cada decisão técnica está em `DECISOES.md`
(leia a seção do assunto que for mudar). O `README.md` descreve o produto e como rodar local,
mas as partes sobre mensagens e produção são da primeira versão: hoje o WhatsApp e o e-mail são
de verdade e a produção roda na Netlify + Neon, como descrito abaixo.

## O produto

- SaaS de agendamento para salões, esmalterias, barbearias, sobrancelhas e estética no Brasil.
  Interface e código em português (variáveis, funções, commits e documentação).
- Três áreas: link público de agendamento (`/[slug]`), painel do negócio (`/painel/*`) e
  cadastro self-service (`/cadastro`). Página institucional em `/` (`src/app/page.tsx`).
- Conta nova vê o guia "Comece por aqui" no topo da tela Hoje (7 passos, `src/lib/guia/`); a
  dona pode esconder e mostrar de novo em Configurações.
- Plano único de R$ 89/mês, com tudo incluso e profissionais ilimitadas (desde 29/09/2026). O
  enum `Plano` ainda tem SOLO/EQUIPE, mas toda conta é EQUIPE.
- Teste grátis de 14 dias: quando acaba, só aparece um aviso no painel (`src/lib/assinatura.ts`).
  Ainda não existe cobrança automática. Conta paga = `Estabelecimento.assinanteDesde` preenchido;
  `parceira` = piloto sem cobrança; `testeAte` = teste estendido. Os três se mudam no admin.
- Admin interno da equipe em `/admin` (sem link no site, fora do Google; código em
  `src/lib/admin/` e `src/app/admin/`). Entra quem está em `ADMIN_EMAILS`, por um link enviado ao
  e-mail. Telas: Visão geral (financeiro do mês, números, gráficos e "Precisa de atenção"),
  Salões (botões "+7 dias de teste", parceira, assinante e "Marcar como teste"; conta de teste
  sai dos números e só ela pode ser excluída de vez), Funil (`Lead`; o cadastro com o mesmo
  telefone ou e-mail passa o contato para "Em teste") e Financeiro (custos editáveis na tabela
  `Custo`, em real ou dólar, por mês, por ano ou por mensagem de WhatsApp; dólar do dia pela
  AwesomeAPI).
- Fase atual (fim de setembro/2026): piloto com 3 esmalterias, ainda sem cobrança. Time: Paulo
  (produto e tecnologia), Biel (implantação nas esmalterias) e Dudu (Instagram).

## Como rodar local

- `npm install`, `npm run db:migrate`, `npm run db:seed`, `npm run dev` (http://localhost:3000).
  Local usa SQLite (`prisma/dev.db`, fora do git) e nenhum serviço externo: sem as variáveis da
  Twilio e do Resend, mensagens e e-mails só aparecem no console.
- Admin local: coloque `ADMIN_EMAILS` com e-mails de teste no `.env.local` (fora do git; o `.env`
  vai para o git), peça o link em `/admin/entrar` e copie o link que aparece no console.
- Verificações: `npm test` (vitest), `npx tsc --noEmit -p .` e `npx eslint <arquivos>`.
- Windows/OneDrive: pare o `next dev` antes de `rm -rf .next && npm run build`; com o servidor
  rodando, o cache do Turbopack trava ou corrompe.

## Produção

| Parte | Onde |
|---|---|
| Site, painel e link público | Netlify, projeto `veylo-agenda-286` (site id `2d7efbcf-7dba-45c9-9c3a-beecb2b8de0b`), domínio veyloagenda.com.br registrado no Registro.br |
| Banco | Neon Postgres, região AWS us-east-1 (a mesma das funções da Netlify), plano grátis |
| Tarefas agendadas | `netlify/functions/cron-mensagens.mts` (08h, 12h e 18h de Brasília) e `backup-diario.mts` (08h; JSON no Netlify Blobs, guardado por 30 dias) |
| WhatsApp | Twilio, número da Veylo `whatsapp:+558191655358` (perfil "Veylo Agenda"); modelos `veylo_confirmacao` e `veylo_lembrete` (botões Confirmar/Cancelar, IDs `CONFIRMAR`/`CANCELAR`) e `veylo_convite_retorno`; as respostas chegam em `/api/whatsapp/entrada` |
| E-mail | Resend, remetente `nao-responda@veyloagenda.com.br` (domínio verificado) |

Variáveis de ambiente de produção, cadastradas na Netlify (os valores ficam só lá, nunca no git
nem na conversa): `POSTGRES_URL` (segredo, só produção), `TWILIO_ACCOUNT_SID`,
`TWILIO_AUTH_TOKEN` (segredo), `TWILIO_WHATSAPP_FROM`, `TWILIO_WHATSAPP_CONTENT_SID_CONFIRMACAO`,
`TWILIO_WHATSAPP_CONTENT_SID_LEMBRETE`, `TWILIO_WHATSAPP_CONTENT_SID_CONVITE_RETORNO`,
`RESEND_API_KEY` (segredo), `EMAIL_REMETENTE` e `ADMIN_EMAILS` (quem entra no `/admin`, no
formato `Paulo <email>, Biel <email>, Dudu <email>`; sem ela ninguém entra). Opcionais ainda não configuradas:
`NEXT_PUBLIC_SENTRY_DSN` e `CRON_SECRET`. Quem cadastra segredos é o Paulo, pelo painel da
Netlify; o Claude não digita senhas nem chaves.

## Publicar custa créditos

- Push na `main` = deploy de produção na Netlify = 15 créditos. O plano Personal tem 1.000
  créditos por mês; em setembro/2026 eles acabaram e o site foi pausado. Junte as mudanças e
  publique no máximo uma vez por dia, salvo correção urgente.
- Commit só de documentação: coloque `[skip netlify]` na mensagem para não gerar deploy.
- Depois do push, acompanhe até o fim com
  `netlify api listSiteDeploys --data '{"site_id":"2d7efbcf-7dba-45c9-9c3a-beecb2b8de0b","per_page":1}'`
  (`ready` = no ar; `error` = o build falhou, e deploy com erro não custa crédito).

## Mudar o banco (schema)

1. Altere os dois schemas: `prisma/schema.prisma` (SQLite, local) e
   `prisma/schema.production.prisma` (Postgres, produção).
2. Local: `npx prisma migrate dev --name <nome>`, depois `npx prisma generate` e
   `npx prisma generate --schema prisma/schema.production.prisma`. Reinicie o `next dev`.
3. Produção: gere o SQL comparando com o schema do último commit e salve em
   `prisma/migracoes-producao/<AAAAMMDDhhmmss>_<nome>/migration.sql`, por exemplo:
   `git show HEAD:prisma/schema.production.prisma > /tmp/antigo.prisma` e
   `npx prisma migrate diff --from-schema=/tmp/antigo.prisma --to-schema=prisma/schema.production.prisma --script`
   (guarde a saída padrão no arquivo e os avisos à parte). Mudança de dados (ex.: `UPDATE`)
   pode ir no fim do mesmo arquivo.
4. No deploy, `scripts/aplicar-migracoes.mjs` aplica no Neon as migrações que faltam (controle
   na tabela `_veylo_migracoes`).

## Convenções do código

- Server actions devolvem `EstadoAcao` (`{ erro?, sucesso? }`) em vez de lançar erro, porque em
  produção a mensagem de um erro lançado some. Validação com zod em `src/lib/validacao.ts`.
- Datas no fuso do estabelecimento (`src/lib/tz.ts`); telefone guardado só com dígitos.
- Mensagens de WhatsApp/SMS passam por `src/lib/mensagens/`: `notificador.ts` escolhe o provedor
  pelas variáveis de ambiente, `fila.ts` agenda e envia, `textos.ts` monta o texto e as 4
  variáveis dos modelos. Mudar o texto de uma mensagem exige mudar e reaprovar o modelo na Meta.

## Pendências (01/10/2026)

- A Meta aprovou os 3 modelos de WhatsApp (01/10/2026) e os SIDs na Netlify conferem. Falta o
  teste de ponta a ponta: agendar → confirmação → tocar em Confirmar → aparecer em Hoje, em
  "Respostas das clientes"; e o lembrete, que sai na rodada seguinte da fila (08h, 12h ou 18h).
- Marcar as esmalterias do piloto como parceiras no `/admin` antes dos 14 dias de teste.
- Atualizar `/privacidade` para citar Neon, WhatsApp (Meta) e Resend.
- Definir como cobrar (Pix manual no começo, cobrança automática depois), CNPJ/MEI, termos de
  uso, a caixa contato@veyloagenda.com.br e o limite de mensagens de WhatsApp por plano.
- Ligar a recarga automática da Netlify e acompanhar as horas-CU do Neon (grátis até 100/mês).
