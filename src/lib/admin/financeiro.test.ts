import { describe, expect, it } from "vitest";
import { custoMensalEmReais, lerValorDigitado, pareceContaDeTeste, resumirFinanceiro } from "./financeiro";

const BASE = { cotacaoDolar: 5, mensagensWhatsApp30d: 1000 };

describe("financeiro do admin", () => {
  it("converte cada tipo de custo para reais por mês", () => {
    expect(custoMensalEmReais({ valor: 110, moeda: "BRL", frequencia: "MENSAL", ativo: true }, BASE)).toBe(110);
    expect(custoMensalEmReais({ valor: 9, moeda: "USD", frequencia: "MENSAL", ativo: true }, BASE)).toBe(45);
    expect(custoMensalEmReais({ valor: 120, moeda: "BRL", frequencia: "ANUAL", ativo: true }, BASE)).toBe(10);
    expect(custoMensalEmReais({ valor: 0.01, moeda: "USD", frequencia: "POR_MENSAGEM", ativo: true }, BASE)).toBeCloseTo(50);
  });

  it("custo desativado não entra na conta", () => {
    expect(custoMensalEmReais({ valor: 110, moeda: "BRL", frequencia: "MENSAL", ativo: false }, BASE)).toBe(0);
  });

  it("calcula resultado e quantos assinantes faltam para empatar", () => {
    const resumo = resumirFinanceiro({
      custos: [
        { valor: 110, moeda: "BRL", frequencia: "MENSAL", ativo: true },
        { valor: 9, moeda: "USD", frequencia: "MENSAL", ativo: true },
      ],
      base: BASE,
      assinantes: 1,
      emTeste: 3,
      precoMensal: 89,
    });
    expect(resumo).toEqual({
      receitaMensal: 89,
      custoMensal: 155,
      resultado: -66,
      assinantesParaEquilibrio: 2,
      faltamParaEquilibrio: 1,
      receitaPotencial: 356,
    });
  });

  it("sem custos, nada falta para empatar", () => {
    const resumo = resumirFinanceiro({ custos: [], base: BASE, assinantes: 0, emTeste: 0, precoMensal: 89 });
    expect(resumo.assinantesParaEquilibrio).toBe(0);
    expect(resumo.faltamParaEquilibrio).toBe(0);
  });

  it("lê valores digitados no formato brasileiro ou com ponto", () => {
    expect(lerValorDigitado("110,00")).toBe(110);
    expect(lerValorDigitado("1.234,56")).toBe(1234.56);
    expect(lerValorDigitado("0,013")).toBe(0.013);
    expect(lerValorDigitado("9.5")).toBe(9.5);
    expect(lerValorDigitado("R$ 40")).toBe(40);
    expect(lerValorDigitado("abc")).toBeNull();
    expect(lerValorDigitado("")).toBeNull();
  });

  it("reconhece conta com cara de teste", () => {
    expect(pareceContaDeTeste("Studio Teste Guia")).toBe(true);
    expect(pareceContaDeTeste("Salão Maria", "salao-maria", "demo@exemplo.com")).toBe(true);
    expect(pareceContaDeTeste("Studio Bela Unha", "studio-bela-unha", "ana@exemplo.com")).toBe(false);
  });
});
