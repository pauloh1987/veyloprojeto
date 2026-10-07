import { describe, expect, it } from "vitest";
import { descreverErroTwilio, ehErroDoNumeroDaCliente, explicarErroEnvio, explicarErroParaSalao } from "./erros";

describe("erros de envio", () => {
  it("guarda o código e a mensagem da Twilio", () => {
    const corpo = JSON.stringify({ code: 21211, message: "The 'To' number +5581 is not a valid phone number.", status: 400 });
    expect(descreverErroTwilio(400, corpo)).toBe("Twilio 400, código 21211: The 'To' number +5581 is not a valid phone number.");
  });

  it("resposta que não é JSON vira texto curto", () => {
    expect(descreverErroTwilio(502, "<html>Bad Gateway</html>")).toBe("Twilio 502: <html>Bad Gateway</html>");
  });

  it("explica os códigos conhecidos em português", () => {
    expect(explicarErroEnvio("Twilio 401, código 20003: Authenticate")).toContain("credenciais");
    expect(explicarErroEnvio("Twilio 400, código 63024: Invalid message recipient")).toBe("O número da cliente não está no WhatsApp.");
    expect(explicarErroEnvio("Twilio 401: unauthorized")).toContain("credenciais");
  });

  it("verificação da conta (KYC) pendente não é confundida com credencial errada", () => {
    const erro = "Twilio 401, código 20003: Primary compliance profile is not approved. Please complete the KYC process in Trust Hub.";
    expect(explicarErroEnvio(erro)).toContain("Trust Hub");
  });

  it("erro desconhecido ou ausente", () => {
    expect(explicarErroEnvio("Twilio 400, código 99999: algo novo")).toBe("A mensagem não foi enviada.");
    expect(explicarErroEnvio(null)).toBeNull();
  });
});

describe("erro mostrado para o salão", () => {
  it("explica problema no número da cliente", () => {
    expect(explicarErroParaSalao("Twilio 400, código 63024: Invalid message recipient")).toBe("O número da cliente não está no WhatsApp.");
  });

  it("esconde detalhe técnico de configuração", () => {
    expect(explicarErroParaSalao("Twilio 401, código 20003: Authenticate")).toContain("equipe Veylo");
  });

  it("mantém os avisos do próprio sistema", () => {
    expect(explicarErroParaSalao("Esse horário já passou.")).toBe("Esse horário já passou.");
  });
});

describe("erro do número da cliente", () => {
  it("reconhece número inválido, fixo ou sem WhatsApp", () => {
    expect(ehErroDoNumeroDaCliente("Twilio 400, código 21211: The 'To' number is not a valid phone number.")).toBe(true);
    expect(ehErroDoNumeroDaCliente("Twilio 400, código 63024: Invalid message recipient")).toBe(true);
  });

  it("não confunde com falha de configuração ou instabilidade da Twilio", () => {
    expect(ehErroDoNumeroDaCliente("Twilio 401, código 20003: Authenticate")).toBe(false);
    expect(ehErroDoNumeroDaCliente("Twilio 502: <html>Bad Gateway</html>")).toBe(false);
    expect(ehErroDoNumeroDaCliente(undefined)).toBe(false);
  });
});
