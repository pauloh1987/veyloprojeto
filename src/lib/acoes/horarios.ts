"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { horarioDiaSchema } from "@/lib/validacao";
import { mensagemSeguraDeErro, NaoAutorizadoError } from "@/lib/erros";
import { registrarPassoGuia } from "@/lib/guia/progresso";
import { diaDaSemana, paraDataYMD } from "@/lib/tz";

export interface DiaHorarioInput {
  diaSemana: number;
  fechado: boolean;
  abre: string;
  fecha: string;
  almocoInicio: string;
  almocoFim: string;
  /** null = intervalo (abre/fecha/almoço); lista = só esses horários de início. */
  horariosFixos: string[] | null;
}

const fixosDe = (dia: { horariosFixos: string[] | null }) =>
  dia.horariosFixos && dia.horariosFixos.length > 0 ? [...new Set(dia.horariosFixos)].sort().join(",") : null;

/** Confere a sessão e se a profissional é do salão (a profissional só mexe nos próprios horários). */
async function exigirProfissionalDoSalao(profissionalId: string) {
  const usuario = await exigirSessao();
  if (usuario.papel === "PROFISSIONAL" && profissionalId !== usuario.profissionalId) {
    throw new NaoAutorizadoError();
  }
  const profissional = await db.profissional.findFirst({
    where: { id: profissionalId, estabelecimentoId: usuario.estabelecimentoId },
  });
  if (!profissional) throw new NaoAutorizadoError();
  return usuario;
}

export async function salvarHorariosSemana(
  profissionalId: string,
  dias: DiaHorarioInput[],
): Promise<{ erro?: string; sucesso?: boolean }> {
  try {
    const usuario = await exigirProfissionalDoSalao(profissionalId);

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
            horariosFixos: fixosDe(dia),
          },
          create: {
            profissionalId,
            diaSemana: dia.diaSemana,
            fechado: dia.fechado,
            abre: dia.abre,
            fecha: dia.fecha,
            almocoInicio: dia.almocoInicio || null,
            almocoFim: dia.almocoFim || null,
            horariosFixos: fixosDe(dia),
          },
        }),
      ),
    );

    await registrarPassoGuia(usuario.estabelecimentoId, "horarios");
    revalidatePath("/painel/horarios");
    revalidatePath("/painel/hoje");
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}

/** Horário de um dia só, sem dia da semana: usado nas datas especiais. */
export type HorarioDataInput = Omit<DiaHorarioInput, "diaSemana">;

const MAXIMO_DATAS_POR_VEZ = 62;

/**
 * Grava o mesmo horário em uma ou mais datas (ex.: os sábados de dezembro). Para essas datas ele
 * vale no lugar do horário da semana; as outras semanas continuam como estão. Se a data já tinha
 * horário especial, ele é trocado.
 */
export async function salvarHorariosEspeciais(
  profissionalId: string,
  datas: string[],
  horario: HorarioDataInput,
): Promise<{ erro?: string; sucesso?: boolean }> {
  try {
    const usuario = await exigirProfissionalDoSalao(profissionalId);

    const unicas = [...new Set(datas)].sort();
    if (unicas.length === 0) return { erro: "Escolha pelo menos uma data." };
    if (unicas.length > MAXIMO_DATAS_POR_VEZ) return { erro: `Escolha no máximo ${MAXIMO_DATAS_POR_VEZ} datas de cada vez.` };
    if (unicas.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d))) return { erro: "Data inválida." };
    const hoje = paraDataYMD(new Date(), usuario.estabelecimento.fuso);
    if (unicas[0] < hoje) return { erro: "Escolha datas de hoje em diante." };

    const resultado = horarioDiaSchema.safeParse({ ...horario, diaSemana: diaDaSemana(unicas[0]), profissionalId });
    if (!resultado.success) {
      return { erro: resultado.error.issues[0]?.message ?? "Horário inválido." };
    }

    const campos = {
      fechado: horario.fechado,
      abre: horario.abre,
      fecha: horario.fecha,
      almocoInicio: horario.almocoInicio || null,
      almocoFim: horario.almocoFim || null,
      horariosFixos: fixosDe(horario),
    };
    await db.$transaction(
      unicas.map((data) =>
        db.horarioEspecial.upsert({
          where: { profissionalId_data: { profissionalId, data } },
          update: campos,
          create: { profissionalId, data, ...campos },
        }),
      ),
    );

    revalidatePath("/painel/horarios");
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}

/** Apaga a data especial: o dia volta a seguir o horário da semana. */
export async function removerHorarioEspecial(id: string): Promise<{ erro?: string; sucesso?: boolean }> {
  try {
    const especial = await db.horarioEspecial.findUnique({ where: { id } });
    if (!especial) return { sucesso: true };
    await exigirProfissionalDoSalao(especial.profissionalId);
    await db.horarioEspecial.delete({ where: { id } });
    revalidatePath("/painel/horarios");
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}
