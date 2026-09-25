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
} from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export default function PaginaInicial() {
  return (
    <main className="bg-bg text-text">
      <Cabecalho />
      <Hero />
      <ParaQuemE />
      <Beneficios />
      <Comparacao />
      <ComoFunciona />
      <Demonstracao />
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
        <div className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href="/login"
            className="rounded-xl px-3 py-2 text-sm font-semibold text-white/80 transition-colors hover:text-white sm:px-4"
          >
            Entrar
          </Link>
          <LinkButton href="/cadastro" size="sm">
            Criar conta grátis
          </LinkButton>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="veylo-hero-bg veylo-dot-grid-escuro px-4 pb-20 pt-16 text-center sm:pb-28 sm:pt-24">
      <p className="mx-auto max-w-md text-xs font-semibold uppercase tracking-wide text-veylo-teal">
        Feito para salões, barbearias e profissionais autônomos de beleza
      </p>
      <h1 className="mx-auto mt-4 max-w-2xl font-heading text-4xl font-extrabold leading-[1.1] text-white sm:text-6xl">
        Sua cliente <span className="veylo-gradient-text">agenda sozinha</span>. Você organiza
        o resto.
      </h1>
      <p className="mx-auto mt-5 max-w-lg text-white/70 sm:text-lg">
        Um link de agendamento pro seu Instagram, WhatsApp ou bio — a cliente escolhe o horário
        livre e recebe confirmação na hora, sem trocar mensagem pra combinar.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <LinkButton href="/cadastro" size="lg" className="shadow-[0_0_50px_-10px_var(--veylo-blue)]">
          Criar minha conta grátis
        </LinkButton>
        <a
          href="#como-funciona"
          className="flex h-14 items-center justify-center gap-1.5 rounded-xl px-6 text-base font-semibold text-white/80 hover:text-white"
        >
          Ver como funciona <ArrowRight size={16} />
        </a>
      </div>
      <p className="mt-5 text-sm text-white/50">14 dias grátis pra testar · sem cartão de crédito</p>
    </section>
  );
}

