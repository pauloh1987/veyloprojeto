import { formatInTimeZone } from "date-fns-tz";
import type { OrigemAgendamento, StatusAgendamento } from "@prisma/client";
import { valorDoAtendimento } from "../financeiro/fechamento";

/**
 * Relatório de desempenho do mês (sem banco, para dar para testar): atendimentos, faltas, clientes,
 * serviços, horários e profissionais. O dinheiro que entrou e as comissões ficam na tela Financeiro.
 */

export interface AgendamentoDoRelatorio {
  status: StatusAgendamento;
  origem: OrigemAgendamento;
  inicio: Date;
  clienteId: string;
  servicoId: string;
  profissionalId: string;
  valorTotalCentavos: number | null;
  servico: { nome: string; precoCentavos: number };
  profissional: { nome: string };
  cliente: { nome: string };
}

export interface DesempenhoProfissional {
  profissionalId: string;
  nome: string;
  atendimentos: number;
  valorCentavos: number;
  ticketMedioCentavos: number | null;
  faltas: number;
  taxaFalta: number | null;
}

export interface DesempenhoDoMes {
  atendimentos: number;
  valorCentavos: number;
  ticketMedioCentavos: number | null;
  faltas: number;
  taxaFalta: number | null;
  /** Dos agendamentos não cancelados, quantos % a cliente marcou pelo link. */
  pelaLinkPercentual: number | null;
  clientesAtendidas: number;
  clientesNovas: number;
  servicos: { nome: string; qtd: number; valorCentavos: number }[];
  horarios: { hora: number; qtd: number }[];
  /** 0 = domingo ... 6 = sábado, sempre os 7 dias. */
  diasDaSemana: { dia: number; qtd: number }[];
  profissionais: DesempenhoProfissional[];
  melhoresClientes: { clienteId: string; nome: string; atendimentos: number; valorCentavos: number }[];
}

function percentual(parte: number, todo: number): number | null {
  return todo === 0 ? null : (parte / todo) * 100;
}

/** `primeiraVisita`: data do primeiro atendimento de cada cliente (de todos os tempos), para saber
 * quem veio pela primeira vez no mês. */
export function resumirDesempenho(
  agendamentos: AgendamentoDoRelatorio[],
  fuso: string,
  primeiraVisita: Map<string, Date>,
  inicioDoMes: Date,
): DesempenhoDoMes {
  const atendidos = agendamentos.filter((a) => a.status === "ATENDIDO");
  const faltas = agendamentos.filter((a) => a.status === "FALTOU");
  const naoCancelados = agendamentos.filter((a) => a.status !== "CANCELADO");
  const valorCentavos = atendidos.reduce((soma, a) => soma + valorDoAtendimento(a), 0);

  const clientesAtendidas = new Set(atendidos.map((a) => a.clienteId));
  const clientesNovas = [...clientesAtendidas].filter((id) => {
    const primeira = primeiraVisita.get(id);
    return primeira !== undefined && primeira.getTime() >= inicioDoMes.getTime();
  }).length;

  const porServico = new Map<string, { nome: string; qtd: number; valorCentavos: number }>();
  for (const a of atendidos) {
    const atual = porServico.get(a.servicoId) ?? { nome: a.servico.nome, qtd: 0, valorCentavos: 0 };
    atual.qtd++;
    atual.valorCentavos += valorDoAtendimento(a);
    porServico.set(a.servicoId, atual);
  }

  const porHora = new Map<number, number>();
  const porDia = Array.from({ length: 7 }, (_, dia) => ({ dia, qtd: 0 }));
  for (const a of naoCancelados) {
    const hora = Number(formatInTimeZone(a.inicio, fuso, "H"));
    porHora.set(hora, (porHora.get(hora) ?? 0) + 1);
    porDia[Number(formatInTimeZone(a.inicio, fuso, "i")) % 7].qtd++;
  }

  const porProfissional = new Map<string, DesempenhoProfissional>();
  for (const a of agendamentos) {
    if (a.status !== "ATENDIDO" && a.status !== "FALTOU") continue;
    const atual = porProfissional.get(a.profissionalId) ?? {
      profissionalId: a.profissionalId,
      nome: a.profissional.nome,
      atendimentos: 0,
      valorCentavos: 0,
      ticketMedioCentavos: null,
      faltas: 0,
      taxaFalta: null,
    };
    if (a.status === "ATENDIDO") {
      atual.atendimentos++;
      atual.valorCentavos += valorDoAtendimento(a);
    } else {
      atual.faltas++;
    }
    porProfissional.set(a.profissionalId, atual);
  }
  const profissionais = [...porProfissional.values()]
    .map((p) => ({
      ...p,
      ticketMedioCentavos: p.atendimentos === 0 ? null : Math.round(p.valorCentavos / p.atendimentos),
      taxaFalta: percentual(p.faltas, p.atendimentos + p.faltas),
    }))
    .sort((a, b) => b.valorCentavos - a.valorCentavos);

  const porCliente = new Map<string, { clienteId: string; nome: string; atendimentos: number; valorCentavos: number }>();
  for (const a of atendidos) {
    const atual = porCliente.get(a.clienteId) ?? { clienteId: a.clienteId, nome: a.cliente.nome, atendimentos: 0, valorCentavos: 0 };
    atual.atendimentos++;
    atual.valorCentavos += valorDoAtendimento(a);
    porCliente.set(a.clienteId, atual);
  }

  return {
    atendimentos: atendidos.length,
    valorCentavos,
    ticketMedioCentavos: atendidos.length === 0 ? null : Math.round(valorCentavos / atendidos.length),
    faltas: faltas.length,
    taxaFalta: percentual(faltas.length, atendidos.length + faltas.length),
    pelaLinkPercentual: percentual(naoCancelados.filter((a) => a.origem === "LINK").length, naoCancelados.length),
    clientesAtendidas: clientesAtendidas.size,
    clientesNovas,
    servicos: [...porServico.values()].sort((a, b) => b.qtd - a.qtd || b.valorCentavos - a.valorCentavos).slice(0, 5),
    horarios: [...porHora.entries()]
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, 5)
      .map(([hora, qtd]) => ({ hora, qtd })),
    diasDaSemana: porDia,
    profissionais,
    melhoresClientes: [...porCliente.values()].sort((a, b) => b.valorCentavos - a.valorCentavos).slice(0, 5),
  };
}

export const DIAS_PARA_SUMIR = 45;
const DIAS_LIMITE_SUMIDA = 180;

/** Quem não volta há mais de 45 dias (e menos de 180, para não listar quem já foi embora de vez) e
 * não tem horário marcado: as primeiras a chamar de volta, das que sumiram mais recentemente. */
export function clientesSumidas(
  ultimasVisitas: { clienteId: string; ultima: Date }[],
  comHorarioMarcado: Set<string>,
  agora: Date,
): { clienteId: string; ultima: Date; dias: number }[] {
  const umDia = 24 * 60 * 60 * 1000;
  return ultimasVisitas
    .filter((v) => !comHorarioMarcado.has(v.clienteId))
    .map((v) => ({ ...v, dias: Math.floor((agora.getTime() - v.ultima.getTime()) / umDia) }))
    .filter((v) => v.dias > DIAS_PARA_SUMIR && v.dias <= DIAS_LIMITE_SUMIDA)
    .sort((a, b) => a.dias - b.dias);
}
