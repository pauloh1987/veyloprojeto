"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirDono } from "@/lib/auth";
import { hashSenha } from "@/lib/senha";
import { novoProfissionalSchema, atualizarComissaoSchema, atualizarFotoProfissionalSchema, idSchema } from "@/lib/validacao";
import { criarHorariosPadrao } from "@/lib/agenda/horariosPadrao";
import { mensagemSeguraDeErro, NaoAutorizadoError, ValidacaoError } from "@/lib/erros";
import type { EstadoAcao } from "./agendamentos";

export async function criarProfissional(_estadoAnterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  try {
    const usuario = await exigirDono();

    const resultado = novoProfissionalSchema.safeParse({
      nome: formData.get("nome"),
      criarLogin: formData.get("criarLogin") === "on",
      email: formData.get("email") || undefined,
      senha: formData.get("senha") || undefined,
      comissaoPercentual: formData.get("comissaoPercentual") || undefined,
    });
    if (!resultado.success) {
      return { erro: resultado.error.issues[0]?.message ?? "Dados inválidos." };
    }
    const dados = resultado.data;

    if (dados.criarLogin) {
      if (!dados.email || !dados.senha) {
        throw new ValidacaoError("Informe e-mail e senha para criar o login dessa profissional.");
      }
      const existente = await db.usuario.findUnique({ where: { email: dados.email } });
      if (existente) throw new ValidacaoError("Já existe uma conta com esse e-mail.");
    }

    const estabelecimento = await db.estabelecimento.findUniqueOrThrow({
      where: { id: usuario.estabelecimentoId },
    });
    if (estabelecimento.plano === "SOLO") {
      const totalAtivos = await db.profissional.count({
        where: { estabelecimentoId: usuario.estabelecimentoId, ativo: true },
      });
      if (totalAtivos >= 1) {
        throw new ValidacaoError(
          "O plano Solo permite só 1 profissional ativa. Mude para o plano Equipe em Configurações para adicionar mais.",
        );
      }
    }

    await db.$transaction(async (tx) => {
      const profissional = await tx.profissional.create({
        data: {
          nome: dados.nome,
          ativo: true,
          estabelecimentoId: usuario.estabelecimentoId,
          comissaoPercentual: dados.comissaoPercentual,
        },
      });
      await criarHorariosPadrao(tx, profissional.id);

      if (dados.criarLogin && dados.email && dados.senha) {
        await tx.usuario.create({
          data: {
            nome: dados.nome,
            email: dados.email,
            senhaHash: hashSenha(dados.senha),
            papel: "PROFISSIONAL",
            estabelecimentoId: usuario.estabelecimentoId,
            profissionalId: profissional.id,
          },
        });
      }
    });

    revalidatePath("/painel/profissionais");
    revalidatePath("/painel/horarios");
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}

export async function alternarAtivoProfissional(profissionalIdBruto: string, ativo: boolean): Promise<void> {
  const profissionalId = idSchema.parse(profissionalIdBruto);
  const usuario = await exigirDono();
  const profissional = await db.profissional.findFirst({
    where: { id: profissionalId, estabelecimentoId: usuario.estabelecimentoId },
  });
  if (!profissional) throw new NaoAutorizadoError();

  if (ativo && (await db.estabelecimento.findUniqueOrThrow({ where: { id: usuario.estabelecimentoId } })).plano === "SOLO") {
    const totalAtivos = await db.profissional.count({
      where: { estabelecimentoId: usuario.estabelecimentoId, ativo: true },
    });
    if (totalAtivos >= 1) throw new ValidacaoError("O plano Solo permite só 1 profissional ativa.");
  }

  await db.profissional.update({ where: { id: profissionalId }, data: { ativo } });
  revalidatePath("/painel/profissionais");
}

export async function atualizarFotoProfissional(profissionalIdBruto: string, fotoBruta: string): Promise<void> {
  const usuario = await exigirDono();
  const resultado = atualizarFotoProfissionalSchema.safeParse({ profissionalId: profissionalIdBruto, foto: fotoBruta });
  if (!resultado.success) {
    throw new ValidacaoError(resultado.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const dados = resultado.data;

  const profissional = await db.profissional.findFirst({
    where: { id: dados.profissionalId, estabelecimentoId: usuario.estabelecimentoId },
  });
  if (!profissional) throw new NaoAutorizadoError();

  await db.profissional.update({ where: { id: dados.profissionalId }, data: { foto: dados.foto } });
  revalidatePath("/painel/profissionais");
}

export async function atualizarComissaoProfissional(_estadoAnterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  try {
    const usuario = await exigirDono();

    const resultado = atualizarComissaoSchema.safeParse({
      profissionalId: formData.get("profissionalId"),
      comissaoPercentual: formData.get("comissaoPercentual") || undefined,
    });
    if (!resultado.success) {
      return { erro: resultado.error.issues[0]?.message ?? "Dados inválidos." };
    }
    const dados = resultado.data;

    const profissional = await db.profissional.findFirst({
      where: { id: dados.profissionalId, estabelecimentoId: usuario.estabelecimentoId },
    });
    if (!profissional) throw new NaoAutorizadoError();

    await db.profissional.update({
      where: { id: dados.profissionalId },
      data: { comissaoPercentual: dados.comissaoPercentual },
    });

    revalidatePath("/painel/profissionais");
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}