function ParaQuemE() {
  const publicos = [
    "Barbearias",
    "Salões de beleza",
    "Estúdios de unha",
    "Designers de sobrancelha e cílios",
    "Esteticistas",
    "Profissionais autônomas",
  ];
  return (
    <section className="border-b border-border bg-surface px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-6 gap-y-2.5">
        <p className="text-xs font-bold uppercase tracking-wide text-text-faint">Feito para</p>
        {publicos.map((p) => (
          <span key={p} className="text-sm font-medium text-text-muted">
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

interface Beneficio {
  icone: React.ReactNode;
  titulo: string;
  texto: string;
}

const BENEFICIOS: Beneficio[] = [
  {
    icone: <Link2 size={22} />,
    titulo: "Link de agendamento 24 horas",
    texto:
      "Sua cliente marca o horário direto pelo celular, a qualquer hora — sem precisar te chamar no WhatsApp pra perguntar se tem vaga.",
  },
  {
    icone: <Bell size={22} />,
    titulo: "Lembrete automático por SMS/WhatsApp",
    texto:
      "O sistema avisa sua cliente sozinho, perto do horário marcado — menos gente esquecendo e não aparecendo.",
  },
  {
    icone: <Users size={22} />,
    titulo: "Agenda por profissional",
    texto:
      "Cada profissional da equipe tem sua própria agenda, com horários e folgas configurados do jeito que funciona pra ela.",
  },
  {
    icone: <Tags size={22} />,
    titulo: "Serviços organizados por categoria",
    texto:
      "Separe seus serviços em grupos — Cabelo, Barba, Unha em Gel — igual ao cardápio que sua cliente já está acostumada a ver.",
  },
  {
    icone: <Palette size={22} />,
    titulo: "Sua marca, do seu jeito",
    texto:
      "Logo, cor de destaque e visual do link público personalizados pro seu negócio — não um sistema genérico e sem cara.",
  },
  {
    icone: <BarChart3 size={22} />,
    titulo: "Histórico e relatório",
    texto:
      "Veja quais clientes agendam mais e quanto cada profissional está faturando, tudo em um só lugar.",
  },
  {
    icone: <XCircle size={22} />,
    titulo: "Cliente cancela sozinha, se precisar",
    texto:
      "Todo agendamento vem com um link próprio pra ela cancelar caso não possa ir — sem precisar te ligar ou mandar mensagem de última hora.",
  },
  {
    icone: <Repeat size={22} />,
    titulo: "Lembrete de manutenção quando você quiser",
    texto:
      "Marcou uma cliente de gel ou coloração? Agende um lembrete automático pra daqui a X dias, na ficha dela — o sistema manda sozinho.",
  },
];

function Beneficios() {
  return (
    <section className="veylo-dot-grid px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-xl text-center">
          <Selo>Recursos</Selo>
          <h2 className="mt-4 font-heading text-2xl font-extrabold text-text sm:text-3xl">
            Por que usar o Veylo Agenda
          </h2>
          <p className="mt-3 text-text-muted">
            Cada recurso resolve um problema real de quem organiza agenda de salão no dia a dia.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFICIOS.map((b) => (
            <div key={b.titulo} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                {b.icone}
              </div>
              <p className="mt-3 font-heading font-bold text-text">{b.titulo}</p>
              <p className="mt-1.5 text-sm text-text-muted">{b.texto}</p>
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
  { recurso: "Lembrete automático por WhatsApp/SMS", veylo: "Incluído", outros: "Geralmente cobrado à parte" },
  { recurso: "Cliente agenda sozinha, 24h por dia", veylo: "Incluído", outros: "Varia conforme o plano" },
  { recurso: "Cliente cancela sozinha pelo link", veylo: "Incluído", outros: "Raro" },
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
    <section className="border-y border-border bg-surface-2 px-4 py-16 sm:px-6 sm:py-24">
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

interface Passo {
  numero: string;
  icone: React.ReactNode;
  titulo: string;
  texto: string;
}

const PASSOS: Passo[] = [
  {
    numero: "1",
    icone: <Link2 size={20} />,
    titulo: "Compartilhe seu link",
    texto: "Coloque o link do seu Veylo Agenda no Instagram, WhatsApp ou onde sua cliente já te encontra.",
  },
  {
    numero: "2",
    icone: <CalendarCheck size={20} />,
    titulo: "Cliente escolhe e marca",
    texto: "Ela escolhe o serviço, o profissional e um horário livre — sozinha, sem esperar você responder.",
  },
  {
    numero: "3",
    icone: <CheckCircle2 size={20} />,
    titulo: "Confirmação na hora",
    texto: "Ela recebe a confirmação por SMS ou WhatsApp assim que o agendamento é feito.",
  },
  {
    numero: "4",
    icone: <Bell size={20} />,
    titulo: "Lembrete automático",
    texto: "Perto do horário marcado, o sistema lembra ela sozinho — reduzindo falta.",
  },
];

function ComoFunciona() {
  return (
    <section
      id="como-funciona"
      className="veylo-dot-grid border-y border-border bg-surface-2 px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-xl text-center">
          <Selo>Passo a passo</Selo>
          <h2 className="mt-4 font-heading text-2xl font-extrabold text-text sm:text-3xl">Como funciona</h2>
          <p className="mt-3 text-text-muted">Do link compartilhado ao lembrete automático, em quatro passos.</p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PASSOS.map((p) => (
            <div key={p.numero} className="relative rounded-2xl border border-border bg-surface p-5">
              <span className="font-heading text-3xl font-extrabold text-border-strong">{p.numero}</span>
              <div className="mt-2 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                {p.icone}
              </div>
              <p className="mt-3 font-heading font-bold text-text">{p.titulo}</p>
              <p className="mt-1.5 text-sm text-text-muted">{p.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Reproduz o visual real da tela de "escolha o serviço" do link público (mesmas cores,
 * mesma estrutura de categoria) — não é uma captura de tela literal, mas usa a interface de
 * verdade do produto, não uma peça de marketing inventada. */
function Demonstracao() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <Selo>Veja por dentro</Selo>
          <h2 className="mt-4 font-heading text-2xl font-extrabold text-text sm:text-3xl">
            Isso é a tela que sua cliente vê
          </h2>
          <p className="mt-3 text-text-muted">
            Serviços organizados por categoria, com duração e preço já visíveis. Sua cliente escolhe o
            serviço, depois o profissional, depois o horário — sem precisar te perguntar nada antes.
          </p>
          <ul className="mt-5 space-y-2.5 text-sm text-text-muted">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
              Funciona no celular, sem precisar instalar aplicativo
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
              Mostra só os horários realmente livres de cada profissional
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
              Logo e cores do seu negócio, não da Veylo
            </li>
          </ul>
        </div>
        <div className="mx-auto w-full max-w-xs rounded-[2rem] border border-border-strong bg-surface p-3 shadow-xl">
          <div className="rounded-2xl bg-bg p-4">
            <p className="text-center text-xs font-semibold text-text-faint">Escolha o serviço</p>
            <p className="mb-3 mt-3 text-[11px] font-semibold uppercase tracking-wide text-text-faint">Cabelo</p>
            <div className="mb-2.5 rounded-xl border border-border bg-surface p-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
                <p className="text-sm font-semibold text-text">Corte masculino</p>
              </div>
              <p className="mt-1 text-xs text-text-muted">30 min · R$ 35,00</p>
            </div>
            <p className="mb-3 mt-4 text-[11px] font-semibold uppercase tracking-wide text-text-faint">Barba</p>
            <div className="mb-2.5 rounded-xl border border-border bg-surface p-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-warning" />
                <p className="text-sm font-semibold text-text">Barba completa</p>
              </div>
              <p className="mt-1 text-xs text-text-muted">30 min · R$ 30,00</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-info" />
                <p className="text-sm font-semibold text-text">Sobrancelha na navalha</p>
              </div>
              <p className="mt-1 text-xs text-text-muted">15 min · R$ 15,00</p>
            </div>
          </div>
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
    pergunta: "Preciso saber mexer bem em tecnologia?",
    resposta: "Não. Se você usa WhatsApp e Instagram no dia a dia, já sabe o suficiente — o painel foi feito pra quem nunca usou um sistema de agenda antes.",
  },
  {
    pergunta: "Minha cliente vai precisar baixar algum aplicativo?",
    resposta: "Não. É só um link — abre direto no navegador do celular dela, como qualquer site, sem instalar nada.",
  },
  {
    pergunta: "Funciona só pra barbearia?",
    resposta: "Não, serve pra qualquer negócio que agenda horário com cliente: salão, estúdio de unha, sobrancelha, cílios, estética e mais.",
  },
  {
    pergunta: "Preciso pagar pra testar?",
    resposta: "Não — toda conta nova tem 14 dias de teste grátis, sem precisar de cartão de crédito.",
  },
  {
    pergunta: "Meus dados e os da minha cliente ficam seguros?",
    resposta: (
      <>
        Sim. Cada estabelecimento só acessa os próprios dados, conforme a LGPD — veja nossa{" "}
        <Link href="/privacidade" className="font-medium text-accent underline underline-offset-2">
          Política de Privacidade
        </Link>
        .
      </>
    ),
  },
  {
    pergunta: "E se eu já tiver uma agenda no papel ou em outro sistema?",
    resposta: "Sem problema — você pode começar a usar o link público a qualquer momento pra receber agendamentos novos, sem precisar importar nada antes.",
  },
];

function Faq() {
  return (
    <section className="veylo-dot-grid border-y border-border bg-surface-2 px-4 py-16 sm:px-6 sm:py-24">
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
    <section className="veylo-hero-bg veylo-dot-grid-escuro px-4 py-16 text-center sm:py-20">
      <h2 className="mx-auto max-w-xl font-heading text-2xl font-extrabold text-white sm:text-3xl">
        Pronta pra parar de organizar agenda por mensagem?
      </h2>
      <p className="mx-auto mt-3 max-w-md text-white/70">
        Crie sua conta grátis e receba seu link de agendamento em poucos minutos.
      </p>
      <div className="mt-7">
        <LinkButton href="/cadastro" size="lg" className="shadow-[0_0_50px_-10px_var(--veylo-blue)]">
          Criar minha conta grátis
        </LinkButton>
      </div>
      <p className="mt-4 text-sm text-white/50">14 dias grátis pra testar · sem cartão de crédito</p>
    </section>
  );
}

function Rodape() {
  return (
    <footer className="border-t border-border bg-bg px-4 py-8 text-center">
      <p className="text-sm text-text-faint">
        <Link href="/privacidade" className="hover:text-text-muted">
          Política de Privacidade
        </Link>
      </p>
      <p className="mt-2 text-xs text-text-faint">© {new Date().getFullYear()} Veylo Agenda</p>
    </footer>
  );
}
