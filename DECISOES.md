# Decisões técnicas — Veylo Agenda

Registro das decisões tomadas de forma autônoma durante a construção, sempre que a
especificação não determinava um caminho exato. Organizado por área.

## Cadastro self-service (virar SaaS de vários clientes)

- **Primeira profissional criada automaticamente no cadastro**: quem se cadastra vira ao
  mesmo tempo `Usuario` (papel Dono) e `Profissional` (o próprio nome), já com uma semana
  padrão de horário configurada. Sem isso, um negócio recém-criado cairia num beco sem saída
  — sem profissional, não dá pra cadastrar serviço nem aparecer nada no link público.
- **Limite do plano Solo é 1 profissional ativa, reforçado no servidor** (não só escondendo
  botão): tanto criar quanto reativar uma profissional checam a contagem atual contra o
  plano. É a única regra de "plano" que existe hoje — não tem cobrança nem trava por
  quantidade de agendamentos/mensagens, só essa, porque é a única que o modelo de dados já
  diferenciava (Solo = agenda de coluna única, Equipe = grade por profissional).
- **Trocar de plano é self-service e imediato** (um clique em Configurações), sem
  aprovação nem cobrança — faz sentido para o estágio atual (sem billing implementado);
  vai precisar de uma tela de confirmação/pagamento quando existir cobrança de verdade.
- **Proteção contra abuso no link público** (a pedido do usuário — evitar que alguém marque
  "de sacanagem" e não apareça): três regras, só pra `origem: LINK` (agendamento manual da
  equipe nunca é bloqueado por elas):
  - máximo de 3 agendamentos futuros em aberto por telefone, por estabelecimento;
  - intervalo mínimo de 1 minuto entre uma tentativa e a próxima do mesmo telefone;
  - telefone com 2 ou mais faltas (`FALTOU`) nesse estabelecimento cai como `PENDENTE` em vez
    de `CONFIRMADO` automaticamente — a mensagem muda de tom também ("recebemos seu pedido"
    em vez de "foi agendado"), pra não prometer uma confirmação que ainda depende da dona
    aprovar. Os números (3, 1 minuto, 2 faltas) são um ponto de partida razoável, não uma
    medição — dá pra ajustar depois vendo o uso real.
- **Slug validado contra uma lista de palavras reservadas** (`login`, `cadastro`, `painel`,
  `api`, etc.) além do `@unique` do banco — sem isso, um negócio poderia escolher um slug que
  colide com uma rota do próprio sistema.

## Ambiente

- **Git**: o repositório git já presente no ambiente (`git rev-parse --show-toplevel`) aponta
  para `C:\Users\paulo` — a pasta pessoal inteira do usuário estava sob controle de versão
  (bem provavelmente sem intenção: inclui `AppData`, `NTUSER.DAT`, etc). Para não misturar o
  histórico deste projeto com isso, foi iniciado um repositório git **próprio e isolado**
  dentro de `veyloprojeto/` (`git init` nesta pasta). Nenhum comando git foi executado fora
  dela, e nenhum commit foi feito — fica a critério do usuário.
- **Logo real da marca**: havia um `LOGO VEYLO.png` na pasta (gradiente verde-água → azul,
  fundo azul-marinho). Toda a direção visual da "casca" do produto (landing, login, favicon,
  navegação do painel) foi construída a partir dessas cores reais, em vez de uma paleta
  inventada — é o único ativo de marca real disponível.

## Stack e versões

- **Next.js 16.3.5**: instalado como "latest" no momento da construção; trouxe mudanças
  relevantes em relação a versões anteriores (Turbopack como padrão, `proxy.ts` no lugar de
  `middleware.ts`, `params`/`searchParams`/`cookies()` assíncronos de vez, tipos globais
  `PageProps<...>`/`LayoutProps<...>`/`RouteContext<...>` gerados por `next dev`/`next build`).
  O próprio `AGENTS.md` gerado pelo framework avisa para ler `node_modules/next/dist/docs/`
  antes de codar — foi o que orientou as escolhas de convenção deste projeto.
