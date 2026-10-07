"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, Clock3, MessageCircle, Plus } from "lucide-react";
import type { StatusAgendamento } from "@prisma/client";
import { GradeAgenda, type ColunaGrade } from "@/components/painel/GradeAgenda";
import { NovoAgendamentoModal, type ProfissionalOpcaoModal, type ClienteOpcaoModal } from "./NovoAgendamentoModal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/painel/StatusBadge";
import { BotoesStatusAgendamento } from "@/components/painel/BotoesStatusAgendamento";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { formatarCentavos } from "@/lib/formatadores";
import type { SituacaoResposta } from "@/lib/agenda/situacaoResposta";
import type { FechamentoAgendamento, ServicoDoCatalogo } from "@/lib/financeiro/dadosFechamento";
import { cn } from "@/lib/cn";

export interface AgendamentoDetalhe {
  id: string;
  clienteNome: string;
  clienteTelefone: string;
  servicoNome: string;
  precoCentavos: number;
  status: StatusAgendamento;
  observacao: string | null;
  horarioFormatado: string;
  resposta: SituacaoResposta;
  /** WhatsApp da cliente com a mensagem de confirmação já escrita (só para quem não respondeu). */
  linkChamarCliente: string | null;
  fechamento: FechamentoAgendamento;
}

/** Um dia da faixa de dias da semana (visão por dia, da equipe). */
export interface DiaDaFaixa {
  dataYMD: string;
  href: string;
  diaSemana: string;
  dia: number;
}

const BOTAO_SETA =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-text-muted transition hover:bg-surface-2 hover:text-text";

