import type { Agendamento } from "@prisma/client";
import { db } from "@/lib/db";
import { cancelarMensagensPendentes } from "@/lib/mensagens/fila";
import { avisarDona } from "@/lib/email/avisoDona";
import { paraDataYMD } from "@/lib/tz";
import { statusPeloHistorico } from "./criarAgendamento";
import { calcularHorariosDisponiveisNoBanco } from "./consultarDisponibilidade";
import { efetivarPreReserva } from "./confirmacaoPeloWhatsApp";
import { preReservaNoPrazo } from "./preReserva";

export type ResultadoResposta =
  | { tipo: "ok" }
  | { tipo: "ja_cancelado" }
  | { tipo: "ja_concluido" }
  /** A pré-reserva do link foi confirmada e virou agendamento. */
  | { tipo: "agendado" }
  /** Confirmou a pré-reserva depois do prazo e o horário já tinha ido para outra pessoa. */
  | { tipo: "horario_ocupado" };

/** A própria cliente cancelou (botão "Cancelar" no WhatsApp ou página do agendamento): libera
 * o horário, cancela os lembretes pendentes, marca `canceladoPelaClienteEm` pra dona ver o
 * aviso no painel e manda o e-mail de cancelamento para ela, se estiver ligado. */
export async function cancelarPelaCliente(agendamentoId: string): Promise<ResultadoResposta> {
  const agendamento = await db.agendamento.findUniqueOrThrow({ where: { id: agendamentoId } });
  if (agendamento.status === "CANCELADO") return { tipo: "ja_cancelado" };
  if (agendamento.status === "ATENDIDO" || agendamento.status === "FALTOU") return { tipo: "ja_concluido" };
  if (agendamento.status === "AGUARDANDO_CLIENTE") {
    // Desistiu da pré-reserva (Cancelar no WhatsApp, ou voltou no link para corrigir): nunca chegou
    // a ser agendamento, então não aparece para a dona nem gera e-mail.
    await db.agendamento.update({ where: { id: agendamentoId }, data: { status: "CANCELADO" } });
    return { tipo: "ok" };
  }

  await db.agendamento.update({
    where: { id: agendamentoId },
    data: { status: "CANCELADO", canceladoPelaClienteEm: new Date() },
  });
  await cancelarMensagensPendentes(agendamentoId);
  await avisarDona(agendamentoId, "cancelado");
  return { tipo: "ok" };
}

/** A cliente confirmou presença. Não mexe no status: um agendamento PENDENTE continua
 * esperando a aprovação da dona — só registra que a cliente disse que vem. */
export async function confirmarPresencaPelaCliente(agendamentoId: string): Promise<ResultadoResposta> {
  const agendamento = await db.agendamento.findUniqueOrThrow({ where: { id: agendamentoId } });
  if (agendamento.status === "CANCELADO") return { tipo: "ja_cancelado" };
  if (agendamento.status === "ATENDIDO" || agendamento.status === "FALTOU") return { tipo: "ja_concluido" };
  if (agendamento.status === "AGUARDANDO_CLIENTE") return confirmarPreReserva(agendamento);

  if (!agendamento.presencaConfirmadaEm) {
    await db.agendamento.update({ where: { id: agendamentoId }, data: { presencaConfirmadaEm: new Date() } });
  }
  return { tipo: "ok" };
}

/** A cliente tocou em Confirmar na mensagem que chegou logo depois de agendar pelo link. */
async function confirmarPreReserva(agendamento: Agendamento): Promise<ResultadoResposta> {
  if (!preReservaNoPrazo(agendamento.confirmarAte) && !(await horarioAindaLivre(agendamento))) {
    await db.agendamento.update({ where: { id: agendamento.id }, data: { status: "CANCELADO" } });
    return { tipo: "horario_ocupado" };
  }
  const status = await statusPeloHistorico(agendamento.clienteId, agendamento.estabelecimentoId);
  await efetivarPreReserva(agendamento.id, status, { confirmadaPelaCliente: true });
  return { tipo: "agendado" };
}

/** Fora do prazo a pré-reserva não segura mais o horário (ver `filtroOcupaHorario`), então ele pode
 * ter ido para outra pessoa ou já ter passado. */
async function horarioAindaLivre(agendamento: Agendamento): Promise<boolean> {
  const { fuso } = await db.estabelecimento.findUniqueOrThrow({
    where: { id: agendamento.estabelecimentoId },
    select: { fuso: true },
  });
  const livres = await calcularHorariosDisponiveisNoBanco(db, {
    profissionalId: agendamento.profissionalId,
    dataYMD: paraDataYMD(agendamento.inicio, fuso),
    fuso,
    duracaoMin: Math.round((agendamento.fim.getTime() - agendamento.inicio.getTime()) / 60_000),
    antecedenciaMinMin: 0,
  });
  return livres.some((slot) => slot.getTime() === agendamento.inicio.getTime());
}