- **Prisma 7.10.0** (não a versão `latest` do pacote `prisma`, que resolveu para uma release
  candidate `8.0.0-rc.15` — fixei ambos os pacotes, `prisma` e `@prisma/client`, na última
  versão estável em que os dois coincidem). A partir da v7, `datasource.url` no
  `schema.prisma` não é mais suportado: a URL de conexão do CLI/migrate vive em
  `prisma.config.ts`, e o `PrismaClient` em runtime precisa de um **driver adapter**
  explícito. Para SQLite local, o adapter usado é `@prisma/adapter-better-sqlite3` (sobre o
  módulo nativo `better-sqlite3`) — mesma exigência de "SQLite em arquivo local, sem serviço
  externo", só que com uma API de configuração diferente da esperada.
- **Scripts de instalação bloqueados por padrão**: o npm deste ambiente tem um mecanismo de
  allowlist (`npm approve-scripts`) que bloqueia scripts de `postinstall`/`preinstall` de
  pacotes não aprovados. Foram aprovados explicitamente: `prisma`, `@prisma/engines`,
  `better-sqlite3` (compila um binário nativo), `unrs-resolver` e `esbuild` — todos
  necessários para o funcionamento básico (sem eles o binário do SQLite nunca seria
  compilado). Ficam registrados em `package.json#allowScripts`.
- **Zod 4**: usada só a API estável desde a v3 (`.min(n, "mensagem")` como string simples, em
  vez da forma `{ error: ... }` da v4), para não depender de detalhes de uma versão tão
  recente.

## Modelo de dados e regras de negócio

- **`estabelecimentoId` duplicado em tabelas filhas** (`Cliente`, `Agendamento`) mesmo quando
  seria derivável via `Profissional`/`Servico`: decisão deliberada para que toda checagem de
  isolamento por estabelecimento seja um filtro direto (`where: { estabelecimentoId }`), sem
  depender de um `join` implícito que seria fácil de esquecer numa rota nova.
- **Status inicial do agendamento**: tanto o link público quanto o agendamento manual criam o
  registro já como `CONFIRMADO` — não existe etapa de aprovação manual neste protótipo (a
  mensagem de confirmação enviada na hora já comunica isso). `PENDENTE` continua sendo um
  status válido no banco e a interface sabe lidar com ele (mostra um botão extra
  "Confirmar"), mas nenhum fluxo do sistema o produz sozinho — é o único status que só
  apareceria se alguém o definisse manualmente (ex. via seed ou uma integração futura).
- **Agendamento manual ignora a antecedência mínima**: a regra de "pelo menos 2h de
  antecedência" existe para proteger a profissional de reservas de última hora feitas por
  desconhecidos no link público. Quando é a própria equipe criando o agendamento pelo painel
  (encaixe, walk-in), essa trava não faz sentido — por isso `origem: "MANUAL"` chama o motor
  com `antecedenciaMinMin: 0`.
- **Canal de mensagem fixo em "SMS"**: o modelo de dados suporta `SMS` e `EMAIL`, mas todo
  texto gerado usa `SMS` — reflete o uso real (WhatsApp/SMS é como esses negócios avisam
  clientes; e-mail é raro nesse contexto).
- **Envio real via Twilio, SMS antes de WhatsApp**: o `Notificador` (`src/lib/mensagens/notificador.ts`)
  ganhou uma implementação de verdade (`NotificadorTwilio`) que só entra em ação quando
  `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_FROM_NUMBER` existem no ambiente — sem
  elas, cai automaticamente no `NotificadorConsole` de sempre (só ecoa no console), então
  nenhum ambiente existente quebra com essa mudança. Escolhido SMS em vez de WhatsApp porque
  WhatsApp de produção (não o modo sandbox de teste, que exige a destinatária mandar um
  código antes de poder receber qualquer coisa) depende de verificação de empresa pela Meta
  — um processo de dias, fora do controle do código. `Cliente.telefone` é só dígitos (DDD +
  número); o envio assume Brasil e monta o E.164 (`+55...`) na hora de chamar a Twilio.
- **Categorias de serviço (`CategoriaServico`) são opcionais e não destrutivas**: um
  estabelecimento sem nenhuma categoria cadastrada continua vendo a lista de serviços exatamente
  como antes (plana, sem seções) — tanto no painel quanto no link público. A ordem das categorias
  é manual (`ordem: Int`, reordenada por botões cima/baixo), não alfabética, porque o dono de um
  salão pensa em "primeiro os cortes, depois a barba", não em ordem de dicionário. Apagar uma
  categoria não apaga nem bloqueia os serviços dela (`onDelete: SetNull` em `Servico.categoriaId`)
  — eles só voltam a aparecer sob "Sem categoria"/"Outros", igual a um serviço que nunca foi
  categorizado.
