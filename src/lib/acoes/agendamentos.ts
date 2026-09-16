"use server";

import { revalidatePath } from "next/cache";
import type { StatusAgendamento } from "@prisma/client";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { atualizarStatusAgendamentoSchema, novoAgendamentoManualSchema } from "@/lib/validacao";
import { criarAgendamento } from "@/lib/agenda/criarAgendamento";
import { cancelarMensagensPendentes } from "@/lib/mensagens/fila";
import { mensagemSeguraDeErro, NaoAutorizadoError, ValidacaoError } from "@/lib/erros";

export interface EstadoAcao {
  erro?: string;
  sucesso?: boolean;
}

async function carregarAgendamentoDoUsuario(agendamentoId: string) {
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

export async function atualizarStatusAgendamento(
  agendamentoId: string,
  status: StatusAgendamento,
): Promise<EstadoAcao> {
  try {
    // Server Actions são endpoints HTTP alcançáveis diretamente — revalida o formato mesmo
    // vindo de uma chamada de função "tipada" no cliente, que pode ser forjada.
    const validado = atualizarStatusAgendamentoSchema.safeParse({ agendamentoId, status });
    if (!validado.success) {
      return { erro: validado.error.issues[0]?.message ?? "Dados inválidos." };
    }

    const { agendamento } = await carregarAgendamentoDoUsuario(agendamentoId);
    await db.agendamento.update({ where: { id: agendamento.id }, data: { status } });
    if (status === "CANCELADO") {
      await cancelarMensagensPendentes(agendamento.id);
    }
    revalidatePath("/painel/hoje");
    revalidatePath("/painel/agenda");
    revalidatePath(`/painel/clientes/${agendamento.clienteId}`);
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}

export async function criarAgendamentoManual(
  _estadoAnterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  try {
    const usuario = await exigirSessao();

    const resultado = novoAgendamentoManualSchema.safeParse({
      profissionalId: formData.get("profissionalId"),
      servicoId: formData.get("servicoId"),
      inicioIso: formData.get("inicioIso"),
      clienteId: formData.get("clienteId") || undefined,
      clienteNome: formData.get("clienteNome") || undefined,
      clienteTelefone: formData.get("clienteTelefone") || undefined,
      observacao: formData.get("observacao") || undefined,
    });
    if (!resultado.success) {
      return { erro: resultado.error.issues[0]?.message ?? "Dados inválidos." };
    }
    const dados = resultado.data;

    if (usuario.papel === "PROFISSIONAL" && dados.profissionalId !== usuario.profissionalId) {
      throw new NaoAutorizadoError();
    }

    let clienteId = dados.clienteId;
    if (!clienteId) {
      if (!dados.clienteNome || !dados.clienteTelefone) {
        throw new ValidacaoError("Informe um cliente existente ou nome e telefone para cadastrar.");
      }
      const clienteExistente = await db.cliente.findFirst({
        where: { estabelecimentoId: usuario.estabelecimentoId, telefone: dados.clienteTelefone },
      });
      if (clienteExistente) {
        clienteId = clienteExistente.id;
      } else {
        const novoCliente = await db.cliente.create({
          data: {
            nome: dados.clienteNome,
            telefone: dados.clienteTelefone,
            estabelecimentoId: usuario.estabelecimentoId,
          },
        });
        clienteId = novoCliente.id;
      }
    }

    await criarAgendamento({
      estabelecimentoId: usuario.estabelecimentoId,
      profissionalId: dados.profissionalId,
      servicoId: dados.servicoId,
      clienteId,
      inicio: new Date(dados.inicioIso),
      origem: "MANUAL",
      observacao: dados.observacao || null,
    });

    revalidatePath("/painel/hoje");
    revalidatePath("/painel/agenda");
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}
