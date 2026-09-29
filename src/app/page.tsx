import Image from "next/image";
import Link from "next/link";
import {
  Link2,
  Bell,
  Users,
  Tags,
  Palette,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  ArrowRight,
  XCircle,
  Repeat,
  ChevronDown,
  Check,
  Minus,
  Clock,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/** Preço único — toda conta tem todos os recursos, com profissionais ilimitadas. Mudou de
 * Solo R$ 69 / Equipe R$ 129 para plano único em 29/09/2026. */
const PRECO_MENSAL = "89";

export default function PaginaInicial() {
  return (
    <main className="bg-bg text-text">
      <Cabecalho />
      <Hero />
      <ParaQuemE />
      <Recursos />
      <Preco />
      <TudoIncluso />
      <Comparacao />
      <ComoComecar />
      <Segmentos />
      <Faq />
      <CtaFinal />
      <Rodape />
    </main>
  );
}

function Cabecalho() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-veylo-navy-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <Image src="/veylo-logo.png" alt="" width={26} height={30} priority />
          <span className="font-heading text-sm font-extrabold text-white">
            Veylo <span className="veylo-gradient-text">Agenda</span>
          </span>
        </div>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Seções">
          <a href="#recursos" className="rounded-xl px-3 py-2 text-sm font-semibold text-white/70 hover:text-white">
            Recursos
          </a>
          <a href="#preco" className="rounded-xl px-3 py-2 text-sm font-semibold text-white/70 hover:text-white">
            Preço
          </a>
          <a href="#duvidas" className="rounded-xl px-3 py-2 text-sm font-semibold text-white/70 hover:text-white">
            Dúvidas
          </a>
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href="/login"
            className="rounded-xl px-3 py-2 text-sm font-semibold text-white/80 transition-colors hover:text-white sm:px-4"
          >
            Entrar
          </Link>
          <LinkButton href="/cadastro" size="sm" className="rounded-full px-4">
            Começar grátis
          </LinkButton>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="veylo-hero-bg veylo-dot-grid-escuro overflow-hidden px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div className="text-center lg:text-left">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-veylo-teal">
            <Sparkles size={13} className="shrink-0" /> Para salões, barbearias, esmalterias, estética e todo serviço com horário marcado
          </p>
          <h1 className="mt-5 font-heading text-4xl font-extrabold leading-[1.05] text-white sm:text-6xl">
            Sua cliente <span className="veylo-gradient-text">agenda sozinha</span>. Você organiza o resto.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-white/70 sm:text-lg lg:mx-0">
            Um link de agendamento pro seu Instagram, WhatsApp ou bio — a cliente escolhe o horário livre e recebe
            confirmação na hora, sem trocar mensagem pra combinar.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start sm:justify-center">
            <LinkButton
              href="/cadastro"
              size="lg"
              className="rounded-full px-8 shadow-[0_0_50px_-10px_var(--veylo-blue)]"
            >
              Começar 14 dias grátis <ArrowRight size={18} />
            </LinkButton>
            <a
              href="#recursos"
              className="flex h-14 items-center justify-center gap-1.5 rounded-full px-6 text-base font-semibold text-white/80 hover:text-white"
            >
              Ver como funciona
            </a>
          </div>
          <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-white/55 lg:justify-start">
            <li className="flex items-center gap-1.5">
              <Check size={15} className="text-veylo-teal" /> Sem cartão de crédito
            </li>
            <li className="flex items-center gap-1.5">
              <Check size={15} className="text-veylo-teal" /> Profissionais ilimitadas
            </li>
            <li className="flex items-center gap-1.5">
              <Check size={15} className="text-veylo-teal" /> Sem fidelidade
            </li>
          </ul>
        </div>
        <HeroMockup />
      </div>
    </section>
  );
}

/** Composição do hero: o link público (o que a cliente vê) e, por cima, a mensagem que chega
 * no WhatsApp dela. Tudo desenhado com a interface real do produto e dados de exemplo — não é
 * foto nem captura de um cliente real. */
