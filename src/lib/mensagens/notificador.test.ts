import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificadorTwilioWhatsApp } from "./notificador";

function criarNotificador() {
  return new NotificadorTwilioWhatsApp("AC_teste", "token_teste", "whatsapp:+558191655358", {
    CONFIRMACAO: "HX_confirmacao",
    LEMBRETE: "HX_lembrete",
    CONVITE_RETORNO: "HX_convite",
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("NotificadorTwilioWhatsApp", () => {
  it("não envia mensagem com quantidade de variáveis diferente da dos modelos", async () => {
    const fetchFalso = vi.fn();
    vi.stubGlobal("fetch", fetchFalso);

    const resultado = await criarNotificador().enviar({
      canal: "WHATSAPP",
      destinatario: "81988887777",
      texto: "texto antigo",
      tipo: "LEMBRETE",
      variaveis: ["Studio", "Gel", "sábado às 14:30"],
    });

    expect(resultado.sucesso).toBe(false);
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("envia o modelo certo com as 4 variáveis numeradas e guarda o SID da Twilio", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(new Response(JSON.stringify({ sid: "SM123" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchFalso);

    const resultado = await criarNotificador().enviar({
      canal: "WHATSAPP",
      destinatario: "81988887777",
      texto: "texto",
      tipo: "CONFIRMACAO",
      variaveis: ["Studio Bela Unha", "Manutenção do gel", "sábado, 10 de outubro às 14:30", "https://wa.me/5581999999999"],
    });

    expect(resultado).toEqual({ sucesso: true, idProvedor: "SM123" });
    const corpo = new URLSearchParams(fetchFalso.mock.calls[0][1].body);
    expect(corpo.get("ContentSid")).toBe("HX_confirmacao");
    expect(corpo.get("To")).toBe("whatsapp:+5581988887777");
    expect(JSON.parse(corpo.get("ContentVariables") ?? "{}")).toEqual({
      "1": "Studio Bela Unha",
      "2": "Manutenção do gel",
      "3": "sábado, 10 de outubro às 14:30",
      "4": "https://wa.me/5581999999999",
    });
  });
});
