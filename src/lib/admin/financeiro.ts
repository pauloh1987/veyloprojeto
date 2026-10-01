/** Contas do financeiro do admin (custos, receita e ponto de equilíbrio). Sem acesso ao banco,
 * para servir também aos componentes do navegador. */

export type MoedaCusto = "BRL" | "USD";
export type FrequenciaCusto = "MENSAL" | "ANUAL" | "POR_MENSAGEM";

export const FREQUENCIAS_CUSTO: { id: FrequenciaCusto; rotulo: string }[] = [
  { id: "MENSAL", rotulo: "Por mês" },
  { id: "ANUAL", rotulo: "Por ano" },
  { id: "POR_MENSAGEM", rotulo: "Por mensagem de WhatsApp" },
];

export const CATEGORIAS_CUSTO = ["Infraestrutura", "Ferramentas", "Mensagens", "Marketing", "Outros"];

export interface CustoParaCalculo {
  valor: number;
  moeda: MoedaCusto;
  frequencia: FrequenciaCusto;
  ativo: boolean;
}

export interface BaseDoCalculo {
  /** Quantos reais vale 1 dólar. */
  cotacaoDolar: number;
  /** Mensagens de WhatsApp enviadas nos últimos 30 dias (base dos custos por mensagem). */
  mensagensWhatsApp30d: number;
}

/** Quanto o custo pesa por mês, em reais. Custo desativado não pesa. */
export function custoMensalEmReais(custo: CustoParaCalculo, base: BaseDoCalculo): number {
  if (!custo.ativo) return 0;
  const emReais = custo.moeda === "USD" ? custo.valor * base.cotacaoDolar : custo.valor;
  if (custo.frequencia === "ANUAL") return emReais / 12;
  if (custo.frequencia === "POR_MENSAGEM") return emReais * base.mensagensWhatsApp30d;
  return emReais;
}

export interface ResumoFinanceiro {
  receitaMensal: number;
  custoMensal: number;
  resultado: number;
  /** Assinantes necessários para a receita cobrir os custos. */
  assinantesParaEquilibrio: number;
  faltamParaEquilibrio: number;
  /** Receita se todos os salões em teste assinassem. */
  receitaPotencial: number;
}

export function resumirFinanceiro(dados: {
  custos: CustoParaCalculo[];
  base: BaseDoCalculo;
  assinantes: number;
  emTeste: number;
  precoMensal: number;
}): ResumoFinanceiro {
  const custoMensal = dados.custos.reduce((total, custo) => total + custoMensalEmReais(custo, dados.base), 0);
  const receitaMensal = dados.assinantes * dados.precoMensal;
  const assinantesParaEquilibrio = custoMensal > 0 ? Math.ceil(custoMensal / dados.precoMensal) : 0;
  return {
    receitaMensal,
    custoMensal,
    resultado: receitaMensal - custoMensal,
    assinantesParaEquilibrio,
    faltamParaEquilibrio: Math.max(0, assinantesParaEquilibrio - dados.assinantes),
    receitaPotencial: (dados.assinantes + dados.emTeste) * dados.precoMensal,
  };
}

/** Lê um valor digitado no formato brasileiro ("1.234,56", "0,013") ou com ponto ("9.5"). */
export function lerValorDigitado(texto: string): number | null {
  const limpo = texto.trim().replace(/^R\$\s*|^US\$\s*/i, "");
  if (!/^\d[\d.,]*$/.test(limpo)) return null;
  const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const valor = Number(normalizado);
  return Number.isFinite(valor) ? valor : null;
}

/** Valor em reais com centavos ("R$ 1.234,56"); com `casas` maior, mostra frações de centavo. */
export function formatarReais(valor: number, casas = 2): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: casas, maximumFractionDigits: casas });
}

/** Nome, endereço ou e-mail com cara de conta de teste ("teste", "test", "demo"). */
export function pareceContaDeTeste(...textos: (string | null | undefined)[]): boolean {
  return textos.some((texto) => texto && /test|demo/i.test(texto));
}
