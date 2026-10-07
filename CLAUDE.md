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
- Link público: o agendamento só vale quando a cliente toca em Confirmar no WhatsApp (pré-reserva
  de 30 minutos). A dona recebe e-mail a cada agendamento e cancelamento feitos pela cliente.
- Ao finalizar um atendimento, a janela de pagamento registra o valor cobrado, os adicionais e a
  forma (Pix, dinheiro, crédito, débito ou "Pagar depois", que no código é `FIADO`). A tela Financeiro mostra o que entrou no mês
  (por dia e por forma, com o caixa de cada dia), o fiado a receber por cliente, a comissão de cada
  profissional com os acertos já pagos (vales) e o que fica com o salão. Cada conta troca o próprio
  e-mail de acesso em Configurações.
- Fase atual (outubro/2026): piloto com 3 esmalterias, ainda sem cobrança. Time: Paulo
  (produto e tecnologia), Biel (implantação nas esmalterias) e Dudu (Instagram).

## Como rodar local

- `npm install`, `npm run db:migrate`, `npm run db:seed`, `npm run dev` (http://localhost:3000).
  Local usa SQLite (`prisma/dev.db`, fora do git) e nenhum serviço externo: sem as variáveis da
  Twilio e do Resend, mensagens e e-mails só aparecem no console.
- Admin local: coloque `ADMIN_EMAILS` com e-mails de teste no `.env.local` (fora do git; o `.env`
  vai para o git), peça o link em `/admin/entrar` e copie o link que aparece no console.
- Confirmação do link pelo WhatsApp no local: com `VEYLO_SIMULAR_WHATSAPP=1` no `.env.local`, o
  agendamento pelo link vira pré-reserva como em produção e a tela de espera ganha o botão
  "Simular o toque em Confirmar" (o webhook aceita requisição sem assinatura). Sem a variável, o
  link agenda direto.
- Verificações: `npm test` (vitest), `npx tsc --noEmit -p .` e `npx eslint <arquivos>`.
- Testar no navegador embutido do app Claude: com a janela do Claude escondida a página não termina
  de carregar (o React espera um requestAnimationFrame que não chega). Rode no console
  `window.$RV(window.$RB)`, chame `_reactRetry()` nos comentários do DOM que tiverem essa função,
  troque `window.requestAnimationFrame` por um `setTimeout` e daí navegue com
  `window.next.router.push(url)`. Clique pelo JavaScript (`elemento.click()`); formulário de server
  action envia com `form.submit()`. Contas de teste locais: ver `prisma/seed.ts`.
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
`RESEND_API_KEY` (segredo), `EMAIL_REMETENTE`, `POSTGRES_URL_TESTE` (segredo, banco do site de
teste) e `ADMIN_EMAILS` (quem entra no `/admin`, no
formato `Paulo <email>, Biel <email>, Dudu <email>`; sem ela ninguém entra). Opcionais ainda não configuradas:
`NEXT_PUBLIC_SENTRY_DSN` e `CRON_SECRET`. Quem cadastra segredos é o Paulo, pelo painel da
Netlify; o Claude não digita senhas nem chaves.

## Publicar custa créditos

- Push na `main` = deploy de produção na Netlify = 15 créditos. O plano Personal tem 1.000
  créditos por mês; em setembro/2026 eles acabaram e o site foi pausado. Junte as mudanças e
  publique no máximo uma vez por dia, salvo correção urgente.
- Commit só de documentação: coloque `[skip netlify]` na mensagem para não gerar deploy.
- Para testar antes de publicar, use a branch `teste`: cada push nela vira um branch deploy (não
  gasta os 15 créditos) em https://teste--veylo-agenda-286.netlify.app. Lá o banco é a branch
  `teste` do Neon (`POSTGRES_URL_TESTE`, cópia dos dados de produção), o WhatsApp é só simulado (a
  tela de espera do link tem "Simular o toque em Confirmar"), e-mail só sai para a equipe e uma
  faixa amarela avisa que é teste (`src/lib/ambiente.ts`). Aprovado, faça merge da `teste` na
  `main` e dê push: aí vai para produção.
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
  Quando a Twilio recusa um envio, o motivo fica em `Mensagem.erro` (código e mensagem): o admin
  mostra os erros recentes explicados (`src/lib/mensagens/erros.ts`) e a tela Mensagens do painel
  tem "Tentar de novo". A fila usa sempre o horário real (o relógio simulado foi removido).
- Agendamento pelo link nasce como pré-reserva (`AGUARDANDO_CLIENTE`, com prazo em `confirmarAte`)
  e só vale quando a cliente toca em Confirmar no WhatsApp (`src/lib/agenda/confirmacaoPeloWhatsApp.ts`).
  Toda consulta de agendamentos para a equipe (painel, relatório, admin) filtra `confirmarAte: null`,
  e a disponibilidade usa `filtroOcupaHorario` (`src/lib/agenda/preReserva.ts`).
- Finalizar um atendimento passa pela janela de pagamento (`FinalizarAtendimentoModal`,
  `src/lib/acoes/financeiro.ts`): valor cobrado em `Agendamento.valorTotalCentavos`, adicionais em
  `AdicionalAtendimento` e formas em `Pagamento` (fiado = `recebidoEm` vazio, a receber na tela
  Financeiro). Faturamento sempre por `valorDoAtendimento` (`src/lib/financeiro/fechamento.ts`), que
  cai no preço do serviço nos atendimentos antigos.
- Comissão sempre por `src/lib/financeiro/comissoes.ts` (Financeiro e Relatório). O percentual da
  profissional fica guardado no atendimento ao finalizar (`Agendamento.comissaoPercentual`; vazio =
  vale o atual dela) e o que já foi pago fica em `PagamentoComissao`, por mês de referência.
- Gráficos do painel usam a cor de dado `--grafico-1` (`globals.css`), não a cor do salão.

## Estado atual e pendências (07/10/2026)

- No ar desde 07/10/2026: confirmação pelo WhatsApp no link, aviso por e-mail para a dona, troca
  do e-mail de acesso e a janela de pagamento com a tela Financeiro (fiado). O trabalho do dia a
  dia é na branch `teste`; publicar é fazer merge dela na `main` (ver "Publicar custa créditos").
- Publicado em 07/10/2026: o Financeiro novo (comissões com acertos e
  vales, caixa por dia, fiado por cliente e "fica com o salão"), com a migração
  `prisma/migracoes-producao/20261007220000_comissoes`, e o backup diário guardando pagamentos,
  adicionais e acertos de comissão.
- Site de teste ainda não ligado. Falta o Paulo fazer, nesta ordem: (1) no Neon, criar a branch
  `teste` a partir da `main`, com os dados atuais, e copiar o endereço de conexão (pooled);
  (2) na Netlify, criar a variável `POSTGRES_URL_TESTE` (marcar "Contains secret values") com esse
  endereço; (3) na Netlify, em Build & deploy → Branches and deploy contexts → Branch deploys,
  adicionar a branch `teste`. Depois, um push na `teste` publica o site de teste.
- WhatsApp funcionando de ponta a ponta desde 01/10/2026: modelos aprovados pela Meta e perfil
  principal de conformidade (KYC) aprovado no Trust Hub da Twilio, como pessoa física (Individual);
  sem esse perfil a Twilio recusa os envios com o código 20003. Com o MEI: converter o perfil para
  comercial e pedir a verificação do negócio na Meta (selo verificado, para o nome "Veylo Agenda"
  aparecer no lugar do número para quem não salvou o contato).
- Custo do WhatsApp: cada agendamento manda confirmação e lembrete (modelos de utilidade: taxa da
  Meta mais US$ 0,005 da Twilio por mensagem). Trocar a Twilio pela API oficial da Meta direto
  corta mais da metade desse custo; vale fazer antes de crescer.
- Preço: a decisão é um plano só para a equipe inteira (R$ 89/mês) e um preço de fundadora para os
  primeiros salões (valor e prazo a confirmar; a ideia discutida foi R$ 59 travado por 12 meses).
  Ainda não existe no sistema: hoje teste grátis, parceira e assinante são marcados à mão no admin.
- Uma conta do piloto ainda usa o e-mail de teste no login (ver no admin): trocar em Configurações
  → "E-mail de acesso" para os avisos chegarem na dona.
- Investigar o selo "Powered by Netlify" que aparece no canto do link público (visto em 07/10).
- Marcar as esmalterias do piloto como parceiras no `/admin` antes dos 14 dias de teste.
- Atualizar `/privacidade` para citar Neon, WhatsApp (Meta) e Resend.
- Definir como cobrar (Pix manual no começo, cobrança automática depois), CNPJ/MEI (confirmar com
  contador se atividade de software pode ser MEI), termos de uso, a caixa
  contato@veyloagenda.com.br e o limite de mensagens de WhatsApp por plano.
- Ligar a recarga automática da Netlify e acompanhar as horas-CU do Neon (grátis até 100/mês). O
  Resend grátis manda até 100 e-mails por dia: com uns 12 salões, passar para o plano pago.

## Fora do repositório

- Instagram (@useveylo): pasta "Veylo Instagram" na Área de Trabalho do OneDrive do Paulo, com
  `01 - Apresentacao` (carrossel), `02 - Destaques` (stories dos destaques, capas e "Como
  postar.txt") e `03 - Parceria Studio Hulyanne` (carrossel e legenda). Cada pasta tem `fonte/` com
  o HTML: as imagens saem renderizando o HTML no Chrome sem janela (`--headless=new --screenshot`,
  1080×1440 no feed e 1080×1920 no story). Roteiros de abordagem em `Prospeccao/`.
- No claude.ai (mesma conta do Paulo): o roadmap da equipe e o Design System da Veylo, como
  artifacts. Os leads da prospecção ficam no admin (Funil), nunca no repositório (ele é público).
