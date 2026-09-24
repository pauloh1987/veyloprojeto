"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirDono } from "@/lib/auth";
import { alternarArquivadoServicoSchema, idSchema, servicoSchema } from "@/lib/validacao";
import { mensagemSeguraDeErro, NaoAutorizadoError, ValidacaoError } from "@/lib/erros";
import type { EstadoAcao } from "./agendamentos";

export async function salvarServico(_estadoAnterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  try {
    const usuario = await exigirDono();
    const id = String(formData.get("id") || "");

    const resultado = servicoSchema.safeParse({
      nome: formData.get("nome"),
      descricao: formData.get("descricao"),
      duracaoMin: formData.get("duracaoMin"),
      precoCentavos: Math.round(Number(formData.get("precoReais") || 0) * 100),
      cor: formData.get("cor"),
      ativo: formData.get("ativo") === "on",
      profissionaisIds: formData.getAll("profissionaisIds").map(String),
      categoriaId: formData.get("categoriaId") ?? "",
    });
    if (!resultado.success) {
      return { erro: resultado.error.issues[0]?.message ?? "Dados inválidos." };
    }
    const dados = resultado.data;

    if (dados.categoriaId) {
      const categoria = await db.categoriaServico.findFirst({
        where: { id: dados.categoriaId, estabelecimentoId: usuario.estabelecimentoId },
      });
      if (!categoria) throw new NaoAutorizadoError();
    }

    if (id) {
      const existente = await db.servico.findFirst({ where: { id, estabelecimentoId: usuario.estabelecimentoId } });
      if (!existente) throw new NaoAutorizadoError();
      await db.servico.update({
        where: { id },
        data: {
          nome: dados.nome,
          descricao: dados.descricao || "",
          duracaoMin: dados.duracaoMin,
          precoCentavos: dados.precoCentavos,
          cor: dados.cor,
          ativo: dados.ativo,
          categoriaId: dados.categoriaId,
          profissionais: {
            deleteMany: {},
            create: dados.profissionaisIds.map((profissionalId) => ({ profissionalId })),
          },
        },
      });
    } else {
      await db.servico.create({
        data: {
          nome: dados.nome,
          descricao: dados.descricao || "",
          duracaoMin: dados.duracaoMin,
          precoCentavos: dados.precoCentavos,
          cor: dados.cor,
          ativo: dados.ativo,
          categoriaId: dados.categoriaId,
          estabelecimentoId: usuario.estabelecimentoId,
          profissionais: { create: dados.profissionaisIds.map((profissionalId) => ({ profissionalId })) },
        },
      });
    }

    revalidatePath("/painel/servicos");
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}

export async function alternarArquivadoServico(servicoId: string, ativo: boolean): Promise<void> {
  const { servicoId: idValidado, ativo: ativoValidado } = alternarArquivadoServicoSchema.parse({ servicoId, ativo });
  const usuario = await exigirDono();
  const servico = await db.servico.findFirst({ where: { id: idValidado, estabelecimentoId: usuario.estabelecimentoId } });
  if (!servico) throw new NaoAutorizadoError();
  await db.servico.update({ where: { id: idValidado }, data: { ativo: ativoValidado } });
  revalidatePath("/painel/servicos");
}

export async function excluirServico(servicoIdBruto: string): Promise<EstadoAcao> {
  try {
    const usuario = await exigirDono();
    const servicoId = idSchema.parse(servicoIdBruto);
    const servico = await db.servico.findFirst({ where: { id: servicoId, estabelecimentoId: usuario.estabelecimentoId } });
    if (!servico) throw new NaoAutorizadoError();

    const totalAgendamentos = await db.agendamento.count({ where: { servicoId } });
    if (totalAgendamentos > 0) {
      throw new ValidacaoError(
        `Esse serviço já tem ${totalAgendamentos} agendamento${totalAgendamentos > 1 ? "s" : ""} no histórico e não pode ser excluído. Use "Arquivar" para escondê-lo sem apagar nada.`,
      );
    }

    await db.servico.delete({ where: { id: servicoId } });
    revalidatePath("/painel/servicos");
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}
