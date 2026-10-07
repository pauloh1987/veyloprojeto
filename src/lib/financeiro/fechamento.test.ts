import { describe, expect, it } from "vitest";
import { centavosParaCampo, reaisParaCentavos } from "../formatadores";
import {
  dataDoPagamentoNaHora,
  formaDoRecebimento,
  problemaNoPagamento,
  totalDoAtendimento,
  valorDoAtendimento,
} from "./fechamento";

describe("valor digitado em reais", () => {
  it("aceita os jeitos comuns de digitar", () => {
    expect(reaisParaCentavos("130")).toBe(13000);
    expect(reaisParaCentavos("130,5")).toBe(13050);
    expect(reaisParaCentavos("R$ 1.300,50")).toBe(130050);
    expect(reaisParaCentavos("130.50")).toBe(13050);
    expect(reaisParaCentavos("1.300")).toBe(130000);
  });

  it("recusa vazio e texto", () => {
    expect(reaisParaCentavos("")).toBeNull();
    expect(reaisParaCentavos("abc")).toBeNull();
    expect(reaisParaCentavos("10,555")).toBeNull();
  });

  it("volta para o campo com vírgula", () => {
    expect(centavosParaCampo(13050)).toBe("130,50");
  });
});

describe("fechamento do atendimento", () => {
  it("soma o serviço e os adicionais", () => {
    expect(totalDoAtendimento(13000, [{ descricao: "Decoração", valorCentavos: 1000 }])).toBe(14000);
  });

  it("as formas de pagamento têm de fechar o total", () => {
    expect(problemaNoPagamento(14000, [{ forma: "PIX", valorCentavos: 14000 }])).toBeNull();
    expect(problemaNoPagamento(14000, [{ forma: "PIX", valorCentavos: 6000 }, { forma: "FIADO", valorCentavos: 8000 }])).toBeNull();
    expect(problemaNoPagamento(14000, [{ forma: "PIX", valorCentavos: 6000 }])).toContain("Falta");
    expect(problemaNoPagamento(14000, [{ forma: "PIX", valorCentavos: 16000 }])).toContain("passam");
    expect(problemaNoPagamento(14000, [])).toBe("Escolha a forma de pagamento.");
    expect(problemaNoPagamento(14000, [{ forma: "PIX", valorCentavos: 7000 }, { forma: "PIX", valorCentavos: 7000 }])).toContain("uma vez");
  });

  it("atendimento de graça fecha sem forma de pagamento", () => {
    expect(problemaNoPagamento(0, [])).toBeNull();
  });

  it("faturamento usa o valor cobrado e, sem fechamento, o preço do serviço", () => {
    expect(valorDoAtendimento({ valorTotalCentavos: 14000, servico: { precoCentavos: 13000 } })).toBe(14000);
    expect(valorDoAtendimento({ valorTotalCentavos: null, servico: { precoCentavos: 13000 } })).toBe(13000);
  });

  it("fiado recebido conta na forma em que o dinheiro entrou", () => {
    expect(formaDoRecebimento({ forma: "FIADO", formaRecebimento: "PIX" })).toBe("PIX");
    expect(formaDoRecebimento({ forma: "DINHEIRO", formaRecebimento: null })).toBe("DINHEIRO");
  });

  it("pagamento na hora fica na data do atendimento, mesmo finalizado depois", () => {
    const fim = new Date("2026-10-06T21:00:00Z");
    expect(dataDoPagamentoNaHora(fim, new Date("2026-10-07T12:00:00Z"))).toEqual(fim);
    expect(dataDoPagamentoNaHora(fim, new Date("2026-10-06T20:30:00Z"))).toEqual(new Date("2026-10-06T20:30:00Z"));
  });
});
