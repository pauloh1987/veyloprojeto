import type { FormaPagamento, Prisma, StatusAgendamento } from "@prisma/client";
import { db } from "@/lib/db";

/** O que as telas (Hoje, Agenda) precisam para abrir a janela "Finalizar atendimento" e mostrar
 * como o atendimento foi pago. */
export interface FechamentoAgendamento {
  id: string;
  status: StatusAgendamento;
  clienteNome: string;
  servicoNome: string;
  precoCentavos: number;
  /** Vazio enquanto não foi finalizado com a janela de pagamento. */
  valorServicoCentavos: number | null;
  valorTotalCentavos: number | null;
  adicionais: { descricao: string; valorCentavos: number }[];
  pagamentos: { forma: FormaPagamento; valorCentavos: number; recebido: boolean }[];
}

/** Serviço da tabela do salão, para lançar como adicional com um toque. */
export interface ServicoDoCatalogo {
  id: string;
  nome: string;
  precoCentavos: number;
}

export const INCLUIR_FECHAMENTO = {
  adicionais: { select: { descricao: true, valorCentavos: true } },
  pagamentos: { select: { forma: true, valorCentavos: true, recebidoEm: true }, orderBy: { criadoEm: "asc" } },
} satisfies Prisma.AgendamentoInclude;

export function montarFechamento(agendamento: {
  id: string;
  status: StatusAgendamento;
  valorServicoCentavos: number | null;
  valorTotalCentavos: number | null;
  cliente: { nome: string };
  servico: { nome: string; precoCentavos: number };
  adicionais: { descricao: string; valorCentavos: number }[];
  pagamentos: { forma: FormaPagamento; valorCentavos: number; recebidoEm: Date | null }[];
}): FechamentoAgendamento {
  return {
    id: agendamento.id,
    status: agendamento.status,
    clienteNome: agendamento.cliente.nome,
    servicoNome: agendamento.servico.nome,
    precoCentavos: agendamento.servico.precoCentavos,
    valorServicoCentavos: agendamento.valorServicoCentavos,
    valorTotalCentavos: agendamento.valorTotalCentavos,
    adicionais: agendamento.adicionais,
    pagamentos: agendamento.pagamentos.map((p) => ({ forma: p.forma, valorCentavos: p.valorCentavos, recebido: p.recebidoEm !== null })),
  };
}

export function carregarCatalogo(estabelecimentoId: string): Promise<ServicoDoCatalogo[]> {
  return db.servico.findMany({
    where: { estabelecimentoId, ativo: true },
    select: { id: true, nome: true, precoCentavos: true },
    orderBy: { nome: "asc" },
  });
}
