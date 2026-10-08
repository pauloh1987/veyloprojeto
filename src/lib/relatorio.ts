import { db } from "@/lib/db";
import { limitesDoDia } from "@/lib/tz";
import { mesDoInstante, periodoDeComparacao, somarMeses, type MesAno } from "@/lib/mesRelatorio";
import { clientesSumidas, resumirDesempenho, type DesempenhoDoMes } from "@/lib/relatorio/desempenho";

function primeiroDiaMes({ ano, mes }: MesAno): string {
  return `${ano}-${String(mes).padStart(2, "0")}-01`;
}

const MAXIMO_SUMIDAS = 8;

export interface RelatorioMensal {
  desempenho: DesempenhoDoMes;
  /** Atendimentos do mês anterior usados na comparação: o mês inteiro, ou só o mesmo período
   * quando o mês do relatório ainda está em andamento (`comparaMesmoPeriodo`). */
  atendimentosComparacao: number;
  comparaMesmoPeriodo: boolean;
  variacaoAtendimentos: number | null;
  /** Clientes para chamar de volta, contado a partir de hoje (não do mês escolhido). */
  sumidas: { clienteId: string; nome: string; telefone: string; dias: number }[];
}

/** Primeiro mês que o Relatório deixa ver: o do cadastro ou, se houver agendamento mais
 * antigo que isso, o desse agendamento. */
export async function primeiroMesDoNegocio(
  estabelecimento: { id: string; criadoEm: Date },
  fuso: string,
): Promise<MesAno> {
  const maisAntigo = await db.agendamento.findFirst({
    where: { estabelecimentoId: estabelecimento.id, confirmarAte: null },
    orderBy: { inicio: "asc" },
    select: { inicio: true },
  });
  const desde =
    maisAntigo && maisAntigo.inicio < estabelecimento.criadoEm ? maisAntigo.inicio : estabelecimento.criadoEm;
  return mesDoInstante(desde, fuso);
}

/** Desempenho do mês `mesRef` (no fuso do estabelecimento), com os atendimentos comparados aos do
 * mês anterior (ver `periodoDeComparacao`). O dinheiro que entrou e as comissões ficam em Financeiro. */
export async function calcularRelatorio(estabelecimentoId: string, fuso: string, mesRef: MesAno): Promise<RelatorioMensal> {
  const agora = new Date();
  const inicioMesAtual = limitesDoDia(primeiroDiaMes(mesRef), fuso).inicio;
  const inicioMesAnterior = limitesDoDia(primeiroDiaMes(somarMeses(mesRef, -1)), fuso).inicio;
  const fimMesAtualExclusivo = limitesDoDia(primeiroDiaMes(somarMeses(mesRef, 1)), fuso).inicio;
  const comparacao = periodoDeComparacao(inicioMesAnterior, inicioMesAtual, fimMesAtualExclusivo, agora);

  const [agendamentosDoMes, atendimentosComparacao, visitasPorCliente, comHorarioMarcado] = await Promise.all([
    db.agendamento.findMany({
      where: { estabelecimentoId, inicio: { gte: inicioMesAtual, lt: fimMesAtualExclusivo }, confirmarAte: null },
      include: {
        servico: { select: { nome: true, precoCentavos: true } },
        profissional: { select: { nome: true } },
        cliente: { select: { nome: true } },
      },
    }),
    db.agendamento.count({
      where: { estabelecimentoId, inicio: { gte: inicioMesAnterior, lt: comparacao.fimExclusivo }, status: "ATENDIDO" },
    }),
    db.agendamento.groupBy({
      by: ["clienteId"],
      where: { estabelecimentoId, status: "ATENDIDO" },
      _min: { inicio: true },
      _max: { inicio: true },
    }),
    db.agendamento.findMany({
      where: { estabelecimentoId, inicio: { gte: agora }, status: { in: ["PENDENTE", "CONFIRMADO"] }, confirmarAte: null },
      select: { clienteId: true },
      distinct: ["clienteId"],
    }),
  ]);

  const primeiraVisita = new Map<string, Date>();
  const ultimasVisitas: { clienteId: string; ultima: Date }[] = [];
  for (const v of visitasPorCliente) {
    if (v._min.inicio) primeiraVisita.set(v.clienteId, v._min.inicio);
    if (v._max.inicio) ultimasVisitas.push({ clienteId: v.clienteId, ultima: v._max.inicio });
  }

  const desempenho = resumirDesempenho(agendamentosDoMes, fuso, primeiraVisita, inicioMesAtual);
  const sumidasIds = clientesSumidas(ultimasVisitas, new Set(comHorarioMarcado.map((a) => a.clienteId)), agora).slice(0, MAXIMO_SUMIDAS);
  const dadosSumidas = await db.cliente.findMany({
    where: { id: { in: sumidasIds.map((s) => s.clienteId) } },
    select: { id: true, nome: true, telefone: true },
  });
  const porId = new Map(dadosSumidas.map((c) => [c.id, c]));

  return {
    desempenho,
    atendimentosComparacao,
    comparaMesmoPeriodo: comparacao.mesmoPeriodo,
    variacaoAtendimentos:
      atendimentosComparacao === 0 ? null : ((desempenho.atendimentos - atendimentosComparacao) / atendimentosComparacao) * 100,
    sumidas: sumidasIds.flatMap((s) => {
      const cliente = porId.get(s.clienteId);
      return cliente ? [{ clienteId: s.clienteId, nome: cliente.nome, telefone: cliente.telefone, dias: s.dias }] : [];
    }),
  };
}
