"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirDono } from "@/lib/auth";
import { mensagemSeguraDeErro } from "@/lib/erros";
import { ehPassoMarcavel } from "@/lib/guia/passos";
import { registrarPassoGuia } from "@/lib/guia/progresso";
import type { EstadoAcao } from "./agendamentos";

/** Botões do guia que dão um passo por feito ("Está certo", "Só eu atendo"...). */
export async function marcarPassoGuia(passo: string): Promise<EstadoAcao> {
  try {
    const usuario = await exigirDono();
    if (!ehPassoMarcavel(passo)) return { erro: "Passo do guia inválido." };
    await registrarPassoGuia(usuario.estabelecimentoId, passo);
    revalidatePath("/painel/hoje");
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}

export async function esconderGuia(): Promise<EstadoAcao> {
  return definirGuiaEscondido(true);
}

export async function mostrarGuiaDeNovo(): Promise<EstadoAcao> {
  return definirGuiaEscondido(false);
}

async function definirGuiaEscondido(escondido: boolean): Promise<EstadoAcao> {
  try {
    const usuario = await exigirDono();
    await db.estabelecimento.update({
      where: { id: usuario.estabelecimentoId },
      data: { guiaEscondidoEm: escondido ? new Date() : null },
    });
    revalidatePath("/painel", "layout");
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}
