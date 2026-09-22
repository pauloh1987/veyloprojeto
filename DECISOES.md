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
  clientes; e-mail é raro nesse contexto) e simplifica a demonstração, já que nenhum envio é
  de fato disparado.
- **Bloqueio.motivo é texto livre**, não um enum — a especificação cita "folga, almoço,
  compromisso" como exemplos, não como lista fechada; o formulário sugere esses valores via
  `<datalist>`, mas aceita qualquer texto.
- **Relógio simulado**: para o botão "Simular passagem do tempo" funcionar de forma repetível
  numa demonstração (sem esperar 24h de verdade, e sem precisar mexer no relógio do sistema
  operacional), foi criada uma tabela de uma linha só, `RelogioSimulado`, guardando um
  deslocamento em minutos. Cada clique soma ~25h a esse deslocamento e processa a fila usando
  "agora real + deslocamento" como referência — não é algo pedido explicitamente na
  especificação, mas é a peça mínima necessária para o botão pedido ter efeito visível.

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
