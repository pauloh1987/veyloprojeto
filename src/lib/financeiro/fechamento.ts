import type { FormaPagamento } from "@prisma/client";
import { formatarCentavos } from "../formatadores";

/**
 * Fechamento do atendimento (janela "Finalizar atendimento"): valor do serviço, adicionais e como
 * foi pago. Fiado fica a receber em Financeiro até a dona marcar como pago. Regras sem banco, para
 * dar para testar; quem grava é src/lib/acoes/financeiro.ts.
 */

export const FORMAS_PAGAMENTO: { forma: FormaPagamento; rotulo: string }[] = [
  { forma: "PIX", rotulo: "Pix" },
  { forma: "DINHEIRO", rotulo: "Dinheiro" },
  { forma: "CREDITO", rotulo: "Crédito" },
  { forma: "DEBITO", rotulo: "Débito" },
  { forma: "FIADO", rotulo: "Pagar depois" },
];

/** Formas em que o dinheiro entra de fato (para receber um fiado). */
export const FORMAS_DE_RECEBIMENTO = FORMAS_PAGAMENTO.filter((f) => f.forma !== "FIADO");

export function rotuloForma(forma: FormaPagamento): string {
  return FORMAS_PAGAMENTO.find((f) => f.forma === forma)?.rotulo ?? forma;
}

export interface ItemAdicional {
  descricao: string;
  valorCentavos: number;
}

export interface LinhaPagamento {
  forma: FormaPagamento;
  valorCentavos: number;
}

export function totalDoAtendimento(valorServicoCentavos: number, adicionais: ItemAdicional[]): number {
  return adicionais.reduce((soma, item) => soma + item.valorCentavos, valorServicoCentavos);
}

/** Confere se as formas de pagamento fecham o total; devolve o problema em português, ou null.
 * Atendimento de graça (total zero) fecha sem forma de pagamento. */
export function problemaNoPagamento(totalCentavos: number, pagamentos: LinhaPagamento[]): string | null {
  if (pagamentos.length === 0) return totalCentavos === 0 ? null : "Escolha a forma de pagamento.";
  if (pagamentos.some((p) => p.valorCentavos <= 0)) return "Coloque o valor de cada forma de pagamento.";
  if (new Set(pagamentos.map((p) => p.forma)).size !== pagamentos.length) return "Use cada forma de pagamento uma vez só.";
  const soma = pagamentos.reduce((total, p) => total + p.valorCentavos, 0);
  if (soma < totalCentavos) return `Falta ${formatarCentavos(totalCentavos - soma)} para fechar o total.`;
  if (soma > totalCentavos) return `As formas de pagamento passam ${formatarCentavos(soma - totalCentavos)} do total.`;
  return null;
}

/** O que conta no faturamento: o valor cobrado no fechamento ou, em atendimento finalizado antes do
 * fechamento existir, o preço do serviço. */
export function valorDoAtendimento(agendamento: { valorTotalCentavos: number | null; servico: { precoCentavos: number } }): number {
  return agendamento.valorTotalCentavos ?? agendamento.servico.precoCentavos;
}

/** Forma em que o dinheiro entrou de fato: fiado recebido conta na forma usada para pagar. */
export function formaDoRecebimento(pagamento: { forma: FormaPagamento; formaRecebimento: FormaPagamento | null }): FormaPagamento {
  return pagamento.forma === "FIADO" ? (pagamento.formaRecebimento ?? "FIADO") : pagamento.forma;
}

/** Data do pagamento feito na hora: o fim do atendimento (quem finaliza no dia seguinte não joga o
 * dinheiro para o outro dia), ou agora, se ele foi finalizado antes de acabar. */
export function dataDoPagamentoNaHora(fimDoAtendimento: Date, agora: Date = new Date()): Date {
  return fimDoAtendimento.getTime() < agora.getTime() ? fimDoAtendimento : agora;
}
