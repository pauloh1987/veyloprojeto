# Veylo Agenda

Protótipo funcional de um SaaS de agendamento para manicures, barbeiros e profissionais de
beleza no Brasil. Área pública para a cliente marcar um horário sozinha (o link que a
profissional divulga no Instagram) e um painel para a profissional tocar o dia a dia:
agenda, clientes, serviços, horários, bloqueios, mensagens e relatório.

Feito para rodar 100% local e offline — sem Docker, sem chave de API, sem serviço externo.

## Como rodar

Pré-requisito: Node.js 20.9+ (testado com Node 24).

```bash
npm install
npm run db:migrate    # cria/atualiza o banco SQLite local (prisma/dev.db)
npm run db:seed       # popula com dados de exemplo
npm run dev           # http://localhost:3000
```

Se preferir, `npm run db:reset` apaga o banco, reaplica as migrações e roda o seed de novo —
útil para voltar a um estado limpo depois de mexer bastante nos dados pelo painel.

Rodar os testes do motor de agendamento:

```bash
npm test
```

Build de produção (usa Turbopack, o padrão do Next 16):

```bash
npm run build
npm start
```

## Login de demonstração

| Estabelecimento | Papel | E-mail | Senha |
| --- | --- | --- | --- |
| Studio Ana Nails (plano Solo) | Dona | `ana@studio.com` | `123456` |
| Barbearia Norte (plano Equipe) | Dono | `carlos@barbearianorte.com` | `123456` |
| Barbearia Norte (plano Equipe) | Profissional | `joao@barbearianorte.com` | `123456` |

O login de profissional (João) serve para mostrar a visão restrita: ele só vê a própria
agenda e não tem acesso a Relatório, Serviços, Horários (de outros) nem Configurações — nem
mesmo digitando a URL direto, a checagem é no servidor.

Links públicos de agendamento (não precisam de login):

- `http://localhost:3000/studio-ana-nails`
- `http://localhost:3000/barbearia-norte`

A tela inicial (`/`) lista esses dois links para facilitar uma demonstração.

## Como está organizado

```
prisma/
  schema.prisma       modelo de dados completo
  migrations/
  seed.ts             gera os dois estabelecimentos, serviços, clientes e ~130 agendamentos
src/
  app/
    page.tsx           landing da Veylo (marca própria, não a do estabelecimento)
    login/              login por e-mail/senha
    [slug]/              área pública de agendamento (uma por estabelecimento, via slug)
      agendamento/[token]/  a cliente vê e cancela o próprio agendamento
    painel/              área logada (layout com guarda de sessão + navegação)
      hoje/ agenda/ servicos/ horarios/ bloqueios/ clientes/ mensagens/ relatorio/ configuracoes/
    api/
      cron/mensagens/          processa a fila de mensagens pendentes
      public/[slug]/           disponibilidade, horários do dia e criação de agendamento (usadas pela área pública)
  components/
    ui/                 primitivos (botão, campo, modal, badge, avatar, estados vazio/carregando)
    painel/              grade da agenda, badge de status, botões de ação
  lib/
    agenda/
      disponibilidade.ts        motor de cálculo de horários — função pura, sem banco
      disponibilidade.test.ts   os testes pedidos (janela exata, colisões, almoço, DST etc.)
      consultarDisponibilidade.ts  busca no banco o que o motor precisa e chama a função pura
      criarAgendamento.ts       cria um agendamento revalidando disponibilidade dentro de uma transação
    mensagens/
      notificador.ts     interface `Notificador` + implementação console e implementação nula
      fila.ts            gera confirmação/lembrete, processa a fila, relógio simulado
    acoes/               Server Actions (uma por área: auth, agendamentos, clientes, ...)
    auth.ts              sessão em cookie httpOnly, hash de senha com scrypt (Node nativo)
    validacao.ts          todos os schemas Zod
    tz.ts                helpers de data/fuso (America/Recife) sem depender do fuso da máquina
```

## O motor de horários

`src/lib/agenda/disponibilidade.ts` exporta `calcularHorariosDisponiveis`, uma função pura
(sem `Prisma`, sem `Date.now()` interno — tudo é parâmetro) que:

1. parte do horário de funcionamento do dia da semana;
2. remove o intervalo de almoço;
3. remove bloqueios e agendamentos existentes que colidem (feitos os recortes nas bordas);
4. gera candidatos em passos de 15 min a partir do início de cada janela livre, só oferecendo
   um horário quando o serviço inteiro cabe;
