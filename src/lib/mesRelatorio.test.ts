import { describe, expect, it } from "vitest";
import { escolherMesRelatorio, lerParametroMes, mesDoInstante, nomeDoMes, somarMeses } from "./mesRelatorio";

const OUTUBRO = { ano: 2026, mes: 10 };
const SETEMBRO = { ano: 2026, mes: 9 };
const JULHO = { ano: 2026, mes: 7 };

describe("mês do relatório", () => {
  it("soma e subtrai meses atravessando a virada do ano", () => {
    expect(somarMeses({ ano: 2026, mes: 1 }, -1)).toEqual({ ano: 2025, mes: 12 });
    expect(somarMeses({ ano: 2026, mes: 12 }, 1)).toEqual({ ano: 2027, mes: 1 });
    expect(somarMeses(OUTUBRO, -14)).toEqual({ ano: 2025, mes: 8 });
  });

  it("usa o mês no fuso do estabelecimento, não o UTC", () => {
    // 02h UTC de 1º de outubro ainda é 30 de setembro, 23h, em Recife.
    expect(mesDoInstante(new Date("2026-10-01T02:00:00Z"), "America/Recife")).toEqual(SETEMBRO);
  });

  it("só aceita ?mes= no formato AAAA-MM", () => {
    expect(lerParametroMes("2026-09")).toEqual(SETEMBRO);
    for (const invalido of ["2026-13", "2026-9", "setembro", "", undefined, ["2026-09"]]) {
      expect(lerParametroMes(invalido)).toBeNull();
    }
  });

  it("sem pedido mostra o mês atual, com seta só para trás", () => {
    expect(escolherMesRelatorio(null, OUTUBRO, JULHO)).toEqual({ mes: OUTUBRO, anterior: SETEMBRO, proximo: null });
  });

  it("mês anterior tem setas para os dois lados", () => {
    expect(escolherMesRelatorio(SETEMBRO, OUTUBRO, JULHO)).toEqual({
      mes: SETEMBRO,
      anterior: { ano: 2026, mes: 8 },
      proximo: OUTUBRO,
    });
  });

  it("não passa do mês atual nem volta antes do primeiro mês do negócio", () => {
    expect(escolherMesRelatorio({ ano: 2027, mes: 3 }, OUTUBRO, JULHO).mes).toEqual(OUTUBRO);
    const antes = escolherMesRelatorio({ ano: 2020, mes: 1 }, OUTUBRO, JULHO);
    expect(antes).toEqual({ mes: JULHO, anterior: null, proximo: { ano: 2026, mes: 8 } });
  });

  it("negócio cadastrado este mês não tem para onde voltar", () => {
    expect(escolherMesRelatorio(null, OUTUBRO, OUTUBRO)).toEqual({ mes: OUTUBRO, anterior: null, proximo: null });
  });

  it("escreve o nome do mês com inicial maiúscula", () => {
    expect(nomeDoMes(SETEMBRO)).toBe("Setembro");
    expect(nomeDoMes({ ano: 2026, mes: 3 })).toBe("Março");
  });
});