- **WhatsApp via template, nunca texto livre**: diferente do SMS, toda mensagem de WhatsApp
  enviada por este sistema é iniciada pela empresa (o cliente nunca manda WhatsApp pra empresa
  primeiro — ele só agenda pelo link público), então cai sempre fora da janela de atendimento
  de 24h da Meta e precisa de um template pré-aprovado. Por isso `NotificadorTwilioWhatsApp`
  manda `ContentSid`+`ContentVariables` em vez de `Body`, e `Mensagem.variaveisTemplate`
  guarda (como JSON) os mesmos valores usados no texto em português — `variaveisMensagem()` em
  `textos.ts` é a única fonte desses valores, pra texto (SMS/console) e variáveis (WhatsApp)
  nunca ficarem dessincronizados. Existe template só para `CONFIRMACAO` e `LEMBRETE` (via
  `TWILIO_WHATSAPP_CONTENT_SID_*`) porque são os únicos tipos que `fila.ts` de fato produz
  hoje — `CONVITE_RETORNO` já existe no enum mas nenhum fluxo cria esse tipo de mensagem.
  `criarNotificadorPadrao()` prefere WhatsApp a SMS quando ambos estão configurados (mais
  barato e é o canal que a cliente já usa no dia a dia); falta de um template específico só
  derruba aquele envio (erro claro em `Mensagem.status = ERRO`), não o sistema inteiro.
  Templates de referência (a Meta não aceita template que comece ou termine com variável):
  - CONFIRMACAO (Utility, quick-reply com botões `Confirmar` id `CONFIRMAR` e `Cancelar` id
    `CANCELAR`): `Olá! Aqui é {{1}}. Seu horário de {{2}} está marcado para {{3}}.` /
    `Toque em Confirmar ou Cancelar logo abaixo.` / `Dúvidas? Fale direto com o salão: {{4}}
    — este número só envia avisos.`
  - LEMBRETE (Utility, mesmos botões): igual, com `Lembrete: seu horário de {{2}} é {{3}}.`
  - CONVITE_RETORNO (Marketing, sem botões): `Olá! Aqui é {{1}}. Já faz um tempo desde seu
    último {{2}} — que tal marcar um novo horário? Agende pelo link: {{3}}` / rodapé com {{4}}.
- **Um número da Veylo pra todos os salões, respostas tratadas pelo sistema**: o remetente é
  um número único (perfil "Veylo Agenda"); o nome do salão vai no texto. Como ninguém lê esse
  número, `src/app/api/whatsapp/entrada/route.ts` (webhook de entrada na Twilio, assinatura
  `X-Twilio-Signature` validada com `TWILIO_AUTH_TOKEN`) resolve tudo sozinho: toque em
  Confirmar marca `Agendamento.presencaConfirmadaEm` (sem mexer no status — PENDENTE continua
  esperando a dona); Cancelar cancela, libera o horário e marca `canceladoPelaClienteEm`;
  qualquer outro texto recebe resposta automática com o `wa.me` do salão. A resposta é ligada
  ao agendamento pelo `OriginalRepliedMessageSid` (= `Mensagem.sidProvedor`), com fallback
  pela última mensagem enviada pro telefone. A dona vê as respostas em "Hoje".
- **Teste grátis de 14 dias, só aviso — sem bloqueio nem cobrança automática**: `Estabelecimento.assinanteDesde`
  (nulo = ainda em teste) decide isso; `testeGratisExpirado()` em `src/lib/assinatura.ts` compara
  `criadoEm + 14 dias` contra agora. Quando expira, `PainelShell` mostra uma faixa de aviso no topo
  do painel — não trava nenhuma funcionalidade, porque não existe cobrança de verdade ainda (Mercado
  Pago/Stripe): a ideia é a dona ver o aviso e o Paulo entrar em contato manualmente pra combinar
  pagamento, não o sistema decidir sozinho cortar o acesso de alguém. Contas que já existiam antes
  desse recurso foram marcadas como assinantes retroativamente na própria migração (`UPDATE ...
  SET assinanteDesde = criadoEm WHERE assinanteDesde IS NULL`) — só cadastro feito depois disso entra
  de fato no relógio do teste. Preço de referência pesquisado no mercado (Trinks R$76-110/mês, Booksy
  R$99,90+/mês) — o Veylo ainda não tem preço público definido, isso é decisão do Paulo, não do código.
