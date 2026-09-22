import type { Prisma } from "@prisma/client";

const ABRE_PADRAO = "09:00";
const FECHA_PADRAO = "18:00";
const ALMOCO_INICIO_PADRAO = "12:00";
const ALMOCO_FIM_PADRAO = "13:00";

/** Cria uma semana padrão (terça a sábado... na verdade segunda a sábado, domingo fechado)
 * de horário de funcionamento pra uma profissional recém-criada — dá pra ela editar depois
 * em Horários. Evita que um negócio novo comece com a agenda pública inteira fechada. */
export async function criarHorariosPadrao(tx: Prisma.TransactionClient, profissionalId: string): Promise<void> {
  await tx.horarioFuncionamento.createMany({
    data: Array.from({ length: 7 }, (_, diaSemana) => ({
      profissionalId,
      diaSemana,
      fechado: diaSemana === 0,
      abre: ABRE_PADRAO,
      fecha: FECHA_PADRAO,
      almocoInicio: diaSemana === 0 ? null : ALMOCO_INICIO_PADRAO,
      almocoFim: diaSemana === 0 ? null : ALMOCO_FIM_PADRAO,
    })),
  });
}
