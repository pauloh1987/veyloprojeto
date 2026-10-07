import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { limitesDoDia } from "@/lib/tz";
import { mesDoInstante, periodoDeComparacao, somarMeses, type MesAno } from "@/lib/mesRelatorio";

function primeiroDiaMes({ ano, mes }: MesAno): string {
  return `${ano}-${String(mes).padStart(2, "0")}-01`;
}

export interface RelatorioMensal {
  faturamentoMesAtualCentavos: number;
  /** Faturamento do mês anterior usado na comparação: inteiro, ou só o mesmo período quando o
   * mês do relatório ainda está em andamento (`comparaMesmoPeriodo`). */
  faturamentoComparacaoCentavos: number;
  comparaMesmoPeriodo: boolean;
  variacaoPercentual: number | null;
  servicoMaisVendido: { nome: string; qtd: number } | null;
  taxaFalta: number | null;
  horariosMaisProcurados: { hora: number; qtd: number }[];
  faturamentoPorDiaCentavos: number[];
  comissoesPorProfissional: {
    profissionalId: string;
    nome: string;
    faturamentoCentavos: number;
    comissao: { percentual: number; centavos: number } | null;
  }[];
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

/** Números do mês `mesRef` (no fuso do estabelecimento), com o faturamento comparado ao do mês
 * anterior a ele (ver `periodoDeComparacao`). */
export async function calcularRelatorio(estabelecimentoId: string, fuso: string, mesRef: MesAno): Promise<RelatorioMensal> {
  const { ano, mes } = mesRef;
  const inicioMesAtual = limitesDoDia(primeiroDiaMes(mesRef), fuso).inicio;
  const inicioMesAnterior = limitesDoDia(primeiroDiaMes(somarMeses(mesRef, -1)), fuso).inicio;
  const fimMesAtualExclusivo = limitesDoDia(primeiroDiaMes(somarMeses(mesRef, 1)), fuso).inicio;
  const comparacao = periodoDeComparacao(inicioMesAnterior, inicioMesAtual, fimMesAtualExclusivo, new Date());

  const [agendamentosMesAtual, agendamentosComparacao] = await Promise.all([
    db.agendamento.findMany({
      where: { estabelecimentoId, inicio: { gte: inicioMesAtual, lt: fimMesAtualExclusivo }, confirmarAte: null },
      include: { servico: true, profissional: { select: { id: true, nome: true, comissaoPercentual: true } } },
    }),
    db.agendamento.findMany({
      where: {
        estabelecimentoId,
        inicio: { gte: inicioMesAnterior, lt: comparacao.fimExclusivo },
        status: "ATENDIDO",
      },
      include: { servico: true },
    }),
  ]);

  const atendidosMesAtual = agendamentosMesAtual.filter((a) => a.status === "ATENDIDO");
  const faturamentoMesAtualCentavos = atendidosMesAtual.reduce((soma, a) => soma + a.servico.precoCentavos, 0);
  const faturamentoComparacaoCentavos = agendamentosComparacao.reduce((soma, a) => soma + a.servico.precoCentavos, 0);
  const variacaoPercentual =
    faturamentoComparacaoCentavos === 0
      ? null
      : ((faturamentoMesAtualCentavos - faturamentoComparacaoCentavos) / faturamentoComparacaoCentavos) * 100;

  const contagemServico = new Map<string, { nome: string; qtd: number }>();
  for (const a of atendidosMesAtual) {
    const atual = contagemServico.get(a.servicoId) ?? { nome: a.servico.nome, qtd: 0 };
    atual.qtd++;
    contagemServico.set(a.servicoId, atual);
  }
  const servicoMaisVendido = [...contagemServico.values()].sort((a, b) => b.qtd - a.qtd)[0] ?? null;

  const concluidos = agendamentosMesAtual.filter((a) => a.status === "ATENDIDO" || a.status === "FALTOU");
  const faltas = agendamentosMesAtual.filter((a) => a.status === "FALTOU").length;
  const taxaFalta = concluidos.length === 0 ? null : (faltas / concluidos.length) * 100;

  const naoCancelados = agendamentosMesAtual.filter((a) => a.status !== "CANCELADO");
  const contagemHora = new Map<number, number>();
  for (const a of naoCancelados) {
    const hora = Number(formatInTimeZone(a.inicio, fuso, "H"));
    contagemHora.set(hora, (contagemHora.get(hora) ?? 0) + 1);
  }
  const horariosMaisProcurados = [...contagemHora.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([hora, qtd]) => ({ hora, qtd }));

  const porProfissional = new Map<
    string,
    { nome: string; comissaoPercentual: number | null; faturamentoCentavos: number }
  >();
  for (const a of atendidosMesAtual) {
    const atual = porProfissional.get(a.profissionalId) ?? {
      nome: a.profissional.nome,
      comissaoPercentual: a.profissional.comissaoPercentual,
      faturamentoCentavos: 0,
    };
    atual.faturamentoCentavos += a.servico.precoCentavos;
    porProfissional.set(a.profissionalId, atual);
  }
  const comissoesPorProfissional = [...porProfissional.entries()]
    .map(([profissionalId, dados]) => ({
      profissionalId,
      nome: dados.nome,
      faturamentoCentavos: dados.faturamentoCentavos,
      comissao:
        dados.comissaoPercentual === null
          ? null
          : { percentual: dados.comissaoPercentual, centavos: Math.round((dados.faturamentoCentavos * dados.comissaoPercentual) / 100) },
    }))
    .sort((a, b) => b.faturamentoCentavos - a.faturamentoCentavos);

  const diasNoMes = new Date(ano, mes, 0).getDate();
  const faturamentoPorDiaCentavos = Array.from({ length: diasNoMes }, () => 0);
  for (const a of atendidosMesAtual) {
    const dia = Number(formatInTimeZone(a.inicio, fuso, "d"));
    faturamentoPorDiaCentavos[dia - 1] += a.servico.precoCentavos;
  }

  return {
    faturamentoMesAtualCentavos,
    faturamentoComparacaoCentavos,
    comparaMesmoPeriodo: comparacao.mesmoPeriodo,
    variacaoPercentual,
    servicoMaisVendido,
    taxaFalta,
    horariosMaisProcurados,
    faturamentoPorDiaCentavos,
    comissoesPorProfissional,
  };
}
