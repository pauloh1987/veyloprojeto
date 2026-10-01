import { describe, expect, it } from "vitest";
import { fimDoTeste, situacaoDaConta, testeEstendido, testeGratisExpirado } from "./assinatura";

const CADASTRO = new Date("2026-10-01T12:00:00Z");
const NOVA = { criadoEm: CADASTRO, assinanteDesde: null, parceira: false, testeAte: null };

describe("teste grátis e situação da conta", () => {
  it("conta nova fica 14 dias em teste", () => {
    expect(fimDoTeste(NOVA)).toEqual(new Date("2026-10-15T12:00:00Z"));
    expect(situacaoDaConta(NOVA, new Date("2026-10-05T12:00:00Z"))).toEqual({
      tipo: "teste",
      vence: new Date("2026-10-15T12:00:00Z"),
      diasRestantes: 10,
    });
  });

  it("depois do prazo o teste vence", () => {
    const depois = new Date("2026-10-16T12:00:00Z");
    expect(situacaoDaConta(NOVA, depois).tipo).toBe("testeVencido");
    expect(testeGratisExpirado(NOVA, depois)).toBe(true);
  });

  it("parceira e assinante nunca vencem", () => {
    const muitoDepois = new Date("2027-06-01T12:00:00Z");
    expect(situacaoDaConta({ ...NOVA, parceira: true }, muitoDepois)).toEqual({ tipo: "parceira" });
    expect(situacaoDaConta({ ...NOVA, assinanteDesde: CADASTRO }, muitoDepois)).toEqual({
      tipo: "assinante",
      desde: CADASTRO,
    });
    expect(testeGratisExpirado({ ...NOVA, parceira: true }, muitoDepois)).toBe(false);
  });

  it("estender soma ao fim atual do teste, ou a partir de hoje se já venceu", () => {
    expect(testeEstendido(NOVA, 7, new Date("2026-10-05T12:00:00Z"))).toEqual(new Date("2026-10-22T12:00:00Z"));
    expect(testeEstendido(NOVA, 7, new Date("2026-10-20T12:00:00Z"))).toEqual(new Date("2026-10-27T12:00:00Z"));
  });

  it("o prazo estendido no admin vale no lugar dos 14 dias", () => {
    const estendida = { ...NOVA, testeAte: new Date("2026-10-22T12:00:00Z") };
    expect(situacaoDaConta(estendida, new Date("2026-10-18T12:00:00Z")).tipo).toBe("teste");
    expect(situacaoDaConta(estendida, new Date("2026-10-23T12:00:00Z")).tipo).toBe("testeVencido");
  });
});
