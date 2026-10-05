import { describe, expect, it } from "vitest";
import { relacaoComHoje, relacaoDaSemana, rotuloDaSemana, segundaDaSemana } from "./rotulosAgenda";

// 05/10/2026 é uma segunda-feira.
const HOJE = "2026-10-05";

describe("topo da Agenda", () => {
  it("acha a segunda-feira da semana, inclusive no domingo", () => {
    expect(segundaDaSemana("2026-10-07")).toBe("2026-10-05");
    expect(segundaDaSemana("2026-10-11")).toBe("2026-10-05");
    expect(segundaDaSemana("2026-10-05")).toBe("2026-10-05");
  });

  it("diz se o dia aberto é hoje, amanhã ou ontem", () => {
    expect(relacaoComHoje("2026-10-05", HOJE)).toBe("Hoje");
    expect(relacaoComHoje("2026-10-06", HOJE)).toBe("Amanhã");
    expect(relacaoComHoje("2026-10-04", HOJE)).toBe("Ontem");
    expect(relacaoComHoje("2026-10-08", HOJE)).toBeNull();
  });

  it("diz se a semana aberta é esta, a próxima ou a passada", () => {
    expect(relacaoDaSemana("2026-10-05", HOJE)).toBe("Esta semana");
    expect(relacaoDaSemana("2026-10-12", HOJE)).toBe("Próxima semana");
    expect(relacaoDaSemana("2026-09-28", HOJE)).toBe("Semana passada");
    expect(relacaoDaSemana("2026-10-19", HOJE)).toBeNull();
  });

  it("escreve o intervalo da semana", () => {
    expect(rotuloDaSemana("2026-10-05")).toBe("5 – 11 de outubro");
    expect(rotuloDaSemana("2026-09-28")).toBe("28 de setembro – 4 de outubro");
  });
});