- **Confirmação automática é opcional, lembrete de 24h não é**: `Estabelecimento.confirmacaoAutomatica`
  (padrão `true`, pra não mudar nada de quem já usa) liga/desliga só a mensagem imediata de
  confirmação — o lembrete do dia anterior é sempre criado, porque foi só a confirmação que a
  dona pediu pra poder desligar.
- **Lembrete de retorno (`CONVITE_RETORNO`) não é ligado a nenhum agendamento**: por isso
  `Mensagem.agendamentoId` virou opcional e ganhou `Mensagem.clienteId` (também opcional) —
  uma mensagem sempre tem um dos dois, nunca os dois nem nenhum. Mesmo assim o texto é fixo
  (`textoConviteRetorno`, só variando o nome do serviço), não texto livre: WhatsApp de negócio
  não permite mandar qualquer coisa, só templates aprovados — deixar a dona digitar uma
  mensagem qualquer ia funcionar no SMS mas quebrar silenciosamente no WhatsApp assim que
  configurado. O serviço sugerido no formulário é o último atendimento de fato concluído
  do cliente (`atendidos[0]`), pra cobrir o caso comum (lembrar da mesma manutenção) sem
  obrigar a dona a escolher toda vez.
- **Bloqueio.motivo é texto livre**, não um enum — a especificação cita "folga, almoço,
  compromisso" como exemplos, não como lista fechada; o formulário sugere esses valores via
  `<datalist>`, mas aceita qualquer texto.
- **Relógio simulado**: para o botão "Simular passagem do tempo" funcionar de forma repetível
  numa demonstração (sem esperar 24h de verdade, e sem precisar mexer no relógio do sistema
  operacional), foi criada uma tabela de uma linha só, `RelogioSimulado`, guardando um
  deslocamento em minutos. Cada clique soma ~25h a esse deslocamento e processa a fila usando
  "agora real + deslocamento" como referência — não é algo pedido explicitamente na
  especificação, mas é a peça mínima necessária para o botão pedido ter efeito visível.

## Colocando em produção de verdade (confiabilidade e conformidade)

- **A home pública listava TODOS os estabelecimentos** (`db.estabelecimento.findMany()` sem
  filtro nenhum, rotulado "páginas públicas de demonstração"). Fazia sentido enquanto só
  existiam contas de teste, mas significava que a primeira cliente real (Hulyanne Nunes)
  apareceria publicamente pra qualquer visitante da home assim que se cadastrasse. Removido —
  a home agora não consulta o banco (virou rota estática). Quem precisar mostrar um exemplo
  pra um cliente em potencial pode simplesmente compartilhar o link direto do estabelecimento.
- **Lembretes de agendamento não estavam saindo em produção**: `/api/cron/mensagens` (que
  processa a fila e de fato envia SMS/WhatsApp) nunca era chamado por nada — não existia
  agendamento configurado no `netlify.toml` nem função nenhuma. Só a confirmação imediata
  funcionava (é chamada direto no fluxo de criar agendamento, sem passar pela fila). Corrigido
  com `netlify/functions/cron-mensagens.mts`, uma Netlify Scheduled Function (`schedule:
  "*/15 * * * *"`, disponível em qualquer plano) que chama `processarFilaMensagens()`
  diretamente — sem depender da rota HTTP, então não precisa de rede nem de autenticação pra
  funcionar.
- **`/api/cron/mensagens` passou a exigir `CRON_SECRET`** (header `Authorization: Bearer
  ...`), sempre — sem a variável configurada, a rota fica sempre bloqueada (nunca "aberta por
  padrão"). Antes ficava pública de propósito ("ajustar antes de produção" já estava anotado
  no próprio código) — fazia pouca diferença enquanto só ecoava no console, mas agora que
  processa envios reais (com custo) não faz sentido deixar exposta. A função agendada não
  depende dessa rota (chama a lógica direto), então a rota HTTP hoje só serve pra
  disparo manual/depuração.
