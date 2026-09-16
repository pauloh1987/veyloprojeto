"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { clienteSchema } from "@/lib/validacao";
import { mensagemSeguraDeErro, NaoAutorizadoError, ValidacaoError } from "@/lib/erros";
import type { EstadoAcao } from "./agendamentos";

export async function salvarCliente(_estadoAnterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  try {
    const usuario = await exigirSessao();
    const id = String(formData.get("id") || "");

    const resultado = clienteSchema.safeParse({
      nome: formData.get("nome"),
      telefone: formData.get("telefone"),
      email: formData.get("email"),
      observacoes: formData.get("observacoes"),
    });
    if (!resultado.success) {
      return { erro: resultado.error.issues[0]?.message ?? "Dados inválidos." };
    }
    const dados = resultado.data;

    const duplicado = await db.cliente.findFirst({
      where: {
        estabelecimentoId: usuario.estabelecimentoId,
        telefone: dados.telefone,
        NOT: id ? { id } : undefined,
      },
    });
    if (duplicado) throw new ValidacaoError("Já existe um cliente com esse telefone.");

    if (id) {
      const existente = await db.cliente.findFirst({ where: { id, estabelecimentoId: usuario.estabelecimentoId } });
      if (!existente) throw new NaoAutorizadoError();
      await db.cliente.update({
        where: { id },
        data: {
          nome: dados.nome,
          telefone: dados.telefone,
          email: dados.email || null,
          observacoes: dados.observacoes || null,
        },
      });
    } else {
      await db.cliente.create({
        data: {
          nome: dados.nome,
          telefone: dados.telefone,
          email: dados.email || null,
          observacoes: dados.observacoes || null,
          estabelecimentoId: usuario.estabelecimentoId,
        },
      });
    }

    revalidatePath("/painel/clientes");
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}
