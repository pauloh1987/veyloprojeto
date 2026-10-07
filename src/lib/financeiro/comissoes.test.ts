import { describe, expect, it } from "vitest";
import {
  percentualDaComissao,
  resumirComissoes,
  rotuloPercentuais,
  somarComissoes,
  textoResumoComissao,
  totaisDasComissoes,
  valorDaComissao,
  type AtendimentoParaComissao,
  type ProfissionalParaComissao,
} from "./comissoes";

const ANA: ProfissionalParaComissao = { id: "ana", nome: "Ana", ativo: true, comissaoPercentual: 40 };
const BIA: ProfissionalParaComissao = { id: "bia", nome: "Bia", ativo: true, comissaoPercentual: null };
const CAU: ProfissionalParaComissao = { id: "cau", nome: "Cau", ativo: true, comissaoPercentual: 50 };

function atendimento(
  profissionalId: string,
  dia: number,
  valorTotalCentavos: number | null,
  comissaoPercentual: number | null = null,
): AtendimentoParaComissao {
  return {
    id: `${profissionalId}-${dia}`,
    profissionalId,
    inicio: new Date(`2026-10-${String(dia).padStart(2, "0")}T13:00:00Z`),
    comissaoPercentual,
    valorTotalCentavos,
    servico: { nome: "Esmaltação", precoCentavos: 3500 },
    cliente: { nome: "Maria" },
  };
}

describe("percentual e valor da comissão", () => {
  it("vale o percentual guardado no atendimento e, sem ele, o atual da profissional", () => {
    expect(percentualDaComissao({ comissaoPercentual: 30 }, { comissaoPercentual: 40 })).toBe(30);
    expect(percentualDaComissao({ comissaoPercentual: null }, { comissaoPercentual: 40 })).toBe(40);
    expect(percentualDaComissao({ comissaoPercentual: null }, { comissaoPercentual: null })).toBeNull();
  });

  it("arredonda cada atendimento ao centavo", () => {
    expect(valorDaComissao(3500, 40)).toBe(1400);
    expect(valorDaComissao(3333, 50)).toBe(1667);
  });

  it("soma só quem tem percentual e lista os percentuais usados", () => {
    expect(
      somarComissoes([
        { valorCentavos: 10000, percentual: 40 },
        { valorCentavos: 5000, percentual: 50 },
        { valorCentavos: 9000, percentual: null },
      ]),
    ).toEqual({ centavos: 6500, percentuais: [40, 50], temComissao: true });
    expect(somarComissoes([{ valorCentavos: 9000, percentual: null }])).toEqual({ centavos: 0, percentuais: [], temComissao: false });
  });

  it("escreve os percentuais do mês", () => {
    expect(rotuloPercentuais([40])).toBe("40%");
    expect(rotuloPercentuais([40, 50])).toBe("40% e 50%");
    expect(rotuloPercentuais([30, 40, 50])).toBe("30%, 40% e 50%");
  });
});