- **Backup diário via Netlify Blobs, não um serviço de banco pago**: o plano gratuito da
  Netlify DB (Neon) só oferece um snapshot manual, sem backup automático/point-in-time
  recovery (isso começa no plano Solo). Em vez de forçar upgrade de plano,
  `netlify/functions/backup-diario.mts` roda 1x/dia, exporta todas as tabelas de negócio via
  Prisma pra um JSON e guarda no Netlify Blobs (incluso em qualquer plano), mantendo os
  últimos 30 dias. `Sessao` fica de fora de propósito — são tokens de login, regeneram
  sozinhos, não vale guardar por 30 dias. Não existe um "botão restaurar" de propósito (seria
  perigoso demais como self-service) — restaurar é sempre manual, puxando o JSON do dia via
  `getStore("backups-diarios").get(chave, { type: "json" })` e recriando as linhas.
- **Sentry para captura de erro, sem Session Replay**: `@sentry/nextjs` foi adicionado só pra
  alertar por e-mail quando algo quebra em produção (`instrumentation.ts` captura erro de
  servidor/rota, `error.tsx` captura erro de render no cliente). Session Replay (gravação de
  tela) foi deixado de fora de propósito — ligaria sem estar coberto pela Política de
  Privacidade, e não é o que foi pedido. **Achado consertando isso**: com Next.js 16.3.5 +
  Turbopack, `instrumentation.ts` importando `@sentry/nextjs` quebra o build
  (`Module not found: @vercel/turbopack-next/internal/font/google/font`, nas fontes do
  Google) a menos que `next.config.ts` use `withSentryConfig` (de `@sentry/nextjs/config`) —
  não é só para upload de sourcemap como a documentação sugere, é necessário pro build
  simplesmente compilar. Sem `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` configurado, vira no-op
  seguro (mesmo padrão do Twilio).
- **Política de Privacidade (`/privacidade`) escrita à mão, não gerada por um gerador
  automático de termo**: cobre LGPD nos pontos que realmente importam aqui (dado de cliente
  final é só nome+telefone; Twilio e Netlify como operadores; isolamento entre
  estabelecimentos; direitos de acesso/correção/exclusão). O e-mail de contato
  (`contato@veyloagenda.com.br`) é um placeholder — ainda não existe essa caixa de entrada.
- **E-mail transacional via Resend, mesmo padrão do Twilio** (`src/lib/email/notificadorEmail.ts`):
  sem `RESEND_API_KEY`/`EMAIL_REMETENTE` configurados, cai num console-logger, então nenhum
  ambiente quebra por não ter isso configurado ainda. Confirmação de conta e redefinição de
  senha usam um único modelo `TokenVerificacao` (com `tipo`) em vez de duas tabelas quase
  idênticas — a diferença real entre os dois é só o prazo de validade (7 dias pra confirmar
  e-mail, contra 1 hora pra redefinir senha, porque redefinir senha é uma ação bem mais
  sensível). O token em si é o próprio `id` (cuid) da linha, sem hash — mesmo padrão já usado
  em `Sessao.id` neste projeto; token de uso único com validade curta já limita bastante o
  risco de vazamento. **Confirmar e-mail nunca trava o uso do sistema** — é só um selo, dona
  usa a conta inteira mesmo sem confirmar; isso é consistente com o resto do produto (teste
  grátis também só avisa, nunca bloqueia). **Redefinir senha derruba todas as sessões abertas**
  daquele usuário (`Sessao.deleteMany`), pra se a senha vazou, qualquer acesso antigo caia
  junto. Pedido de redefinição sempre responde a mesma mensagem genérica, exista ou não o
  e-mail — evita que alguém descubra quais e-mails têm conta só tentando redefinir senha deles.

