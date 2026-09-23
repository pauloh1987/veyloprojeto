"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirDono } from "@/lib/auth";
import { configuracoesSchema } from "@/lib/validacao";
import { mensagemSeguraDeErro, ValidacaoError } from "@/lib/erros";
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
      plano: formData.get("plano"),
      foto: formData.get("foto") ?? "",
      logoFundo: formData.get("logoFundo"),
    });
    if (!resultado.success) {
      return { erro: resultado.error.issues[0]?.message ?? "Dados inválidos." };
    }
    const dados = resultado.data;

    if (dados.plano === "SOLO") {
      const totalAtivos = await db.profissional.count({
        where: { estabelecimentoId: usuario.estabelecimentoId, ativo: true },
      });
      if (totalAtivos > 1) {
        throw new ValidacaoError(
          "Você tem mais de uma profissional ativa — desative as demais em Profissionais antes de mudar para o plano Solo.",
        );
      }
    }

    await db.estabelecimento.update({
      where: { id: usuario.estabelecimentoId },
      data: {
        nome: dados.nome,
        telefone: dados.telefone,
        endereco: dados.endereco,
        corDestaque: dados.corDestaque,
        antecedenciaMinMin: dados.antecedenciaMinMin,
        plano: dados.plano,
        foto: dados.foto,
        logoFundo: dados.logoFundo,
      },
    });

    revalidatePath("/painel/configuracoes");
    revalidatePath("/painel", "layout");
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}
