import { MessageCircle } from "lucide-react";
import { formatarCentavos, formatarDuracao } from "@/lib/formatadores";
import { cn } from "@/lib/cn";

/** Negócios de exemplo usados nas ilustrações da página inicial. São fictícios, desenhados
 * com a mesma estrutura do link público real (cartão com a letra do serviço, duração, preço
 * e grade de horários), para mostrar que o sistema serve para vários tipos de negócio e não
 * só esmalteria. Nenhum dado aqui é de cliente real. */
export interface SegmentoDemo {
  id: "barbearia" | "esmalteria" | "salao" | "sobrancelhas";
  rotulo: string;
  negocio: string;
  cor: string;
  corSuave: string;
  categoria: string;
  servicos: { nome: string; duracaoMin: number; precoCentavos: number }[];
  dia: string;
  horarios: string[];
  horarioEscolhido: string;
  servicoEscolhido: string;
  quandoWhatsApp: string;
}

export const SEGMENTOS_DEMO: SegmentoDemo[] = [
  {
    id: "barbearia",
    rotulo: "Barbearia",
    negocio: "Barbearia Corte Fino",
    cor: "#a8742a",
    corSuave: "#f5ecdf",
    categoria: "Cabelo e barba",
    servicos: [
      { nome: "Corte masculino", duracaoMin: 40, precoCentavos: 4500 },
      { nome: "Barba completa", duracaoMin: 30, precoCentavos: 3500 },
      { nome: "Corte + barba", duracaoMin: 70, precoCentavos: 7000 },
    ],
    dia: "Sexta, 9 de outubro",
    horarios: ["09:00", "09:40", "10:20", "17:20", "18:00", "18:40"],
    horarioEscolhido: "18:00",
    servicoEscolhido: "Corte + barba",
    quandoWhatsApp: "sexta, 9 de outubro às 18:00",
  },
  {
    id: "esmalteria",
    rotulo: "Esmalteria",
    negocio: "Studio Bela Unha",
    cor: "#e2557a",
    corSuave: "#fbe9ef",
    categoria: "Aplicação",
    servicos: [
      { nome: "Gel na tips", duracaoMin: 120, precoCentavos: 15000 },
      { nome: "Manutenção do gel", duracaoMin: 90, precoCentavos: 11000 },
      { nome: "Esmaltação em gel", duracaoMin: 60, precoCentavos: 6000 },
    ],
    dia: "Sábado, 10 de outubro",
    horarios: ["09:30", "11:00", "13:00", "14:30", "16:00", "17:30"],
    horarioEscolhido: "14:30",
    servicoEscolhido: "Gel na tips",
    quandoWhatsApp: "sábado, 10 de outubro às 14:30",
  },
  {
    id: "salao",
    rotulo: "Salão",
    negocio: "Salão Maria Flor",
    cor: "#7c5cd6",
    corSuave: "#efeafc",
    categoria: "Cabelo",
    servicos: [
      { nome: "Corte feminino", duracaoMin: 60, precoCentavos: 9000 },
      { nome: "Escova", duracaoMin: 45, precoCentavos: 6000 },
      { nome: "Coloração", duracaoMin: 120, precoCentavos: 18000 },
    ],
    dia: "Quinta, 8 de outubro",
    horarios: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
    horarioEscolhido: "15:00",
    servicoEscolhido: "Escova",
    quandoWhatsApp: "quinta, 8 de outubro às 15:00",
  },
  {
    id: "sobrancelhas",
    rotulo: "Sobrancelhas",
    negocio: "Studio Olhar",
    cor: "#9a6b4f",
    corSuave: "#f4ece6",
    categoria: "Sobrancelhas e cílios",
    servicos: [
      { nome: "Design de sobrancelha", duracaoMin: 40, precoCentavos: 5000 },
      { nome: "Design com henna", duracaoMin: 50, precoCentavos: 6500 },
      { nome: "Extensão de cílios", duracaoMin: 120, precoCentavos: 18000 },
    ],
    dia: "Quarta, 7 de outubro",
    horarios: ["10:00", "10:40", "11:20", "14:00", "14:40", "15:20"],
    horarioEscolhido: "14:40",
    servicoEscolhido: "Design com henna",
    quandoWhatsApp: "quarta, 7 de outubro às 14:40",
  },
];

export function segmentoDemo(id: SegmentoDemo["id"]): SegmentoDemo {
  return SEGMENTOS_DEMO.find((s) => s.id === id) ?? SEGMENTOS_DEMO[0];
}

export function Celular({ children, className }: { children: React.ReactNode; className?: string }) {
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
 * página do negócio, que tem a identidade dele. */
export function TelaLinkPublico({ segmento }: { segmento: SegmentoDemo }) {
  return (
    <div className="pb-4">
      <div className="px-4 pb-4 pt-6 text-center" style={{ background: segmento.corSuave }}>
        <span
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full font-heading text-lg font-extrabold text-white"
          style={{ background: segmento.cor }}
        >
          {segmento.negocio.charAt(0)}
        </span>
        <p className="mt-2 font-heading text-sm font-extrabold">{segmento.negocio}</p>
        <p className="text-[11px] text-[#545d6e]">Escolha o serviço</p>
      </div>
      <div className="space-y-2 px-3.5 pt-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#8891a0]">{segmento.categoria}</p>
        {segmento.servicos.map((s) => (
          <div key={s.nome} className="flex items-center gap-2.5 rounded-xl border border-[#e2e6ee] p-2.5">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-heading text-sm font-bold text-white"
              style={{ background: segmento.cor }}
              aria-hidden
            >
              {s.nome.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{s.nome}</p>
              <p className="text-[11px] text-[#545d6e]">{formatarDuracao(s.duracaoMin)}</p>
            </div>
            <span className="shrink-0 font-heading text-[12px] font-bold">{formatarCentavos(s.precoCentavos)}</span>
          </div>
        ))}
        <p className="pt-1 text-[10px] font-bold uppercase tracking-wide text-[#8891a0]">{segmento.dia}</p>
        <div className="grid grid-cols-3 gap-1.5">
          {segmento.horarios.map((h) => {
            const escolhido = h === segmento.horarioEscolhido;
            return (
              <span
                key={h}
                className="rounded-lg border py-1.5 text-center text-xs font-semibold tabular-nums"
                style={
                  escolhido
                    ? { background: segmento.cor, borderColor: segmento.cor, color: "#ffffff" }
                    : { borderColor: "#e2e6ee", color: "#10151f" }
                }
              >
                {h}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** A confirmação que chega no WhatsApp da cliente logo depois de marcar pelo link. */
export function NotificacaoWhatsApp({ segmento, className }: { segmento: SegmentoDemo; className?: string }) {
  return (
    <div
      className={cn(
        "w-64 rounded-2xl border border-white/10 bg-veylo-navy-800/95 p-3.5 text-left shadow-2xl backdrop-blur sm:w-72",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#25D366] text-white">
          <MessageCircle size={15} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-white">WhatsApp · agora</p>
          <p className="truncate text-[11px] text-white/60">{segmento.negocio}</p>
        </div>
      </div>
      <p className="mt-2 text-[13px] leading-snug text-white/85">
        Seu horário de <b>{segmento.servicoEscolhido}</b> está marcado para <b>{segmento.quandoWhatsApp}</b>.
      </p>
      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        <span className="rounded-lg bg-white/10 py-1.5 text-center text-xs font-semibold text-veylo-teal">Confirmar</span>
        <span className="rounded-lg bg-white/10 py-1.5 text-center text-xs font-semibold text-white/70">Cancelar</span>
      </div>
    </div>
  );
}