- **Banco de produção sai do Netlify Database para o Neon (30/09/2026)**: os 1.000 créditos
  do plano Personal da Netlify acabaram em 6 dias e o site foi pausado. O Netlify Database
  cobra 10 créditos por hora acordado, com mínimo de 1 unidade de computação, e só dorme
  depois de 5 minutos parado: a fila de mensagens a cada 15 minutos o mantinha acordado ~8h
  por dia (~80 créditos/dia). Somavam-se 15 créditos por deploy de produção (23 no período).
  Correções: fila 3 vezes por dia (08h, 12h e 18h de Brasília) com o backup junto às 08h;
  deploys em lote (no máximo 1 por dia, salvo correção urgente); e o banco no Neon direto
  (mesmo Postgres, mínimo de 0,25 unidade, grátis até 100 unidades-hora por mês), na região
  AWS us-east-1, a mesma das funções da Netlify. `db.ts` usa `POSTGRES_URL` (Neon) e, sem ela,
  `NETLIFY_DB_URL`. As migrações foram de `netlify/database/migrations` para
  `prisma/migracoes-producao` e o pacote `@netlify/database` saiu, para a Netlify não recriar
  o próprio banco; quem aplica as migrações é `scripts/aplicar-migracoes.mjs` no build (tabela
  de controle `_veylo_migracoes`). A cópia inicial dos dados é `npm run db:copiar-para-neon`,
  com os endereços em `.env.migracao` (fora do git; o script nunca imprime os endereços) ou
  com `--backup <arquivo>`, a partir do backup diário: foi esse o caminho usado em 30/09/2026,
  porque o Netlify Database não expõe o endereço de produção de forma simples. Testada de
  ponta a ponta com dois Postgres em memória via PGlite. Depois da troca, o Netlify Database
  deve ser removido para não gerar cobrança. Estudo de custos (Netlify, Neon, Vercel, Railway,
  VPS, Cloudflare)
  feito à parte: a decisão é ficar na Netlify + Neon até uns 30 a 40 salões e reavaliar.

## Motor de horários

