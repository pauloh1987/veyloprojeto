"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { horarioDiaSchema } from "@/lib/validacao";
import { mensagemSeguraDeErro, NaoAutorizadoError } from "@/lib/erros";

export interface DiaHorarioInput {
  diaSemana: number;
  fechado: boolean;
  abre: string;
  fecha: string;
  almocoInicio: string;
  almocoFim: string;
}

export async function salvarHorariosSemana(
  profissionalId: string,
  dias: DiaHorarioInput[],
): Promise<{ erro?: string; sucesso?: boolean }> {
  try {
    const usuario = await exigirSessao();
    if (usuario.papel === "PROFISSIONAL" && profissionalId !== usuario.profissionalId) {
      throw new NaoAutorizadoError();
    }
    const profissional = await db.profissional.findFirst({
      where: { id: profissionalId, estabelecimentoId: usuario.estabelecimentoId },
    });
    if (!profissional) throw new NaoAutorizadoError();

    for (const dia of dias) {
      const resultado = horarioDiaSchema.safeParse({ ...dia, profissionalId });
      if (!resultado.success) {
        return { erro: resultado.error.issues[0]?.message ?? "Horário inválido." };
      }
    }

    await db.$transaction(
      dias.map((dia) =>
        db.horarioFuncionamento.upsert({
          where: { profissionalId_diaSemana: { profissionalId, diaSemana: dia.diaSemana } },
          update: {
            fechado: dia.fechado,
            abre: dia.abre,
            fecha: dia.fecha,
            almocoInicio: dia.almocoInicio || null,
            almocoFim: dia.almocoFim || null,
          },
          create: {
            profissionalId,
            diaSemana: dia.diaSemana,
            fechado: dia.fechado,
            abre: dia.abre,
            fecha: dia.fecha,
            almocoInicio: dia.almocoInicio || null,
            almocoFim: dia.almocoFim || null,
          },
        }),
      ),
    );

    revalidatePath("/painel/horarios");
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}