function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-sm pb-10 lg:max-w-md">
      <Celular>
        <TelaLinkPublico />
      </Celular>
      <div className="absolute -right-2 bottom-0 w-64 rounded-2xl border border-white/10 bg-veylo-navy-800/95 p-3.5 text-left shadow-2xl backdrop-blur sm:-right-8 sm:w-72">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#25D366] text-white">
            <MessageCircle size={15} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white">WhatsApp · agora</p>
            <p className="truncate text-[11px] text-white/60">Studio Bela Unha</p>
          </div>
        </div>
        <p className="mt-2 text-[13px] leading-snug text-white/85">
          Seu horário de <b>Gel na tips</b> está marcado para <b>sábado, 10 de outubro às 14:30</b>.
        </p>
        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
          <span className="rounded-lg bg-white/10 py-1.5 text-center text-xs font-semibold text-veylo-teal">Confirmar</span>
          <span className="rounded-lg bg-white/10 py-1.5 text-center text-xs font-semibold text-white/70">Cancelar</span>
        </div>
      </div>
    </div>
  );
}

function Celular({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[290px] rounded-[2.4rem] border border-white/15 bg-veylo-navy-900 p-2.5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]",
        className,
      )}
    >
      <div className="overflow-hidden rounded-[1.9rem] bg-white text-[#10151f]">{children}</div>
    </div>
  );
}

/** Link público de exemplo. Cores fixas (não seguem o tema do site) porque representa a
 * página da esmalteria, que tem a identidade dela. */