- **Passos de 15 min contados a partir do início de cada janela livre** (não do início do
  expediente) — é a leitura mais literal do texto da especificação ("gerar as janelas
  restantes em passos de 15 minutos") e também a mais simples de testar.
- **Sobreposição tratada com intervalos semiabertos** (`[início, fim)`): dois eventos que só
  se tocam num instante (um termina exatamente quando o outro começa) não contam como
  conflito. É o que permite um agendamento terminar exatamente no início do almoço, ou um
  horário começar exatamente onde o bloqueio anterior termina.
- **Teste de horário de verão**: Pernambuco/Recife não observa DST desde a década de 1990, e
  o Brasil aboliu o horário de verão de vez em 2019 — não existe uma data real recente em que
  Recife especificamente mude de offset. O teste em vez disso usa a data em que o *resto* do
  país (que ainda tinha DST) voltou ao horário padrão (17/02/2019), e verifica que o offset de
  Recife continua -03:00 antes e depois — provando que o motor usa a regra real do fuso
  informado (via `date-fns-tz`/Intl), não um deslocamento genérico "horário brasileiro".

## Área pública e painel

- **Agenda em duas visões**: o texto pede "visão de semana" e também "uma coluna por
  profissional" no plano Equipe — as duas coisas não cabem juntas numa grade 2D sem virar
  ilegível. Solução: quando há mais de um profissional visível para o usuário logado (Equipe
  + Dono), a Agenda mostra **um dia** com uma coluna por profissional, navegando dia a dia;
  quando só há um profissional relevante (plano Solo, ou um login de Profissional vendo só a
  própria agenda), mostra a **semana inteira** com uma coluna por dia. Cobre os dois
  requisitos sem sobrepô-los.
- **Sem foto real de estabelecimento/profissional**: os campos existem no schema, mas como o
  app precisa rodar 100% offline (sem upload/armazenamento de arquivo), o cabeçalho público e
  os avatares usam iniciais coloridas geradas a partir do nome, mais um gradiente com a cor
  de destaque do estabelecimento no cabeçalho público.
- **Cor de marca em duas camadas**: a Veylo (landing `/`, login, navegação interna do painel)
  usa sempre o gradiente verde-água → azul da marca; a área pública (`/[slug]`) e o restante
  do painel usam a `corDestaque` de cada estabelecimento como cor de ação primária — como um
  produto real de agendamento, a página que a cliente final vê deve refletir a marca do
  negócio dela, não a da Veylo.
- **Perguntas mínimas no agendamento manual**: a especificação pede "no máximo três
  interações" — o modal recebe profissional/data/hora já preenchidos quando aberto a partir
  de um clique num espaço vazio da grade, sobrando só cliente e serviço para escolher; aberto
  pelo botão genérico "Novo", pede também profissional, data e hora.
- **Guia "Comece por aqui" (01/10/2026)**: quadro no topo da tela Hoje, só para a dona, com 7
  passos até o primeiro agendamento pelo link (marca, WhatsApp, serviços, horários, equipe,
  agendamento de teste, link na bio). Um checklist em vez de um tour com balões porque a
  configuração acontece em várias telas e em vários dias, e cada passo leva direto à tela
  certa. O que dá para saber pelo banco se completa sozinho (logo enviada, primeiro serviço,
  segunda profissional, agendamento com origem LINK); o resto tem botão para marcar ("Está
  certo", "Só eu atendo"...), e salvar Horários ou trocar o telefone também marca o passo.
  Os passos marcados ficam num texto (`guiaPassos`, ids separados por vírgula) e não numa
  tabela, porque são poucos, só a própria conta lê e o mesmo formato serve no SQLite e no
  Postgres. A definição dos passos (`src/lib/guia/passos.ts`) não acessa o banco, para o
  componente do navegador usar os mesmos textos. Na migração, contas que já tinham
  agendamento pelo link começam com o guia escondido (já passaram da configuração inicial);
  qualquer conta pode esconder o guia e mostrar de novo em Configurações.
- **Admin interno em /admin (01/10/2026)**: no mesmo site e no mesmo banco, sem custo extra e
  sem link em nenhuma página (e `noindex`). Entra só quem está em `ADMIN_EMAILS` (variável da
  Netlify, fora do git), por um link de uso único enviado ao e-mail (vale 15 minutos) em vez de
  senha: não há senha para vazar ou esquecer, e o Resend já estava funcionando. A página do link
  só mostra um botão "Entrar", porque leitores de e-mail que abrem links sozinhos gastariam o
  acesso. A sessão do admin fica num cookie próprio (`veylo_admin`, restrito a `/admin`) e numa
  tabela separada da dos salões; a lista de e-mails é conferida a cada acesso, então tirar alguém
  da variável corta o acesso na hora. Tokens de 32 bytes aleatórios (`crypto.randomBytes`).
  `parceira` (piloto sem cobrança) é separado de `assinanteDesde` (já paga) porque a receita do
  admin só conta assinantes; `testeAte` guarda o teste estendido sem mexer em `criadoEm`. O funil
  (`Lead`) fica no banco e não num Trello porque, quando o salão cria a conta com o mesmo
  telefone (comparado pelo DDD + 8 últimos dígitos) ou e-mail, o cadastro já liga o contato e o
  passa para "Em teste"; marcar o salão como parceira ou assinante o leva para "Fechado". LGPD: o
  admin mostra os dados da dona e números de uso, nunca dados das clientes dos salões. O funil
  entra no backup diário.
- **Financeiro e contas de teste no admin (01/10/2026)**: os custos ficam numa tabela (`Custo`)
  editável pela tela, e não fixos no código, porque mudam (plano, cotação, ferramenta nova) e
  quem atualiza é a equipe. Cada custo tem moeda (real ou dólar) e cobrança (por mês, por ano ou
  por mensagem de WhatsApp); o custo por mensagem multiplica as mensagens enviadas nos últimos
  30 dias por todas as contas, inclusive as de teste, porque a Twilio cobra todas. O dólar vem da
  AwesomeAPI (gratuita, sem chave), guardado em memória por 6 horas, com um valor de reserva se a
  busca falhar. A migração já cria os custos que a equipe informou (Claude, Netlify, domínio,
  WhatsApp, Neon e Resend). Receita = assinantes × preço do plano; parceiras não entram.
  Conta de teste (`contaDeTeste`) fica separada no admin e fora de todos os números; o admin
  aponta as que parecem teste pelo nome, endereço ou e-mail. Excluir de vez só vale para conta
  marcada como teste e pede o nome digitado; apaga primeiro os agendamentos (eles travam a
  exclusão de clientes, equipe e serviços) e depois o salão, que leva o resto pelas regras do
  banco. O backup diário guarda os últimos 30 dias.
- **Motivo das falhas de envio e fim do relógio simulado (01/10/2026)**: a primeira mensagem
  real pelo WhatsApp (salão da Hulyanne) ficou com "Erro" e o sistema não guardava o motivo que
  a Twilio devolve. Agora o código e a mensagem da Twilio ficam em `Mensagem.erro`, vão para o
  log do servidor e aparecem explicados no admin; a dona vê uma versão sem detalhe técnico e o
  botão "Tentar de novo" (só para horário futuro e não cancelado). Na mesma tela havia o botão
  "Simular passagem do tempo", da demonstração da primeira versão: ele adiantava um relógio
  único, de todos os salões, e um clique em produção faria os lembretes de todo mundo saírem um
  dia antes. Foi removido; a tabela `RelogioSimulado` ficou sem uso (sai numa limpeza futura).
