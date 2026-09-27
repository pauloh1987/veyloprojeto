"use server";

import { db } from "@/lib/db";
import { cancelarPelaCliente } from "@/lib/agenda/respostaCliente";
import { idSchema } from "@/lib/validacao";

export async function cancelarAgendamentoPublico(
  tokenPublicoBruto: string,
): Promise<{ erro?: string; sucesso?: boolean }> {
  const validado = idSchema.safeParse(tokenPublicoBruto);
  if (!validado.success) return { erro: "Agendamento não encontrado." };
  const tokenPublico = validado.data;

  const agendamento = await db.agendamento.findUnique({ where: { tokenPublico } });
  if (!agendamento) return { erro: "Agendamento não encontrado." };

  const resultado = await cancelarPelaCliente(agendamento.id);
  if (resultado.tipo === "ja_concluido") {
    return { erro: "Este agendamento já foi concluído e não pode mais ser cancelado." };
  }
  return { sucesso: true };
}
