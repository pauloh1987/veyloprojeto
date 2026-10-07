import { db } from "@/lib/db";
import { limitesDoDia } from "@/lib/tz";
import { parametroMes, periodoDeComparacao, somarMeses, type MesAno } from "@/lib/mesRelatorio";
import { valorDoAtendimento } from "./fechamento";
import { resumirComissoes, totaisDasComissoes } from "./comissoes";
import {
  agruparFiadoPorCliente,
  entradasPorDia,
  somarPorForma,
  variacaoPercentual,
  type Recebimento,
} from "./resumoFinanceiro";

function primeiroDia({ ano, mes }: MesAno): string {
  return `${ano}-${String(mes).padStart(2, "0")}-01`;
}

/** Pagamento que entrou no caixa no mês, com o que a tela mostra do atendimento. */
export interface RecebimentoDoMes extends Recebimento {
  id: string;
  clienteNome: string;
  servicoNome: string;
  profissionalNome: string;
  /** Dia do atendimento (num fiado recebido, de quando era a dívida). */
  atendimentoEm: Date;
}

const DO_AGENDAMENTO = {
  select: {
    inicio: true,
    clienteId: true,
    cliente: { select: { nome: true, telefone: true } },
    servico: { select: { nome: true } },
    profissional: { select: { nome: true } },
  },
} as const;

/** Tudo o que a tela Financeiro mostra de um mês: o dinheiro que entrou (caixa), o fiado em aberto
 * (de qualquer mês), as comissões e o que fica com o salão (pelos atendimentos finalizados no mês). */
export async function carregarFinanceiro(estabelecimentoId: string, fuso: string, mes: MesAno, agora: Date = new Date()) {
  const inicioMes = limitesDoDia(primeiroDia(mes), fuso).inicio;
  const fimMes = limitesDoDia(primeiroDia(somarMeses(mes, 1)), fuso).inicio;
  const inicioMesAnterior = limitesDoDia(primeiroDia(somarMeses(mes, -1)), fuso).inicio;
  const comparacao = periodoDeComparacao(inicioMesAnterior, inicioMes, fimMes, agora);

  const [recebidos, somaComparacao, fiados, atendidos, profissionais, acertos] = await Promise.all([
    db.pagamento.findMany({
      where: { estabelecimentoId, recebidoEm: { gte: inicioMes, lt: fimMes } },
      select: { id: true, valorCentavos: true, forma: true, formaRecebimento: true, recebidoEm: true, agendamento: DO_AGENDAMENTO },
    }),
    db.pagamento.aggregate({
      where: { estabelecimentoId, recebidoEm: { gte: inicioMesAnterior, lt: comparacao.fimExclusivo } },
      _sum: { valorCentavos: true },
    }),
    db.pagamento.findMany({
      where: { estabelecimentoId, forma: "FIADO", recebidoEm: null },
      select: { id: true, valorCentavos: true, agendamento: DO_AGENDAMENTO },
    }),
    db.agendamento.findMany({
      where: { estabelecimentoId, status: "ATENDIDO", confirmarAte: null, inicio: { gte: inicioMes, lt: fimMes } },
      select: {
        id: true,
        profissionalId: true,
        inicio: true,
        comissaoPercentual: true,
        valorTotalCentavos: true,
        servico: { select: { nome: true, precoCentavos: true } },
        cliente: { select: { nome: true } },
      },
    }),
    db.profissional.findMany({
      where: { estabelecimentoId },
      select: { id: true, nome: true, ativo: true, comissaoPercentual: true },
      orderBy: { nome: "asc" },
    }),
    db.pagamentoComissao.findMany({
      where: { estabelecimentoId, mesReferencia: parametroMes(mes) },
      select: { id: true, profissionalId: true, valorCentavos: true, pagoEm: true, observacao: true },
    }),
  ]);

  const recebimentos: RecebimentoDoMes[] = recebidos.map((p) => ({
    id: p.id,
    valorCentavos: p.valorCentavos,
    forma: p.forma,
    formaRecebimento: p.formaRecebimento,
    // O filtro por `recebidoEm` garante a data; o `?? inicioMes` só acalma o tipo.
    recebidoEm: p.recebidoEm ?? inicioMes,
    clienteNome: p.agendamento.cliente.nome,
    servicoNome: p.agendamento.servico.nome,
    profissionalNome: p.agendamento.profissional.nome,
    atendimentoEm: p.agendamento.inicio,
  }));
  const totalRecebidoCentavos = recebimentos.reduce((soma, r) => soma + r.valorCentavos, 0);
  const comparacaoCentavos = somaComparacao._sum.valorCentavos ?? 0;
  const fiadoPorCliente = agruparFiadoPorCliente(fiados);
  const comissoes = resumirComissoes({ profissionais, atendimentos: atendidos, pagamentos: acertos });
  const atendidoCentavos = atendidos.reduce((soma, a) => soma + valorDoAtendimento(a), 0);

  return {
    recebido: {
      totalCentavos: totalRecebidoCentavos,
      quantidade: recebimentos.length,
      fiadoRecebidoCentavos: recebimentos.filter((r) => r.forma === "FIADO").reduce((soma, r) => soma + r.valorCentavos, 0),
      variacaoPercentual: variacaoPercentual(totalRecebidoCentavos, comparacaoCentavos),
      comparaMesmoPeriodo: comparacao.mesmoPeriodo,
      porForma: somarPorForma(recebimentos),
      dias: entradasPorDia(recebimentos, mes, fuso),
    },
    aReceber: {
      totalCentavos: fiadoPorCliente.reduce((soma, c) => soma + c.totalCentavos, 0),
      porCliente: fiadoPorCliente,
    },
    comissoes: {
      porProfissional: comissoes,
      totais: totaisDasComissoes(comissoes),
    },
    atendido: {
      totalCentavos: atendidoCentavos,
      quantidade: atendidos.length,
    },
    /** Mais de uma profissional ativa: aí as listas dizem quem atendeu. */
    temEquipe: profissionais.filter((p) => p.ativo).length > 1,
  };
}

export type DadosFinanceiro = Awaited<ReturnType<typeof carregarFinanceiro>>;
