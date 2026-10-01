"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { mensagemSeguraDeErro, NaoAutorizadoError } from "@/lib/erros";
import { explicarErroParaSalao } from "@/lib/mensagens/erros";
import { reenviarMensagem } from "@/lib/mensagens/fila";
import type { EstadoAcao } from "./agendamentos";

/** "Tentar de novo" numa mensagem que deu erro (tela Mensagens do painel). */
export async function tentarReenviarMensagem(mensagemId: string): Promise<EstadoAcao> {
  try {
    const usuario = await exigirSessao();
    const mensagem = await db.mensagem.findFirst({
      where: {
        id: mensagemId,
        OR: [
          { agendamento: { estabelecimentoId: usuario.estabelecimentoId } },
          { cliente: { estabelecimentoId: usuario.estabelecimentoId } },
        ],
      },
      select: { id: true },
    });
    if (!mensagem) throw new NaoAutorizadoError();
    const resultado = await reenviarMensagem(mensagem.id);
    revalidatePath("/painel/mensagens");
    return resultado.sucesso ? { sucesso: true } : { erro: explicarErroParaSalao(resultado.erro ?? null) };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}
