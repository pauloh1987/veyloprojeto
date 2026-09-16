"use server";

import { db } from "@/lib/db";
import { cancelarMensagensPendentes } from "@/lib/mensagens/fila";
import { idSchema } from "@/lib/validacao";

export async function cancelarAgendamentoPublico(
  tokenPublicoBruto: string,
): Promise<{ erro?: string; sucesso?: boolean }> {
  const validado = idSchema.safeParse(tokenPublicoBruto);
  if (!validado.success) return { erro: "Agendamento não encontrado." };
  const tokenPublico = validado.data;

  const agendamento = await db.agendamento.findUnique({ where: { tokenPublico } });
  if (!agendamento) return { erro: "Agendamento não encontrado." };
  if (agendamento.status === "CANCELADO") return { sucesso: true };
  if (agendamento.status === "ATENDIDO" || agendamento.status === "FALTOU") {
    return { erro: "Este agendamento já foi concluído e não pode mais ser cancelado." };
  }

  await db.agendamento.update({ where: { id: agendamento.id }, data: { status: "CANCELADO" } });
  await cancelarMensagensPendentes(agendamento.id);
  return { sucesso: true };
}
