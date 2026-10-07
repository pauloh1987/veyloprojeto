import type { Prisma } from "@prisma/client";

/**
 * Regras da pré-reserva do link (sem banco, para dar para testar). Com o WhatsApp ligado, o
 * agendamento que a cliente faz pelo link nasce como AGUARDANDO_CLIENTE e só vira agendamento
 * quando ela toca em Confirmar na mensagem que chega na hora (ver confirmacaoPeloWhatsApp.ts).
 * Até lá ele segura o horário por MINUTOS_PARA_CONFIRMAR; depois, o horário volta a ficar livre.
 */

export const MINUTOS_PARA_CONFIRMAR = 30;

export function prazoParaConfirmar(agora: Date = new Date()): Date {
  return new Date(agora.getTime() + MINUTOS_PARA_CONFIRMAR * 60_000);
}

export function preReservaNoPrazo(confirmarAte: Date | null, agora: Date = new Date()): boolean {
  return confirmarAte !== null && confirmarAte.getTime() > agora.getTime();
}

/** Agendamentos que ocupam o horário: tudo menos o cancelado, e a pré-reserva só enquanto está
 * no prazo. */
export function filtroOcupaHorario(agora: Date = new Date()): Prisma.AgendamentoWhereInput {
  return {
    OR: [
      { status: { notIn: ["CANCELADO", "AGUARDANDO_CLIENTE"] } },
      { status: "AGUARDANDO_CLIENTE", confirmarAte: { gt: agora } },
    ],
  };
}

/** Clientes que a equipe vê: cadastradas no painel (ainda sem agendamento) ou com algum
 * agendamento de verdade. A ficha criada por uma pré-reserva que nunca foi confirmada (um número
 * inventado, por exemplo) fica escondida. `confirmarAte` só fica preenchido em pré-reserva não
 * confirmada: ao confirmar, ele volta a ser nulo. Pelo mesmo motivo, as telas da equipe filtram
 * agendamentos com `confirmarAte: null`. */
export const filtroClienteVisivel: Prisma.ClienteWhereInput = {
  OR: [{ agendamentos: { none: {} } }, { agendamentos: { some: { confirmarAte: null } } }],
};
