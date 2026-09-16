"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Calendar } from "lucide-react";
import type { StatusAgendamento } from "@prisma/client";
import { GradeAgenda, type ColunaGrade } from "@/components/painel/GradeAgenda";
import { NovoAgendamentoModal, type ProfissionalOpcaoModal, type ClienteOpcaoModal } from "./NovoAgendamentoModal";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/painel/StatusBadge";
import { BotoesStatusAgendamento } from "@/components/painel/BotoesStatusAgendamento";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { formatarCentavos } from "@/lib/formatadores";

export interface AgendamentoDetalhe {
  id: string;
  clienteNome: string;
  clienteTelefone: string;
  servicoNome: string;
  precoCentavos: number;
  status: StatusAgendamento;
  observacao: string | null;
  horarioFormatado: string;
}

export function AgendaClient({
  colunas,
  detalhes,
  profissionais,
  clientes,
  fuso,
  navegacaoAnterior,
  navegacaoProxima,
  navegacaoHoje,
  rotuloPeriodo,
  prefillPadrao,
}: {
  colunas: ColunaGrade[];
  detalhes: Record<string, AgendamentoDetalhe>;
  profissionais: ProfissionalOpcaoModal[];
  clientes: ClienteOpcaoModal[];
  fuso: string;
  navegacaoAnterior: string;
  navegacaoProxima: string;
  navegacaoHoje: string;
  rotuloPeriodo: string;
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
      <header className="mx-auto mb-5 flex max-w-4xl items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-text">Agenda</h1>
          <p className="text-sm text-text-muted capitalize">{rotuloPeriodo}</p>
        </div>
        <Button size="sm" onClick={abrirNovoGenerico} disabled={semProfissionais}>
          <Plus size={16} /> Novo
        </Button>
      </header>

      <div className="mx-auto mb-4 flex max-w-4xl items-center gap-2">
        <Link href={navegacaoAnterior} className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-muted hover:bg-surface-2">
          <ChevronLeft size={16} />
        </Link>
        <Link href={navegacaoHoje} className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-2">
          Hoje
        </Link>
        <Link href={navegacaoProxima} className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-muted hover:bg-surface-2">
          <ChevronRight size={16} />
        </Link>
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
            <div className="flex items-center justify-between">
              <p className="font-heading text-lg font-bold text-text">{detalheAtual.clienteNome}</p>
              <StatusBadge status={detalheAtual.status} />
            </div>
            <p className="text-sm text-text-muted">{detalheAtual.clienteTelefone}</p>
            <div className="rounded-xl bg-surface-2 p-3 text-sm">
              <p className="font-medium text-text">{detalheAtual.servicoNome}</p>
              <p className="text-text-muted">
                {detalheAtual.horarioFormatado} · {formatarCentavos(detalheAtual.precoCentavos)}
              </p>
            </div>
            {detalheAtual.observacao && <p className="text-sm text-text-muted">Obs: {detalheAtual.observacao}</p>}
            <BotoesStatusAgendamento agendamentoId={detalheAtual.id} status={detalheAtual.status} />
          </div>
        )}
      </Modal>
    </div>
  );
}
