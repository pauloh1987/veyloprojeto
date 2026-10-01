import { describe, expect, it } from "vitest";
import { lerEquipe, membroPorEmail } from "./equipe";
import { chaveTelefone, normalizarInstagram, proximaEtapa } from "./funil";

describe("equipe do admin (ADMIN_EMAILS)", () => {
  it("lê e-mails com e sem nome, ignorando inválidos e repetidos", () => {
    const equipe = lerEquipe(" Paulo <Paulo@Exemplo.com>, biel@exemplo.com, nao-e-email, paulo@exemplo.com ,");
    expect(equipe).toEqual([
      { nome: "Paulo", email: "paulo@exemplo.com" },
      { nome: "Biel", email: "biel@exemplo.com" },
    ]);
  });

  it("sem a variável ninguém entra", () => {
    expect(lerEquipe(undefined)).toEqual([]);
    expect(lerEquipe("")).toEqual([]);
  });

  it("encontra o membro sem diferenciar maiúsculas", () => {
    const equipe = lerEquipe("Dudu <dudu@exemplo.com>");
    expect(membroPorEmail(equipe, "  DUDU@exemplo.com ")?.nome).toBe("Dudu");
    expect(membroPorEmail(equipe, "outra@exemplo.com")).toBeNull();
  });
});

describe("funil", () => {
  it("compara telefones com ou sem +55 e com ou sem o 9 extra", () => {
    const chave = chaveTelefone("(81) 99165-5358");
    expect(chave).toBe("8191655358");
    expect(chaveTelefone("+55 81 99165-5358")).toBe(chave);
    expect(chaveTelefone("8191655358")).toBe(chave);
    expect(chaveTelefone("99165-5358")).toBeNull();
  });

  it("guarda só o nome de usuário do Instagram", () => {
    expect(normalizarInstagram("@studio.bela")).toBe("studio.bela");
    expect(normalizarInstagram("https://www.instagram.com/studio.bela/?hl=pt")).toBe("studio.bela");
    expect(normalizarInstagram("  studio.bela ")).toBe("studio.bela");
  });

  it("avança pelas etapas até Fechado", () => {
    expect(proximaEtapa("PROSPECCAO")).toBe("CONTATO");
    expect(proximaEtapa("EM_TESTE")).toBe("FECHADO");
    expect(proximaEtapa("FECHADO")).toBeNull();
    expect(proximaEtapa("PERDIDO")).toBeNull();
  });
});