describe("comissões do mês por profissional", () => {
  it("calcula a comissão sobre o valor cobrado e desconta o que já foi pago", () => {
    const [ana] = resumirComissoes({
      profissionais: [ANA],
      atendimentos: [atendimento("ana", 2, 10000), atendimento("ana", 5, 5000)],
      pagamentos: [{ id: "p1", profissionalId: "ana", valorCentavos: 2000, pagoEm: new Date("2026-10-06T15:00:00Z"), observacao: "vale" }],
    });
    expect(ana.baseCentavos).toBe(15000);
    expect(ana.comissaoCentavos).toBe(6000);
    expect(ana.pagoCentavos).toBe(2000);
    expect(ana.faltaCentavos).toBe(4000);
    expect(ana.pagoAMaisCentavos).toBe(0);
    expect(ana.percentuais).toEqual([40]);
  });

  it("atendimento finalizado antes do fechamento usa o preço do serviço", () => {
    const [ana] = resumirComissoes({ profissionais: [ANA], atendimentos: [atendimento("ana", 2, null)], pagamentos: [] });
    expect(ana.baseCentavos).toBe(3500);
    expect(ana.comissaoCentavos).toBe(1400);
  });

  it("a comissão de um atendimento já finalizado não muda quando o percentual dela muda", () => {
    const anaAgora50 = { ...ANA, comissaoPercentual: 50 };
    const [ana] = resumirComissoes({
      profissionais: [anaAgora50],
      atendimentos: [atendimento("ana", 2, 10000, 40), atendimento("ana", 20, 10000)],
      pagamentos: [],
    });
    expect(ana.comissaoCentavos).toBe(4000 + 5000);
    expect(ana.percentuais).toEqual([40, 50]);
  });

  it("pago acima da comissão aparece como pago a mais, sem falta negativa", () => {
    const [ana] = resumirComissoes({
      profissionais: [ANA],
      atendimentos: [atendimento("ana", 2, 5000)],
      pagamentos: [{ id: "p1", profissionalId: "ana", valorCentavos: 3000, pagoEm: new Date("2026-10-03T15:00:00Z"), observacao: "" }],
    });
    expect(ana.faltaCentavos).toBe(0);
    expect(ana.pagoAMaisCentavos).toBe(1000);
  });

  it("entra quem atendeu, quem recebeu acerto e quem está ativa com comissão; comissionadas primeiro", () => {
    const inativaSemNada = { id: "ex", nome: "Ex", ativo: false, comissaoPercentual: 40 };
    const lista = resumirComissoes({
      profissionais: [BIA, ANA, CAU, inativaSemNada],
      atendimentos: [atendimento("bia", 3, 20000), atendimento("ana", 4, 10000)],
      pagamentos: [],
    });
    expect(lista.map((r) => r.profissionalId)).toEqual(["ana", "cau", "bia"]);
    const bia = lista.find((r) => r.profissionalId === "bia");
    expect(bia?.temComissao).toBe(false);
    expect(bia?.comissaoCentavos).toBe(0);
    const cau = lista.find((r) => r.profissionalId === "cau");
    expect(cau?.atendimentos).toHaveLength(0);
    expect(cau?.temComissao).toBe(true);
  });

  it("monta o resumo para mandar à profissional", () => {
    const [ana] = resumirComissoes({
      profissionais: [ANA],
      atendimentos: [atendimento("ana", 2, 10000), atendimento("ana", 5, 5000)],
      pagamentos: [{ id: "p1", profissionalId: "ana", valorCentavos: 2000, pagoEm: new Date("2026-10-06T15:00:00Z"), observacao: "vale" }],
    });
    const linhas = textoResumoComissao(ana, "outubro de 2026", "America/Recife").split("\n");
    expect(linhas[0]).toBe("Comissão de outubro de 2026 – Ana");
    expect(linhas[1]).toMatch(/^2 atendimentos: R\$\s150,00$/);
    expect(linhas[2]).toMatch(/^Comissão \(40%\): R\$\s60,00$/);
    expect(linhas).toContainEqual(expect.stringMatching(/^• 06\/10: R\$\s20,00 \(vale\)$/));
    expect(linhas[linhas.length - 1]).toMatch(/^Falta pagar: R\$\s40,00$/);
  });

  it("soma os totais da equipe", () => {
    const lista = resumirComissoes({
      profissionais: [ANA, CAU],
      atendimentos: [atendimento("ana", 2, 10000), atendimento("cau", 2, 10000)],
      pagamentos: [{ id: "p1", profissionalId: "cau", valorCentavos: 5000, pagoEm: new Date("2026-10-04T15:00:00Z"), observacao: "" }],
    });
    expect(totaisDasComissoes(lista)).toEqual({ comissaoCentavos: 9000, pagoCentavos: 5000, faltaCentavos: 4000 });
  });
});
