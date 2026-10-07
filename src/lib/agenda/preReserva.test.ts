import { describe, expect, it } from "vitest";
import { MINUTOS_PARA_CONFIRMAR, filtroOcupaHorario, prazoParaConfirmar, preReservaNoPrazo } from "./preReserva";

describe("pré-reserva do link", () => {
  const agora = new Date("2026-10-06T13:00:00Z");

  it("guarda o horário por 30 minutos", () => {
    expect(MINUTOS_PARA_CONFIRMAR).toBe(30);
    expect(prazoParaConfirmar(agora).toISOString()).toBe("2026-10-06T13:30:00.000Z");
  });

  it("só vale até o prazo", () => {
    expect(preReservaNoPrazo(new Date("2026-10-06T13:29:59Z"), agora)).toBe(true);
    expect(preReservaNoPrazo(new Date("2026-10-06T13:00:00Z"), agora)).toBe(false);
    expect(preReservaNoPrazo(null, agora)).toBe(false);
  });

  it("ocupa o horário só enquanto está no prazo; cancelado nunca ocupa", () => {
    expect(filtroOcupaHorario(agora)).toEqual({
      OR: [
        { status: { notIn: ["CANCELADO", "AGUARDANDO_CLIENTE"] } },
        { status: "AGUARDANDO_CLIENTE", confirmarAte: { gt: agora } },
      ],
    });
  });
});
