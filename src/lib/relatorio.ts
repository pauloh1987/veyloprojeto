import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { paraDataYMD, limitesDoDia } from "@/lib/tz";

function primeiroDiaMes(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-01`;
}

export interface RelatorioMensal {
  faturamentoMesAtualCentavos: number;
  faturamentoMesAnteriorCentavos: number;
  variacaoPercentual: number | null;
  servicoMaisVendido: { nome: string; qtd: number } | null;
  taxaFalta: number | null;
  horariosMaisProcurados: { hora: number; qtd: number }[];
  faturamentoPorDiaCentavos: number[];
  mesReferencia: string;
}

export async function calcularRelatorio(estabelecimentoId: string, fuso: string): Promise<RelatorioMensal> {
  const hojeYMD = paraDataYMD(new Date(), fuso);
  const [anoStr, mesStr] = hojeYMD.split("-");
  const ano = Number(anoStr);
  const mes = Number(mesStr);

  const anoPrev = mes === 1 ? ano - 1 : ano;
  const mesPrev = mes === 1 ? 12 : mes - 1;
  const anoNext = mes === 12 ? ano + 1 : ano;
  const mesNext = mes === 12 ? 1 : mes + 1;

  const inicioMesAtual = limitesDoDia(primeiroDiaMes(ano, mes), fuso).inicio;
  const inicioMesAnterior = limitesDoDia(primeiroDiaMes(anoPrev, mesPrev), fuso).inicio;
  const fimMesAtualExclusivo = limitesDoDia(primeiroDiaMes(anoNext, mesNext), fuso).inicio;

  const [agendamentosMesAtual, agendamentosMesAnterior] = await Promise.all([
    db.agendamento.findMany({
      where: { estabelecimentoId, inicio: { gte: inicioMesAtual, lt: fimMesAtualExclusivo } },
      include: { servico: true },
    }),
    db.agendamento.findMany({
      where: {
        estabelecimentoId,
        inicio: { gte: inicioMesAnterior, lt: inicioMesAtual },
        status: "ATENDIDO",
      },
      include: { servico: true },
    }),
  ]);

  const atendidosMesAtual = agendamentosMesAtual.filter((a) => a.status === "ATENDIDO");
  const faturamentoMesAtualCentavos = atendidosMesAtual.reduce((soma, a) => soma + a.servico.precoCentavos, 0);
  const faturamentoMesAnteriorCentavos = agendamentosMesAnterior.reduce((soma, a) => soma + a.servico.precoCentavos, 0);
  const variacaoPercentual =
    faturamentoMesAnteriorCentavos === 0
      ? null
      : ((faturamentoMesAtualCentavos - faturamentoMesAnteriorCentavos) / faturamentoMesAnteriorCentavos) * 100;

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

  const diasNoMes = new Date(ano, mes, 0).getDate();
  const faturamentoPorDiaCentavos = Array.from({ length: diasNoMes }, () => 0);
  for (const a of atendidosMesAtual) {
    const dia = Number(formatInTimeZone(a.inicio, fuso, "d"));
    faturamentoPorDiaCentavos[dia - 1] += a.servico.precoCentavos;
  }

  return {
    faturamentoMesAtualCentavos,
    faturamentoMesAnteriorCentavos,
    variacaoPercentual,
    servicoMaisVendido,
    taxaFalta,
    horariosMaisProcurados,
    faturamentoPorDiaCentavos,
    mesReferencia: hojeYMD,
  };
}
