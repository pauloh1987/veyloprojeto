"use server";

import { revalidatePath } from "next/cache";
import { fromZonedTime } from "date-fns-tz";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { bloqueioSchema, idSchema } from "@/lib/validacao";
import { mensagemSeguraDeErro, NaoAutorizadoError } from "@/lib/erros";
import type { EstadoAcao } from "./agendamentos";

export async function criarBloqueio(_estadoAnterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  try {
    const usuario = await exigirSessao();

    const resultado = bloqueioSchema.safeParse({
      profissionalId: formData.get("profissionalId"),
      data: formData.get("data"),
      horaInicio: formData.get("horaInicio"),
      horaFim: formData.get("horaFim"),
      motivo: formData.get("motivo"),
    });
    if (!resultado.success) {
      return { erro: resultado.error.issues[0]?.message ?? "Dados inválidos." };
    }
    const dados = resultado.data;

    if (usuario.papel === "PROFISSIONAL" && dados.profissionalId !== usuario.profissionalId) {
      throw new NaoAutorizadoError();
    }
    const profissional = await db.profissional.findFirst({
      where: { id: dados.profissionalId, estabelecimentoId: usuario.estabelecimentoId },
    });
    if (!profissional) throw new NaoAutorizadoError();

    const fuso = usuario.estabelecimento.fuso;
    await db.bloqueio.create({
      data: {
        profissionalId: dados.profissionalId,
        inicio: fromZonedTime(`${dados.data}T${dados.horaInicio}:00`, fuso),
        fim: fromZonedTime(`${dados.data}T${dados.horaFim}:00`, fuso),
        motivo: dados.motivo,
      },
    });

    revalidatePath("/painel/bloqueios");
    revalidatePath("/painel/agenda");
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}

export async function removerBloqueio(bloqueioIdBruto: string): Promise<void> {
  const bloqueioId = idSchema.parse(bloqueioIdBruto);
  const usuario = await exigirSessao();
  const bloqueio = await db.bloqueio.findUnique({
    where: { id: bloqueioId },
    include: { profissional: true },
  });
  if (!bloqueio || bloqueio.profissional.estabelecimentoId !== usuario.estabelecimentoId) {
    throw new NaoAutorizadoError();
  }
  if (usuario.papel === "PROFISSIONAL" && bloqueio.profissionalId !== usuario.profissionalId) {
    throw new NaoAutorizadoError();
  }
  await db.bloqueio.delete({ where: { id: bloqueioId } });
  revalidatePath("/painel/bloqueios");
  revalidatePath("/painel/agenda");
}
