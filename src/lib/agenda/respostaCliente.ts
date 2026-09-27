import { db } from "@/lib/db";
import { cancelarMensagensPendentes } from "@/lib/mensagens/fila";

export type ResultadoResposta =
  | { tipo: "ok" }
  | { tipo: "ja_cancelado" }
  | { tipo: "ja_concluido" };

/** A própria cliente cancelou (botão "Cancelar" no WhatsApp ou página do agendamento): libera
 * o horário, cancela os lembretes pendentes e marca `canceladoPelaClienteEm` pra dona ver o
 * aviso no painel. */
export async function cancelarPelaCliente(agendamentoId: string): Promise<ResultadoResposta> {
  const agendamento = await db.agendamento.findUniqueOrThrow({ where: { id: agendamentoId } });
  if (agendamento.status === "CANCELADO") return { tipo: "ja_cancelado" };
  if (agendamento.status === "ATENDIDO" || agendamento.status === "FALTOU") return { tipo: "ja_concluido" };

  await db.agendamento.update({
    where: { id: agendamentoId },
    data: { status: "CANCELADO", canceladoPelaClienteEm: new Date() },
  });
  await cancelarMensagensPendentes(agendamentoId);
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