export function AgendaClient({
  colunas,
  servicos,
  detalhes,
  profissionais,
  clientes,
  fuso,
  navegacaoAnterior,
  navegacaoProxima,
  navegacaoHoje,
  rotuloPeriodo,
  relacaoPeriodo,
  estaNoPresente,
  porDia,
  diasDaFaixa,
  dataAbertaYMD,
  hojeYMD,
  prefillPadrao,
}: {
  colunas: ColunaGrade[];
  /** Tabela de serviços, para lançar adicionais ao finalizar. */
  servicos: ServicoDoCatalogo[];
  detalhes: Record<string, AgendamentoDetalhe>;
  profissionais: ProfissionalOpcaoModal[];
  clientes: ClienteOpcaoModal[];
  fuso: string;
  navegacaoAnterior: string;
  navegacaoProxima: string;
  navegacaoHoje: string;
  /** "Terça-feira, 6 de outubro" (visão por dia) ou "5 – 11 de outubro" (visão por semana). */
  rotuloPeriodo: string;
  /** "Hoje", "Amanhã", "Esta semana"...; nulo quando o período está mais longe. */
  relacaoPeriodo: string | null;
  estaNoPresente: boolean;
  porDia: boolean;
  diasDaFaixa: DiaDaFaixa[] | null;
  dataAbertaYMD: string;
  hojeYMD: string;
  prefillPadrao: { profissionalId?: string; data: string };
}) {
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [prefill, setPrefill] = useState(prefillPadrao as { profissionalId?: string; data: string; hora?: string });
  const [eventoDetalheId, setEventoDetalheId] = useState<string | null>(null);

  const semProfissionais = profissionais.length === 0;

  function abrirNovoComContexto(chaveColuna: string, minutosDoDia: number) {
    const hora = `${String(Math.floor(minutosDoDia / 60)).padStart(2, "0")}:${String(minutosDoDia % 60).padStart(2, "0")}`;
    const ehData = /^\d{4}-\d{2}-\d{2}$/.test(chaveColuna);
    setPrefill({
      profissionalId: ehData ? prefillPadrao.profissionalId : chaveColuna,
      data: ehData ? chaveColuna : prefillPadrao.data,
      hora,
    });
    setModalNovoAberto(true);
  }

  function abrirNovoGenerico() {
    setPrefill({ ...prefillPadrao, hora: undefined });
    setModalNovoAberto(true);
  }

  const detalheAtual = eventoDetalheId ? detalhes[eventoDetalheId] : null;

  return (
    <div className="px-4 py-6 sm:py-8">
      <header className="mx-auto mb-4 flex max-w-4xl items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold text-text">Agenda</h1>
        <Button size="sm" onClick={abrirNovoGenerico} disabled={semProfissionais}>
          <Plus size={16} /> Novo
        </Button>
      </header>

      <div className="mx-auto mb-4 max-w-4xl rounded-2xl border border-border bg-surface p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <Link href={navegacaoAnterior} aria-label={porDia ? "Dia anterior" : "Semana anterior"} className={BOTAO_SETA}>
            <ChevronLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate font-heading text-base font-bold text-text sm:text-lg">{rotuloPeriodo}</p>
            <div className="mt-1 flex min-h-6 flex-wrap items-center justify-center gap-x-3 gap-y-1">
              {relacaoPeriodo && (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    estaNoPresente ? "bg-accent text-accent-foreground" : "bg-surface-2 text-text-muted",
                  )}
                >
                  {relacaoPeriodo}
                </span>
              )}
              {!estaNoPresente && (
                <Link
                  href={navegacaoHoje}
                  className="rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-text transition hover:bg-surface-2"
                >
                  {porDia ? "Voltar para hoje" : "Voltar para esta semana"}
                </Link>
              )}
            </div>
          </div>
          <Link href={navegacaoProxima} aria-label={porDia ? "Próximo dia" : "Próxima semana"} className={BOTAO_SETA}>
            <ChevronRight size={18} />
          </Link>
        </div>

        {diasDaFaixa && (
          <nav aria-label="Dias da semana" className="mt-3 grid grid-cols-7 gap-1 border-t border-border pt-3">
            {diasDaFaixa.map((d) => {
              const aberto = d.dataYMD === dataAbertaYMD;
              const ehHoje = d.dataYMD === hojeYMD;
              return (
                <Link
                  key={d.dataYMD}
                  href={d.href}
                  aria-current={aberto ? "date" : undefined}
                  className={cn(
                    "flex flex-col items-center rounded-xl py-1.5 transition-colors",
                    aberto ? "bg-accent text-accent-foreground" : "text-text-muted hover:bg-surface-2 hover:text-text",
                    !aberto && d.dataYMD < hojeYMD && "opacity-60",
                  )}
                >
                  <span className={cn("text-[11px] font-medium", ehHoje && !aberto && "font-bold text-text")}>
                    {ehHoje ? "hoje" : d.diaSemana}
                  </span>
                  <span className="text-base leading-tight font-bold">{d.dia}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      <div className="mx-auto max-w-4xl">
        {semProfissionais ? (
          <EstadoVazio
            icone={<Calendar className="mx-auto" />}
            titulo="Nenhuma profissional ativa"
            descricao="Cadastre uma profissional para começar a usar a agenda."
          />
        ) : (
          <GradeAgenda colunas={colunas} aoClicarVazio={abrirNovoComContexto} aoClicarEvento={setEventoDetalheId} />
        )}
      </div>

      <NovoAgendamentoModal
        aberto={modalNovoAberto}
        aoFechar={() => setModalNovoAberto(false)}
        profissionais={profissionais}
        clientes={clientes}
        fuso={fuso}
        valoresIniciais={prefill}
      />

      <Modal aberto={!!detalheAtual} aoFechar={() => setEventoDetalheId(null)} titulo="Agendamento">
        {detalheAtual && (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <p className="font-heading text-lg font-bold text-text">{detalheAtual.clienteNome}</p>
              <div className="flex flex-wrap justify-end gap-1">
                <StatusBadge status={detalheAtual.status} />
                {detalheAtual.resposta === "confirmou" && (
                  <Badge tom="success">
                    <CheckCircle2 size={11} /> cliente confirmou
                  </Badge>
                )}
                {detalheAtual.resposta === "semResposta" && (
                  <Badge tom="warning">
                    <Clock3 size={11} /> sem resposta
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-sm text-text-muted">{detalheAtual.clienteTelefone}</p>
            <div className="rounded-xl bg-surface-2 p-3 text-sm">
              <p className="font-medium text-text">{detalheAtual.servicoNome}</p>
              <p className="text-text-muted">
                {detalheAtual.horarioFormatado} · {formatarCentavos(detalheAtual.precoCentavos)}
              </p>
            </div>
            {detalheAtual.observacao && <p className="text-sm text-text-muted">Obs: {detalheAtual.observacao}</p>}
            {detalheAtual.linkChamarCliente && (
              <div className="rounded-xl border border-warning/30 bg-warning-bg p-3 text-sm">
                <p className="text-text">A cliente recebeu o aviso no WhatsApp e ainda não confirmou. O horário continua na agenda.</p>
                <a
                  href={detalheAtual.linkChamarCliente}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 font-semibold text-text hover:underline"
                >
                  <MessageCircle size={15} /> Chamar no WhatsApp
                </a>
              </div>
            )}
            <BotoesStatusAgendamento agendamento={detalheAtual.fechamento} servicos={servicos} />
          </div>
        )}
      </Modal>
    </div>
  );
}
