import "server-only";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { NaoAutorizadoError } from "@/lib/erros";

/** O agendamento, se ele é do salão de quem está logado (e da própria profissional, quando quem
 * está logado é profissional). Fica fora dos arquivos "use server" para não virar uma ação que
 * qualquer um chama pela rede. */
export async function carregarAgendamentoDoUsuario(agendamentoId: string) {
  const usuario = await exigirSessao();
  const agendamento = await db.agendamento.findUnique({ where: { id: agendamentoId } });
  if (!agendamento || agendamento.estabelecimentoId !== usuario.estabelecimentoId) {
    throw new NaoAutorizadoError();
  }
  if (usuario.papel === "PROFISSIONAL" && agendamento.profissionalId !== usuario.profissionalId) {
    throw new NaoAutorizadoError();
  }
  return { usuario, agendamento };
}
