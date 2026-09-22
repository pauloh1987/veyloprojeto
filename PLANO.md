# Plano — Veylo Agenda

Protótipo completo de SaaS de agendamento para profissionais de beleza (Brasil).

## Fase 1 — Projeto, banco, schema, seed
- [x] Scaffold Next.js (App Router, TS, Tailwind)
- [x] Instalar dependências (Prisma, Zod, date-fns/date-fns-tz, Vitest)
- [x] Modelar schema.prisma completo
- [x] Migração inicial + client gerado
- [x] Seed rico (2 estabelecimentos, serviços, clientes, agendamentos) — 130 agendamentos, 0 conflitos

## Fase 2 — Motor de horários e testes
- [x] Função pura `calcularHorariosDisponiveis`
- [x] Testes Vitest: janela exata, serviço não cabe, colisão parcial início/fim, dia fechado, dia todo bloqueado, limite do almoço, virada de horário de verão (8/8 passando)
- [x] `npm run build` + testes passando

## Fase 3 — Autenticação e layout do painel
- [x] Hash de senha (scrypt) + sessão em cookie httpOnly
- [x] Login / logout (Server Actions) — testado no navegador
- [x] Layout do painel (sidebar desktop + bottom nav mobile, guarda de sessão, plano SOLO/EQUIPE)
- [x] `npm run build` + testes passando

## Fase 4 — Área pública de agendamento
- [x] `/[slug]` fluxo completo (serviço → profissional → dia → horário → dados → confirmação) — testado no navegador de ponta a ponta, incluindo criação real de agendamento
- [x] Geração de .ics
- [x] `/[slug]/agendamento/[token]` (ver/cancelar) — testado no navegador, cancelamento confirmado
- [x] `npm run build` + testes passando

## Fase 5 — Telas do painel
- [x] Hoje — testado no navegador
- [x] Agenda (semana para SOLO/profissional, grade dia×profissional para EQUIPE) — testado no navegador, incluindo criação manual de agendamento pela grade
- [x] Novo agendamento manual (modal) — testado no navegador
- [x] Serviços — testado no navegador
- [x] Horários — testado no navegador
- [x] Bloqueios — testado no navegador
- [x] Clientes + ficha — testado no navegador
- [x] Configurações — testado no navegador
- [x] `npm run build` + testes passando

## Fase 6 — Mensagens e fila
- [x] Interface `Notificador` + implementação console/db + implementação nula
- [x] Geração automática de confirmação + lembrete 24h
- [x] `/api/cron/mensagens`
- [x] Tela Mensagens + botão "Simular passagem do tempo" — testado no navegador, processa a fila corretamente

## Fase 7 — Relatório
- [x] Faturamento do mês x mês anterior
- [x] Serviço mais vendido, taxa de falta, horários mais procurados
- [x] Gráfico de faturamento por dia
- [x] Testado no navegador — números reais calculados a partir do seed

## Fase 8 — Acabamento visual
- [x] Direção visual própria a partir da logo real da Veylo (tokens CSS, tema claro/escuro)
- [x] Estados de carregamento, vazio, erro em todas as telas
- [x] Layout do painel corrigido para não rolar a sidebar inteira (h-dvh + scroll interno)
- [x] Responsividade mobile verificada (Hoje, Agenda, área pública) — sem overflow horizontal, bottom nav correta

## Fase 9 — Revisão final
- [x] Testes (8/8) e build de produção passando
- [x] Passagem crítica: login, painel (todas as telas), área pública completa, cancelamento,
      restrição de papel (profissional não acessa telas de dono nem por URL direta), grade da
      agenda sem sobreposição visual
- [x] README.md final
- [x] DECISOES.md revisado
- [x] Banco reseedado no final para remover dados de teste da própria verificação

## Fase 10 — Virar SaaS self-service (a pedido do usuário, pós-entrega inicial)
- [x] `/cadastro` — qualquer negócio cria a própria conta (estabelecimento + dono + 1ª
      profissional + horário padrão), já loga e manda pro painel
- [x] `/painel/profissionais` — cadastrar, ativar/desativar profissionais; opção de já criar
      login (e-mail + senha) pra elas entrarem sozinhas
- [x] Limite do plano Solo (1 profissional ativa) reforçado no servidor, com upgrade pra
      Equipe direto em Configurações
- [x] Landing page e login com CTA de cadastro
- [x] Testado no navegador de ponta a ponta: cadastro → painel → limite de plano → upgrade →
      2ª profissional → link público reagindo a zero serviços sem quebrar
- [x] `npm run build` + testes passando
- [ ] Deploy no Netlify (site `veylo-agenda-286`, conta separada): funciona pra navegação e
      leitura pública; login/painel não são confiáveis lá porque o banco é um arquivo SQLite
      por instância serverless — precisa de banco hospedado (Turso) pra ficar de verdade
      utilizável em produção. Ver `DECISOES.md` e o guia do produto publicado.
