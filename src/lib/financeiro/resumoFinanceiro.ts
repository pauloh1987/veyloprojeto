import type { FormaPagamento } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { paraDataYMD } from "../tz";
import type { MesAno } from "../mesRelatorio";
import { formatarCentavos } from "../formatadores";
import { FORMAS_PAGAMENTO, formaDoRecebimento } from "./fechamento";

/**
 * Contas da tela Financeiro sem banco (para dar para testar): o fiado em aberto agrupado por
 * cliente, o dinheiro que entrou por forma de pagamento e por dia, e a escala do gráfico.
 */

export interface FiadoAberto {
  id: string;
  valorCentavos: number;
  agendamento: {
    inicio: Date;
    clienteId: string;
    cliente: { nome: string; telefone: string };
    servico: { nome: string };
    profissional: { nome: string };
  };
}

export interface ItemFiado {
  pagamentoId: string;
  valorCentavos: number;
  inicio: Date;
  servicoNome: string;
  profissionalNome: string;
}

export interface FiadoDoCliente {
  clienteId: string;
  nome: string;
  telefone: string;
  totalCentavos: number;
  /** Dia do atendimento mais antigo ainda em aberto. */
  desde: Date;
  /** Do atendimento mais antigo ao mais recente. */
  itens: ItemFiado[];
}

/** Fiado em aberto por cliente, quem deve há mais tempo primeiro. */
export function agruparFiadoPorCliente(fiados: FiadoAberto[]): FiadoDoCliente[] {
  const porCliente = new Map<string, FiadoDoCliente>();
  for (const fiado of fiados) {
    const { agendamento } = fiado;
    const grupo = porCliente.get(agendamento.clienteId) ?? {
      clienteId: agendamento.clienteId,
      nome: agendamento.cliente.nome,
      telefone: agendamento.cliente.telefone,
      totalCentavos: 0,
      desde: agendamento.inicio,
      itens: [],
    };
    grupo.totalCentavos += fiado.valorCentavos;
    grupo.itens.push({
      pagamentoId: fiado.id,
      valorCentavos: fiado.valorCentavos,
      inicio: agendamento.inicio,
      servicoNome: agendamento.servico.nome,
      profissionalNome: agendamento.profissional.nome,
    });
    porCliente.set(agendamento.clienteId, grupo);
  }
  const grupos = [...porCliente.values()];
  for (const grupo of grupos) {
    grupo.itens.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
    grupo.desde = grupo.itens[0].inicio;
  }
  return grupos.sort((a, b) => a.desde.getTime() - b.desde.getTime() || b.totalCentavos - a.totalCentavos);
}

/** Cobrança do fiado para a dona mandar do WhatsApp dela: um valor só ou a lista, com o total. */
export function textoCobrancaFiado(fiado: Pick<FiadoDoCliente, "nome" | "totalCentavos" | "itens">, fuso: string): string {
  const primeiroNome = fiado.nome.trim().split(/\s+/)[0] ?? "";
  const dia = (data: Date) => formatInTimeZone(data, fuso, "dd/MM");
  if (fiado.itens.length === 1) {
    const [item] = fiado.itens;
    return (
      `Oi, ${primeiroNome}! Tudo bem? Passando para lembrar do valor de ${formatarCentavos(item.valorCentavos)} ` +
      `do seu atendimento de ${item.servicoNome} no dia ${dia(item.inicio)}. Quando puder, me avisa por aqui.`
    );
  }
  return [
    `Oi, ${primeiroNome}! Tudo bem? Passando para lembrar dos valores em aberto dos seus atendimentos:`,
    ...fiado.itens.map((item) => `• ${item.servicoNome} (${dia(item.inicio)}): ${formatarCentavos(item.valorCentavos)}`),
    `Total: ${formatarCentavos(fiado.totalCentavos)}. Quando puder, me avisa por aqui.`,
  ].join("\n");
}

/** Um pagamento que entrou no caixa (na hora ou fiado recebido). */
export interface Recebimento {
  valorCentavos: number;
  forma: FormaPagamento;
  formaRecebimento: FormaPagamento | null;
  recebidoEm: Date;
}

export interface TotalPorForma {
  forma: FormaPagamento;
  valorCentavos: number;
  quantidade: number;
}

/** Quanto entrou em cada forma (fiado recebido conta na forma em que foi pago), da maior para a
 * menor; formas sem entrada ficam de fora. */
export function somarPorForma(recebimentos: Recebimento[]): TotalPorForma[] {
  const totais = new Map<FormaPagamento, TotalPorForma>();
  for (const r of recebimentos) {
    const forma = formaDoRecebimento(r);
    const total = totais.get(forma) ?? { forma, valorCentavos: 0, quantidade: 0 };
    total.valorCentavos += r.valorCentavos;
    total.quantidade++;
    totais.set(forma, total);
  }
  const ordem = FORMAS_PAGAMENTO.map((f) => f.forma);
  return [...totais.values()].sort((a, b) => b.valorCentavos - a.valorCentavos || ordem.indexOf(a.forma) - ordem.indexOf(b.forma));
}

export interface DiaDeEntradas<R extends Recebimento> {
  dataYMD: string;
  totalCentavos: number;
  porForma: TotalPorForma[];
  /** Do mais recente ao mais antigo. */
  recebimentos: R[];
}

/** O que entrou em cada dia do mês, no fuso do salão. Vem um item por dia, do dia 1 ao último,
 * com os dias sem entrada zerados (o gráfico mostra o mês inteiro). */
export function entradasPorDia<R extends Recebimento>(recebimentos: R[], mes: MesAno, fuso: string): DiaDeEntradas<R>[] {
  const porDia = new Map<string, R[]>();
  for (const r of recebimentos) {
    const dia = paraDataYMD(r.recebidoEm, fuso);
    const lista = porDia.get(dia) ?? [];
    lista.push(r);
    porDia.set(dia, lista);
  }
  const diasNoMes = new Date(Date.UTC(mes.ano, mes.mes, 0)).getUTCDate();
  const prefixo = `${mes.ano}-${String(mes.mes).padStart(2, "0")}`;
  return Array.from({ length: diasNoMes }, (_, i) => {
    const dataYMD = `${prefixo}-${String(i + 1).padStart(2, "0")}`;
    const doDia = [...(porDia.get(dataYMD) ?? [])].sort((a, b) => b.recebidoEm.getTime() - a.recebidoEm.getTime());
    return {
      dataYMD,
      totalCentavos: doDia.reduce((soma, r) => soma + r.valorCentavos, 0),
      porForma: somarPorForma(doDia),
      recebimentos: doDia,
    };
  });
}

/** Variação em % de um valor contra o do período anterior; null quando não há base (anterior zero). */
export function variacaoPercentual(atual: number, anterior: number): number | null {
  return anterior === 0 ? null : ((atual - anterior) / anterior) * 100;
}

/** Topo redondo do eixo do gráfico, logo acima do maior valor: 1; 2; 2,5 ou 5 vezes uma potência
 * de 10, em reais (R$ 820 -> R$ 1.000; R$ 1.300 -> R$ 2.000). Zero sem valores. */
export function tetoDoGrafico(maiorCentavos: number): number {
  if (maiorCentavos <= 0) return 0;
  const reais = maiorCentavos / 100;
  const potencia = 10 ** Math.floor(Math.log10(reais));
  const passo = [1, 2, 2.5, 5].find((p) => p * potencia >= reais) ?? 10;
  return Math.round(passo * potencia * 100);
}
