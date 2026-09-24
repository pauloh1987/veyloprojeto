"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirDono } from "@/lib/auth";
import { categoriaServicoSchema, idSchema } from "@/lib/validacao";
import { mensagemSeguraDeErro, NaoAutorizadoError, ValidacaoError } from "@/lib/erros";

export async function criarCategoriaServico(nomeBruto: string): Promise<void> {
  const usuario = await exigirDono();
  const resultado = categoriaServicoSchema.safeParse({ nome: nomeBruto });
  if (!resultado.success) {
    throw new ValidacaoError(resultado.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const maiorOrdem = await db.categoriaServico.aggregate({
    where: { estabelecimentoId: usuario.estabelecimentoId },
    _max: { ordem: true },
  });

  await db.categoriaServico.create({
    data: {
      nome: resultado.data.nome,
      ordem: (maiorOrdem._max.ordem ?? -1) + 1,
      estabelecimentoId: usuario.estabelecimentoId,
    },
  });
  revalidatePath("/painel/servicos");
}

export async function renomearCategoriaServico(categoriaIdBruto: string, nomeBruto: string): Promise<void> {
  const usuario = await exigirDono();
  const categoriaId = idSchema.parse(categoriaIdBruto);
  const resultado = categoriaServicoSchema.safeParse({ nome: nomeBruto });
  if (!resultado.success) {
    throw new ValidacaoError(resultado.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const categoria = await db.categoriaServico.findFirst({
    where: { id: categoriaId, estabelecimentoId: usuario.estabelecimentoId },
  });
  if (!categoria) throw new NaoAutorizadoError();

  await db.categoriaServico.update({ where: { id: categoriaId }, data: { nome: resultado.data.nome } });
  revalidatePath("/painel/servicos");
}

/** Exclui só a categoria — os serviços que estavam nela continuam existindo, só ficam sem
 * categoria (`onDelete: SetNull` no schema cuida disso automaticamente). */
export async function excluirCategoriaServico(categoriaIdBruto: string): Promise<void> {
  const usuario = await exigirDono();
  const categoriaId = idSchema.parse(categoriaIdBruto);

  const categoria = await db.categoriaServico.findFirst({
    where: { id: categoriaId, estabelecimentoId: usuario.estabelecimentoId },
  });
  if (!categoria) throw new NaoAutorizadoError();

  await db.categoriaServico.delete({ where: { id: categoriaId } });
  revalidatePath("/painel/servicos");
}

/** Troca a ordem da categoria com a vizinha imediata (pra cima ou pra baixo) — reordenar sem
 * precisar de drag-and-drop. */
export async function moverCategoriaServico(categoriaIdBruto: string, direcao: "cima" | "baixo"): Promise<void> {
  const usuario = await exigirDono();
  const categoriaId = idSchema.parse(categoriaIdBruto);

  const categorias = await db.categoriaServico.findMany({
    where: { estabelecimentoId: usuario.estabelecimentoId },
    orderBy: { ordem: "asc" },
  });
  const indice = categorias.findIndex((c) => c.id === categoriaId);
  if (indice === -1) throw new NaoAutorizadoError();

  const indiceVizinho = direcao === "cima" ? indice - 1 : indice + 1;
  if (indiceVizinho < 0 || indiceVizinho >= categorias.length) return;

  const atual = categorias[indice];
  const vizinho = categorias[indiceVizinho];

  await db.$transaction([
    db.categoriaServico.update({ where: { id: atual.id }, data: { ordem: vizinho.ordem } }),
    db.categoriaServico.update({ where: { id: vizinho.id }, data: { ordem: atual.ordem } }),
  ]);
  revalidatePath("/painel/servicos");
}
