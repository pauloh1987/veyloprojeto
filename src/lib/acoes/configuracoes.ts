"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirDono } from "@/lib/auth";
import { configuracoesSchema } from "@/lib/validacao";
import { mensagemSeguraDeErro } from "@/lib/erros";
import { somenteDigitos } from "@/lib/formatadores";
import { registrarPassoGuia } from "@/lib/guia/progresso";
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
      janelaAgendamentoSemanas: formData.get("janelaAgendamentoSemanas"),
      foto: formData.get("foto") ?? "",
      logoFundo: formData.get("logoFundo"),
      confirmacaoAutomatica: formData.get("confirmacaoAutomatica") === "on",
      avisoNovoAgendamento: formData.get("avisoNovoAgendamento") === "on",
      avisoCancelamento: formData.get("avisoCancelamento") === "on",
      instagram: formData.get("instagram") ?? "",
      apresentacao: formData.get("apresentacao") ?? "",
      avisoAgendamento: formData.get("avisoAgendamento") ?? "",
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
        janelaAgendamentoSemanas: dados.janelaAgendamentoSemanas,
        foto: dados.foto,
        logoFundo: dados.logoFundo,
        confirmacaoAutomatica: dados.confirmacaoAutomatica,
        avisoNovoAgendamento: dados.avisoNovoAgendamento,
        avisoCancelamento: dados.avisoCancelamento,
        instagram: dados.instagram,
        apresentacao: dados.apresentacao,
        avisoAgendamento: dados.avisoAgendamento,
      },
    });

    // Trocar o número conta como ter conferido o WhatsApp no guia "Comece por aqui".
    if (dados.telefone !== somenteDigitos(usuario.estabelecimento.telefone)) {
      await registrarPassoGuia(usuario.estabelecimentoId, "whatsapp");
    }

    revalidatePath("/painel/configuracoes");
    revalidatePath("/painel", "layout");
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}