5. descarta horários no passado ou abaixo da antecedência mínima configurável;
6. converte horário local ⇄ instante UTC usando o fuso real (`date-fns-tz`), então funciona
   corretamente independente do fuso da máquina que roda o processo.

Os oito testes em `disponibilidade.test.ts` cobrem exatamente os casos pedidos, incluindo um
teste de virada de horário de verão: Recife não observa horário de verão desde a década de
1990, então o teste garante que o motor mantém o offset -03:00 estável numa data em que o
resto do Brasil (que ainda tinha DST) mudou de horário — prova de que a conversão usa a regra
real do fuso, não um deslocamento genérico "hora brasileira".

`consultarDisponibilidade.ts` e `criarAgendamento.ts` são a única ponte entre esse motor e o
banco: a criação de agendamento (tanto pelo link público quanto pelo painel) recalcula a
disponibilidade **dentro de uma transação**, então é impossível criar um horário sobreposto
mesmo chamando a rota da API diretamente, sem passar pela interface.

## Mensagens sem provedor externo

`Notificador` é uma interface pequena (`enviar(mensagem)`); a implementação padrão
(`NotificadorConsole`) só grava no banco e ecoa no console — dá para trocar por um provedor
real de SMS/WhatsApp depois sem tocar no resto do código. Ao criar um agendamento, o sistema
gera a mensagem de confirmação (enviada na hora) e o lembrete (agendado para 24h antes).

Como não dá pra esperar 24h de verdade numa demonstração, a tela **Mensagens** tem um botão
"Simular passagem do tempo": cada clique avança um relógio simulado (guardado no banco) em
~25h e processa a fila com esse relógio, mostrando lembretes sendo "enviados" na hora. A rota
`/api/cron/mensagens` processa a mesma fila usando o horário real — é o que um cron job de
verdade chamaria em produção.

## Isolamento e segurança

- Toda rota do painel exige sessão válida (`exigirSessao`/`exigirDono`, checados no servidor,
  não só escondidos na navegação).
- Toda consulta é filtrada por `estabelecimentoId` derivado da sessão (painel) ou do slug da
  URL (área pública) — nunca de um id que o cliente manda.
- Senha com hash `scrypt` (módulo nativo do Node, sem dependência extra) + sal por usuário.
- Sessão é um token opaco em cookie `httpOnly`, `sameSite=lax`, guardado numa tabela própria
  (pode ser revogada apagando a linha).
- Erros conhecidos (`ErroDeAplicacao` e subclasses) viram mensagem amigável; qualquer outro
  erro vira uma mensagem genérica — nunca stack trace pro usuário.

## Decisões tomadas de forma autônoma

Ver [`DECISOES.md`](./DECISOES.md) para o registro completo das escolhas feitas quando a
especificação não determinava um caminho exato (por que Prisma 7 precisou de um driver
adapter, como o plano Equipe decide entre visão de semana e visão por profissional, etc.).

## O que ficou de fora

- **Canal de mensagem único**: todo lembrete/confirmação sai como "SMS" — o campo `canal`
  existe no banco e a interface `Notificador` já suporta e-mail, mas não há um segundo canal
  de verdade implementado (não fazia diferença nenhuma tela, já que nada é enviado de fato).
- **Sem upload de foto**: `Estabelecimento.foto` e `Profissional.foto` existem no schema mas
  o painel não tem uma tela de upload — o app usa iniciais coloridas e o gradiente da cor de
  destaque no lugar de uma foto real, pra funcionar 100% offline sem precisar de storage.
- **Sem `next/image` para os avatares/logo do painel**: por serem pequenos e locais, alguns
  usam `<img>` simples; não afeta performance real neste protótipo.
- **Convite de retorno**: o tipo de mensagem `CONVITE_RETORNO` existe no schema e tem um texto
  pronto (`textoConviteRetorno`), mas não há um gatilho automático (ex. "não vem há 60 dias")
  disparando isso — ficaria fácil de adicionar num cron futuro.
- **Sem paginação**: listas (clientes, mensagens) carregam tudo de uma vez; para os volumes de
  um protótipo/negócio pequeno isso não é um problema, mas não escalaria para milhares de
  linhas sem ajuste.
- **Sem testes automatizados de UI**: os fluxos foram verificados manualmente no navegador
  (login, agendamento público completo, cancelamento, agendamento manual, simulação de
  mensagens, restrição de papel); os testes automatizados (Vitest) cobrem o motor de
  horários, que é a peça com a lógica mais arriscada de errar silenciosamente.
