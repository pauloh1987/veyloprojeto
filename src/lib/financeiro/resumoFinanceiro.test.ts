import { describe, expect, it } from "vitest";
import {
  agruparFiadoPorCliente,
  entradasPorDia,
  somarPorForma,
  tetoDoGrafico,
  textoCobrancaFiado,
  variacaoPercentual,
  type FiadoAberto,
  type Recebimento,
} from "./resumoFinanceiro";

const FUSO = "America/Recife";

function fiado(id: string, clienteId: string, nome: string, inicioIso: string, valorCentavos: number): FiadoAberto {
  return {
    id,
    valorCentavos,
    agendamento: {
      inicio: new Date(inicioIso),
      clienteId,
      cliente: { nome, telefone: "81999990000" },
      servico: { nome: "Esmaltação" },
      profissional: { nome: "Ana" },
    },
  };
}

describe("fiado em aberto por cliente", () => {
  it("junta os atendimentos da mesma cliente e põe quem deve há mais tempo primeiro", () => {
    const grupos = agruparFiadoPorCliente([
      fiado("p1", "maria", "Maria", "2026-10-02T13:00:00Z", 3500),
      fiado("p2", "joana", "Joana", "2026-09-20T13:00:00Z", 5500),
      fiado("p3", "maria", "Maria", "2026-09-28T13:00:00Z", 4500),
    ]);
    expect(grupos.map((g) => g.clienteId)).toEqual(["joana", "maria"]);
    const maria = grupos[1];
    expect(maria.totalCentavos).toBe(8000);
    expect(maria.itens.map((i) => i.pagamentoId)).toEqual(["p3", "p1"]);
    expect(maria.desde).toEqual(new Date("2026-09-28T13:00:00Z"));
  });

  it("sem fiado, lista vazia", () => {
    expect(agruparFiadoPorCliente([])).toEqual([]);
  });

  it("cobra um valor só ou a lista com o total", () => {
    const [umSo] = agruparFiadoPorCliente([fiado("p1", "maria", "Maria Eduarda", "2026-10-02T13:00:00Z", 3500)]);
    const texto = textoCobrancaFiado(umSo, FUSO);
    expect(texto).toContain("Oi, Maria!");
    expect(texto).toContain("do seu atendimento de Esmaltação no dia 02/10");

    const [varios] = agruparFiadoPorCliente([
      fiado("p1", "maria", "Maria", "2026-10-02T13:00:00Z", 3500),
      fiado("p2", "maria", "Maria", "2026-09-20T13:00:00Z", 5500),
    ]);
    const linhas = textoCobrancaFiado(varios, FUSO).split("\n");
    expect(linhas).toHaveLength(4);
    expect(linhas[1]).toContain("Esmaltação (20/09)");
    expect(linhas[3]).toMatch(/^Total: R\$\s90,00\./);
  });
});

function recebido(valorCentavos: number, forma: Recebimento["forma"], recebidoEmIso: string, formaRecebimento: Recebimento["formaRecebimento"] = null) {
  return { valorCentavos, forma, formaRecebimento, recebidoEm: new Date(recebidoEmIso) };
}

describe("dinheiro que entrou", () => {
  it("soma por forma, com o fiado recebido na forma em que foi pago", () => {
    expect(
      somarPorForma([
        recebido(3000, "PIX", "2026-10-02T13:00:00Z"),
        recebido(2000, "FIADO", "2026-10-03T13:00:00Z", "PIX"),
        recebido(4000, "DINHEIRO", "2026-10-03T14:00:00Z"),
      ]),
    ).toEqual([
      { forma: "PIX", valorCentavos: 5000, quantidade: 2 },
      { forma: "DINHEIRO", valorCentavos: 4000, quantidade: 1 },
    ]);
  });

  it("separa por dia no fuso do salão e traz todos os dias do mês", () => {
    const dias = entradasPorDia(
      [
        // 23h30 de 1º de outubro em Recife (02h30 UTC do dia 2) ainda é dia 1.
        recebido(3000, "PIX", "2026-10-02T02:30:00Z"),
        recebido(2000, "DINHEIRO", "2026-10-01T15:00:00Z"),
        recebido(5000, "CREDITO", "2026-10-15T15:00:00Z"),
      ],
      { ano: 2026, mes: 10 },
      FUSO,
    );
    expect(dias).toHaveLength(31);
    expect(dias[0].dataYMD).toBe("2026-10-01");
    expect(dias[0].totalCentavos).toBe(5000);
    expect(dias[0].recebimentos.map((r) => r.valorCentavos)).toEqual([3000, 2000]);
    expect(dias[1].totalCentavos).toBe(0);
    expect(dias[14].porForma).toEqual([{ forma: "CREDITO", valorCentavos: 5000, quantidade: 1 }]);
  });

  it("fevereiro tem 28 dias", () => {
    expect(entradasPorDia([], { ano: 2026, mes: 2 }, FUSO)).toHaveLength(28);
  });

  it("compara com o período anterior", () => {
    expect(variacaoPercentual(15000, 10000)).toBe(50);
    expect(variacaoPercentual(5000, 10000)).toBe(-50);
    expect(variacaoPercentual(5000, 0)).toBeNull();
  });
});

describe("escala do gráfico", () => {
  it("arredonda o topo para um valor redondo acima do maior dia", () => {
    expect(tetoDoGrafico(82000)).toBe(100000);
    expect(tetoDoGrafico(130000)).toBe(200000);
    expect(tetoDoGrafico(21000)).toBe(25000);
    expect(tetoDoGrafico(45000)).toBe(50000);
    expect(tetoDoGrafico(100000)).toBe(100000);
    expect(tetoDoGrafico(0)).toBe(0);
  });
});
