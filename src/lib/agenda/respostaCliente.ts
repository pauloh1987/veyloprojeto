import { db } from "@/lib/db";
import { cancelarMensagensPendentes } from "@/lib/mensagens/fila";
import { avisarDona } from "@/lib/email/avisoDona";

export type ResultadoResposta =
  | { tipo: "ok" }
  | { tipo: "ja_cancelado" }
  | { tipo: "ja_concluido" };

/** A própria cliente cancelou (botão "Cancelar" no WhatsApp ou página do agendamento): libera
 * o horário, cancela os lembretes pendentes, marca `canceladoPelaClienteEm` pra dona ver o
 * aviso no painel e manda o e-mail de cancelamento para ela, se estiver ligado. */
export async function cancelarPelaCliente(agendamentoId: string): Promise<ResultadoResposta> {
  const agendamento = await db.agendamento.findUniqueOrThrow({ where: { id: agendamentoId } });
  if (agendamento.status === "CANCELADO") return { tipo: "ja_cancelado" };
  if (agendamento.status === "ATENDIDO" || agendamento.status === "FALTOU") return { tipo: "ja_concluido" };

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

  if (!agendamento.presencaConfirmadaEm) {
    await db.agendamento.update({ where: { id: agendamentoId }, data: { presencaConfirmadaEm: new Date() } });
  }
  return { tipo: "ok" };
}
