"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirDono } from "@/lib/auth";
import { configuracoesSchema } from "@/lib/validacao";
import { mensagemSeguraDeErro } from "@/lib/erros";
import type { EstadoAcao } from "./agendamentos";

export async function salvarConfiguracoes(_estadoAnterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  try {
    const usuario = await exigirDono();

    const resultado = configuracoesSchema.safeParse({
      nome: formData.get("nome"),
      telefone: formData.get("telefone"),
      endereco: formData.get("endereco"),
      corDestaque: formData.get("corDestaque"),
      antecedenciaMinMin: formData.get("antecedenciaMinMin"),
    });
    if (!resultado.success) {
      return { erro: resultado.error.issues[0]?.message ?? "Dados inválidos." };
    }
    const dados = resultado.data;

    await db.estabelecimento.update({
      where: { id: usuario.estabelecimentoId },
      data: {
        nome: dados.nome,
        telefone: dados.telefone,
        endereco: dados.endereco,
        corDestaque: dados.corDestaque,
        antecedenciaMinMin: dados.antecedenciaMinMin,
      },
    });

    revalidatePath("/painel/configuracoes");
    revalidatePath("/painel", "layout");
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}