function TelaLinkPublico() {
  const servicos = [
    { nome: "Gel na tips", info: "2h · R$ 150,00", cor: "#e2557a" },
    { nome: "Manutenção do gel", info: "1h30 · R$ 110,00", cor: "#e2557a" },
    { nome: "Esmaltação em gel", info: "1h · R$ 60,00", cor: "#9b6ad6" },
  ];
  return (
    <div className="pb-4">
      <div className="bg-[#fbe9ef] px-4 pb-4 pt-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e2557a] font-heading text-lg font-extrabold text-white">
          B
        </span>
        <p className="mt-2 font-heading text-sm font-extrabold">Studio Bela Unha</p>
        <p className="text-[11px] text-[#545d6e]">Escolha o serviço</p>
      </div>
      <div className="space-y-2 px-3.5 pt-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#8891a0]">Aplicação</p>
        {servicos.map((s) => (
          <div key={s.nome} className="flex items-center gap-2.5 rounded-xl border border-[#e2e6ee] p-2.5">
            <span className="h-8 w-8 shrink-0 rounded-lg" style={{ background: s.cor, opacity: 0.85 }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{s.nome}</p>
              <p className="text-[11px] text-[#545d6e]">{s.info}</p>
            </div>
          </div>
        ))}
        <p className="pt-1 text-[10px] font-bold uppercase tracking-wide text-[#8891a0]">Sábado, 10 de outubro</p>
        <div className="grid grid-cols-3 gap-1.5">
          {["09:30", "11:00", "13:00", "14:30", "16:00", "17:30"].map((h) => (
            <span
              key={h}
              className={cn(
                "rounded-lg border py-1.5 text-center text-xs font-semibold tabular-nums",
                h === "14:30" ? "border-[#e2557a] bg-[#e2557a] text-white" : "border-[#e2e6ee] text-[#10151f]",
              )}
            >
              {h}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ParaQuemE() {
  const publicos = ["Esmalterias", "Salões de beleza", "Barbearias", "Sobrancelhas e cílios", "Estética", "Autônomas"];
  return (
    <section className="border-b border-border bg-surface px-4 py-7 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-7 gap-y-2.5">
        <p className="text-xs font-bold uppercase tracking-wide text-text-faint">Feito para</p>
        {publicos.map((p) => (
          <span key={p} className="text-sm font-semibold text-text-muted">
            {p}
          </span>
        ))}
      </div>
    </section>
  );
}

function Selo({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-text-muted">
      {children}
    </span>
  );
}

interface RecursoDestaque {
  selo: string;
  titulo: string;
  texto: string;
  pontos: string[];
  visual: React.ReactNode;
}

const RECURSOS: RecursoDestaque[] = [
  {
    selo: "Link de agendamento",
    titulo: "Agenda cheia, sem troca de mensagem",
    texto:
      "Coloque seu link na bio do Instagram e no status do WhatsApp. A cliente escolhe o serviço, a profissional e um horário livre, a qualquer hora, sem baixar aplicativo.",
    pontos: [
      "Só aparecem os horários realmente livres de cada profissional",
      "Horário corrido ou horários fixos (11h, 13h, 14h30…)",
      "Sua logo, suas cores e fotos dos seus trabalhos",
    ],
    visual: (
      <Celular>
        <TelaLinkPublico />
      </Celular>
    ),
  },
  {
    selo: "WhatsApp automático",
    titulo: "A cliente confirma com um toque",
    texto:
      "Assim que ela marca, chega a confirmação no WhatsApp. Um dia antes, o lembrete. Os dois com botões de Confirmar e Cancelar, e o sistema atualiza sua agenda sozinho.",
    pontos: [
      "Cancelou? O horário volta a ficar livre no link na hora",
      "Mensagem com o nome do seu salão logo no começo",
      "Quem quiser conversar recebe o link do seu WhatsApp",
    ],
    visual: <MockWhatsApp />,
  },
  {
    selo: "Painel",
    titulo: "Seu dia inteiro em uma tela",
    texto:
      "Abra o celular de manhã e veja quem vem, a que horas, qual serviço e quanto vai entrar. Quem confirmou ou cancelou pelo WhatsApp aparece ali mesmo.",
    pontos: [
      "Agenda de cada profissional, com login próprio",
      "Ficha de cada cliente com histórico",
      "Relatório de faturamento e comissão por profissional",
    ],
    visual: <MockPainel />,
  },
  {
    selo: "Cliente de volta",
    titulo: "Manutenção na data certa, sem você lembrar",
    texto:
      "Fez gel, fibra ou alongamento? Na ficha da cliente, agende um lembrete pra daqui a 25 dias. No dia, ela recebe no WhatsApp um convite pra marcar de novo, com o seu link.",
    pontos: ["Funciona pra qualquer serviço de retorno", "Você escolhe em quantos dias", "O convite já leva o link de agendamento"],
    visual: <MockRetorno />,
  },
];

function Recursos() {
  return (
    <section id="recursos" className="scroll-mt-16 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl space-y-20 sm:space-y-28">
        {RECURSOS.map((r, i) => (
          <div key={r.titulo} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className={cn(i % 2 === 1 && "lg:order-2")}>
              <Selo>{r.selo}</Selo>
              <h2 className="mt-4 font-heading text-3xl font-extrabold leading-tight text-text sm:text-4xl">{r.titulo}</h2>
              <p className="mt-4 text-text-muted sm:text-lg">{r.texto}</p>
              <ul className="mt-6 space-y-3">
                {r.pontos.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-text">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" />
                    <span className="text-sm sm:text-base">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={cn("relative", i % 2 === 1 && "lg:order-1")}>
              <div className="veylo-hero-bg veylo-dot-grid-escuro rounded-[2rem] px-5 py-10 sm:px-10">{r.visual}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MockWhatsApp() {
  return (
    <div className="mx-auto w-full max-w-sm rounded-3xl bg-[#0b141a] p-4 shadow-2xl">
      <div className="mb-3 flex items-center gap-2.5 border-b border-white/10 pb-3">
        <Image src="/veylo-logo.png" alt="" width={30} height={34} />
        <div>
          <p className="text-sm font-bold text-white">Veylo Agenda</p>
          <p className="text-[11px] text-white/50">Conta comercial</p>
        </div>
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-[#1f2c34] p-3 text-[13px] leading-snug text-white/90">
        Olá! Aqui é <b>Studio Bela Unha</b>. Lembrete: seu horário de <b>Manutenção do gel</b> é amanhã, sábado,
        10 de outubro às 14:30.
        <br />
        <br />
        Toque em Confirmar ou Cancelar logo abaixo.
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <span className="rounded-xl bg-[#1f2c34] py-2 text-center text-[13px] font-semibold text-[#53bdeb]">Confirmar</span>
        <span className="rounded-xl bg-[#1f2c34] py-2 text-center text-[13px] font-semibold text-[#53bdeb]">Cancelar</span>
      </div>
      <div className="mt-3 ml-auto w-fit rounded-2xl rounded-tr-sm bg-[#005c4b] px-3 py-2 text-[13px] text-white">Confirmar</div>
      <div className="mt-1.5 w-fit rounded-2xl rounded-tl-sm bg-[#1f2c34] px-3 py-2 text-[13px] text-white/90">
        Presença confirmada! ✅
      </div>
    </div>
  );
}

function MockPainel() {
  const linhas = [
    { hora: "09:30", nome: "Carla M.", servico: "Esmaltação em gel", status: "Confirmado", cor: "text-info bg-info-bg" },
    { hora: "11:00", nome: "Juliana S.", servico: "Gel na tips", status: "Atendido", cor: "text-success bg-success-bg" },
    { hora: "14:30", nome: "Renata P.", servico: "Manutenção do gel", status: "Confirmado", cor: "text-info bg-info-bg" },
  ];
  return (
    <div className="mx-auto w-full max-w-sm rounded-3xl border border-border bg-bg p-4 shadow-2xl">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-heading text-lg font-extrabold text-text">Hoje</p>
          <p className="text-xs text-text-muted">sábado, 10 de outubro</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-text-faint">Total do dia</p>
          <p className="font-heading font-bold text-text">R$ 320,00</p>
        </div>
      </div>
      <div className="mt-3 rounded-2xl border border-border bg-surface p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-text">
          <MessageCircle size={13} className="text-accent" /> Respostas das clientes
        </p>
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-text-muted">
          <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-success" />
          <span>
            <b className="text-text">Renata P.</b> confirmou presença em Manutenção do gel
          </span>
        </p>
      </div>
      <div className="mt-3 space-y-2">
        {linhas.map((l) => (
          <div key={l.hora} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
            <span className="font-heading text-sm font-bold tabular-nums text-text">{l.hora}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text">{l.nome}</p>
              <p className="truncate text-xs text-text-muted">{l.servico}</p>
            </div>
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", l.cor)}>{l.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockRetorno() {
  return (
    <div className="mx-auto w-full max-w-sm space-y-3">
      <div className="rounded-3xl border border-border bg-surface p-4 shadow-2xl">
        <p className="text-sm font-semibold text-text">Agendar lembrete de retorno</p>
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <div>
            <p className="text-[11px] text-text-faint">Serviço</p>
            <p className="mt-0.5 rounded-lg border border-border-strong px-2.5 py-1.5 text-sm text-text">Manutenção do gel</p>
          </div>
          <div>
            <p className="text-[11px] text-text-faint">Em quantos dias</p>
            <p className="mt-0.5 w-20 rounded-lg border border-border-strong px-2.5 py-1.5 text-sm tabular-nums text-text">25</p>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-success">
          <CheckCircle2 size={14} /> Lembrete agendado.
        </p>
      </div>
      <div className="ml-6 rounded-2xl rounded-tl-sm bg-[#1f2c34] p-3 text-[13px] leading-snug text-white/90 shadow-2xl">
        <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-white/50">
          <Clock size={12} /> 25 dias depois
        </p>
        Olá! Aqui é <b>Studio Bela Unha</b>. Já faz um tempo desde sua última Manutenção do gel — que tal marcar um novo
        horário? Agende pelo link 💅
      </div>
    </div>
  );
}

const ITENS_PLANO = [
  "Profissionais ilimitadas, cada uma com sua agenda e login",
  "Link de agendamento 24h com sua logo e suas cores",
  "Confirmação e lembrete no WhatsApp com botões",
  "Lembrete de manutenção e retorno",
  "Horário corrido ou horários fixos por dia",
  "Serviços com foto, organizados por categoria",
  "Ficha de clientes com histórico",
  "Relatório de faturamento e comissão",
];

function Preco() {
  return (
    <section id="preco" className="scroll-mt-16 px-4 pb-16 sm:px-6 sm:pb-24">
      <div className="veylo-hero-bg veylo-dot-grid-escuro mx-auto grid max-w-6xl items-center gap-10 overflow-hidden rounded-[2rem] px-6 py-12 sm:px-12 sm:py-16 lg:grid-cols-2">
        <div className="text-center lg:text-left">
          <p className="text-xs font-bold uppercase tracking-wide text-veylo-teal">Um plano, tudo incluso</p>
          <h2 className="mt-3 font-heading text-3xl font-extrabold text-white sm:text-4xl">
            Todos os recursos, pra você e toda a sua equipe
          </h2>
          <p className="mt-4 text-white/70">
            Sem plano básico, sem cobrança por profissional e sem recurso escondido em plano mais caro. Começou sozinha
            e contratou alguém? Continua o mesmo preço.
          </p>
          <div className="mt-7 flex items-baseline justify-center gap-1.5 lg:justify-start">
            <span className="text-lg font-semibold text-white/70">R$</span>
            <span className="font-heading text-6xl font-extrabold text-white">{PRECO_MENSAL}</span>
            <span className="text-white/70">/mês</span>
          </div>
          <p className="mt-2 text-sm text-white/55">14 dias grátis · sem cartão de crédito · sem fidelidade</p>
          <LinkButton
            href="/cadastro"
            size="lg"
            className="mt-7 rounded-full px-8 shadow-[0_0_50px_-10px_var(--veylo-blue)]"
          >
            Começar 14 dias grátis <ArrowRight size={18} />
          </LinkButton>
        </div>
        <ul className="grid gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          {ITENS_PLANO.map((item) => (
            <li key={item} className="flex items-start gap-3 text-white/85">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-veylo-teal/20 text-veylo-teal">
                <Check size={13} strokeWidth={3} />
              </span>
              <span className="text-sm sm:text-base">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

interface Beneficio {
  icone: React.ReactNode;
  titulo: string;
  texto: string;
}

const BENEFICIOS: Beneficio[] = [
  { icone: <Link2 size={20} />, titulo: "Link 24 horas", texto: "A cliente marca pelo celular, sem instalar nada." },
  { icone: <Bell size={20} />, titulo: "Lembrete automático", texto: "Um dia antes, direto no WhatsApp dela." },
  { icone: <XCircle size={20} />, titulo: "Cancelamento que libera", texto: "Cancelou, o horário volta pro link na hora." },
  { icone: <Repeat size={20} />, titulo: "Retorno agendado", texto: "Chama a cliente de volta na data certa." },
  { icone: <Users size={20} />, titulo: "Equipe completa", texto: "Agenda, login e comissão por profissional." },
  { icone: <Tags size={20} />, titulo: "Serviços por categoria", texto: "Com foto, duração e preço à vista." },
  { icone: <Palette size={20} />, titulo: "A cara do seu negócio", texto: "Sua logo e suas cores no link." },
  { icone: <BarChart3 size={20} />, titulo: "Relatório", texto: "Faturamento e clientes que mais voltam." },
];

function TudoIncluso() {
  return (
    <section className="veylo-dot-grid border-y border-border bg-surface-2 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-xl text-center">
          <Selo>Tudo incluso</Selo>
          <h2 className="mt-4 font-heading text-2xl font-extrabold text-text sm:text-3xl">
            O que vem no seu plano
          </h2>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFICIOS.map((b) => (
            <div key={b.titulo} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">{b.icone}</div>
              <p className="mt-3 font-heading font-bold text-text">{b.titulo}</p>
              <p className="mt-1 text-sm text-text-muted">{b.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface LinhaComparacao {
  recurso: string;
  veylo: string;
  outros: string;
}

const COMPARACAO: LinhaComparacao[] = [
  { recurso: "Lembrete automático por WhatsApp", veylo: "Incluído", outros: "Geralmente cobrado à parte" },
  { recurso: "Profissionais extras no mesmo preço", veylo: "Ilimitadas", outros: "Cobrado por agenda" },
  { recurso: "Cliente confirma ou cancela pelo WhatsApp", veylo: "Incluído", outros: "Raro" },
  { recurso: "Lembrete de retorno/manutenção agendável", veylo: "Incluído", outros: "Raro" },
  { recurso: "Logo e cores personalizadas no link público", veylo: "Incluído", outros: "Só em planos mais caros" },
  { recurso: "Teste grátis sem pedir cartão de crédito", veylo: "14 dias", outros: "Varia" },
];

/** Compara contra "sistemas tradicionais" de forma genérica, sem nomear concorrente
 * específico — preço e recurso de empresa real muda com o tempo, e propaganda comparativa
 * nomeando uma marca exige que cada afirmação seja verificável na hora da publicação. As
 * linhas do Veylo são só recursos que já existem de verdade no produto; as do "outros" são
 * tendências gerais do mercado (pesquisadas), não uma alegação sobre uma empresa específica. */
function Comparacao() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <Selo>Comparação</Selo>
          <h2 className="mt-4 font-heading text-2xl font-extrabold text-text sm:text-3xl">
            Veylo Agenda x sistemas tradicionais
          </h2>
        </div>
        <div className="mt-8 overflow-hidden rounded-2xl border border-border-strong bg-surface">
          <div className="hidden items-center gap-x-6 border-b border-border px-6 py-3 sm:grid sm:grid-cols-[1fr_auto_auto]">
            <span />
            <span className="w-32 text-center text-xs font-bold uppercase tracking-wide text-accent">Veylo Agenda</span>
            <span className="w-32 text-center text-xs font-bold uppercase tracking-wide text-text-faint">Outros</span>
          </div>
          {COMPARACAO.map((linha, i) => (
            <div
              key={linha.recurso}
              className={cn(
                "flex flex-col gap-2.5 px-4 py-4 sm:grid sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-x-6 sm:px-6",
                i % 2 === 1 && "bg-surface-2/50",
              )}
            >
              <span className="text-sm text-text">{linha.recurso}</span>
              <div className="flex gap-2 sm:contents">
                <span className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-success-bg px-2 py-1.5 text-center text-xs font-semibold text-success sm:w-32 sm:flex-none">
                  <Check size={14} className="shrink-0" /> {linha.veylo}
                </span>
                <span className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-surface-2 px-2 py-1.5 text-center text-xs text-text-faint sm:w-32 sm:flex-none sm:bg-transparent">
                  <Minus size={14} className="shrink-0" /> {linha.outros}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-text-faint">
          Comparação com base em recursos comuns de sistemas de agenda para salões e barbearias no Brasil.
        </p>
      </div>
    </section>
  );
}

const PASSOS = [
  {
    icone: <Sparkles size={20} />,
    titulo: "Monte seu perfil",
    texto: "Cadastre seus serviços, horários e profissionais, com sua logo e suas cores. Leva poucos minutos.",
  },
  {
    icone: <Link2 size={20} />,
    titulo: "Compartilhe seu link",
    texto: "Coloque na bio do Instagram, no status do WhatsApp e mande pras suas clientes.",
  },
  {
    icone: <CalendarCheck size={20} />,
    titulo: "Receba agendamentos",
    texto: "As clientes marcam sozinhas e recebem confirmação e lembrete. Você só atende.",
  },
];

function ComoComecar() {
  return (
    <section className="veylo-dot-grid border-y border-border bg-surface-2 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-xl text-center">
          <Selo>Passo a passo</Selo>
          <h2 className="mt-4 font-heading text-2xl font-extrabold text-text sm:text-3xl">Começar é fácil</h2>
        </div>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {PASSOS.map((p, i) => (
            <li key={p.titulo} className="rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-center gap-3">
                <span className="font-heading text-3xl font-extrabold text-border-strong">{i + 1}</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">{p.icone}</span>
              </div>
              <p className="mt-4 font-heading text-lg font-bold text-text">{p.titulo}</p>
              <p className="mt-1.5 text-sm text-text-muted">{p.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Segmentos() {
  const segmentos = [
    { nome: "Esmalterias", exemplo: "Gel, fibra, alongamento, esmaltação" },
    { nome: "Salões de beleza", exemplo: "Corte, escova, coloração, tratamento" },
    { nome: "Barbearias", exemplo: "Corte, barba, sobrancelha" },
    { nome: "Sobrancelhas e cílios", exemplo: "Design, henna, extensão de cílios" },
    { nome: "Estética", exemplo: "Limpeza de pele, depilação, massagem" },
    { nome: "Autônomas", exemplo: "Quem atende em casa ou em espaço próprio" },
  ];
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-xl text-center">
          <Selo>Para o seu negócio</Selo>
          <h2 className="mt-4 font-heading text-2xl font-extrabold text-text sm:text-3xl">
            Feita pra quem trabalha com horário marcado
          </h2>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {segmentos.map((s) => (
            <div key={s.nome} className="rounded-2xl border border-border bg-surface p-5">
              <p className="font-heading font-bold text-text">{s.nome}</p>
              <p className="mt-1 text-sm text-text-muted">{s.exemplo}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface Pergunta {
  pergunta: string;
  resposta: React.ReactNode;
}

const PERGUNTAS: Pergunta[] = [
  {
    pergunta: "Quanto custa?",
    resposta: `R$ ${PRECO_MENSAL} por mês, com todos os recursos e profissionais ilimitadas. Os primeiros 14 dias são grátis, sem cartão de crédito.`,
  },
  {
    pergunta: "Tem limite de profissionais?",
    resposta: "Não. Você cadastra quantas profissionais precisar, cada uma com a sua agenda, e o preço é o mesmo.",
  },
  {
    pergunta: "Minha cliente vai precisar baixar algum aplicativo?",
    resposta: "Não. É só um link: abre direto no navegador do celular dela, como qualquer site.",
  },
  {
    pergunta: "As mensagens saem do meu WhatsApp?",
    resposta:
      "Saem do WhatsApp oficial da Veylo, com o nome do seu salão logo no começo. Assim seu número não enche de mensagem automática, e quem quiser conversar recebe o link do seu WhatsApp.",
  },
  {
    pergunta: "Preciso saber mexer bem em tecnologia?",
    resposta: "Não. Se você usa WhatsApp e Instagram no dia a dia, já sabe o suficiente.",
  },
  {
    pergunta: "Tem fidelidade?",
    resposta: "Não. Você usa enquanto fizer sentido pro seu negócio.",
  },
  {
    pergunta: "Meus dados e os da minha cliente ficam seguros?",
    resposta: (
      <>
        Sim. Cada estabelecimento só acessa os próprios dados, conforme a LGPD. Veja nossa{" "}
        <Link href="/privacidade" className="font-medium text-accent underline underline-offset-2">
          Política de Privacidade
        </Link>
        .
      </>
    ),
  },
  {
    pergunta: "E se eu já tiver uma agenda no papel ou em outro sistema?",
    resposta:
      "Sem problema: você começa a receber os agendamentos novos pelo link quando quiser, sem precisar importar nada antes.",
  },
];

function Faq() {
  return (
    <section id="duvidas" className="veylo-dot-grid scroll-mt-16 border-y border-border bg-surface-2 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <Selo>Dúvidas comuns</Selo>
          <h2 className="mt-4 font-heading text-2xl font-extrabold text-text sm:text-3xl">Perguntas frequentes</h2>
        </div>
        <div className="mt-8 space-y-3">
          {PERGUNTAS.map((p) => (
            <details key={p.pergunta} className="group rounded-2xl border border-border bg-surface p-4 open:pb-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-heading font-bold text-text">
                {p.pergunta}
                <ChevronDown size={18} className="shrink-0 text-text-faint transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2.5 text-sm text-text-muted">{p.resposta}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaFinal() {
  return (
    <section className="veylo-hero-bg veylo-dot-grid-escuro px-4 py-16 text-center sm:py-24">
      <h2 className="mx-auto max-w-2xl font-heading text-3xl font-extrabold text-white sm:text-5xl">
        Facilite sua rotina a partir de <span className="veylo-gradient-text">hoje</span>
      </h2>
      <p className="mx-auto mt-4 max-w-md text-white/70">
        Crie sua conta e receba seu link de agendamento em poucos minutos.
      </p>
      <div className="mt-8">
        <LinkButton href="/cadastro" size="lg" className="rounded-full px-8 shadow-[0_0_50px_-10px_var(--veylo-blue)]">
          Começar 14 dias grátis <ArrowRight size={18} />
        </LinkButton>
      </div>
      <p className="mt-4 text-sm text-white/50">
        R$ {PRECO_MENSAL}/mês depois do teste · sem cartão de crédito · sem fidelidade
      </p>
    </section>
  );
}

function Rodape() {
  return (
    <footer className="border-t border-white/10 bg-veylo-navy-950 px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row">
        <div className="flex items-center gap-2">
          <Image src="/veylo-logo.png" alt="" width={22} height={25} />
          <span className="font-heading text-sm font-extrabold text-white">
            Veylo <span className="veylo-gradient-text">Agenda</span>
          </span>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-white/55" aria-label="Rodapé">
          <a href="#recursos" className="hover:text-white">
            Recursos
          </a>
          <a href="#preco" className="hover:text-white">
            Preço
          </a>
          <a href="#duvidas" className="hover:text-white">
            Dúvidas
          </a>
          <Link href="/login" className="hover:text-white">
            Entrar
          </Link>
          <Link href="/privacidade" className="hover:text-white">
            Política de Privacidade
          </Link>
        </nav>
        <p className="text-xs text-white/40">© {new Date().getFullYear()} Veylo Agenda</p>
      </div>
    </footer>
  );
}
