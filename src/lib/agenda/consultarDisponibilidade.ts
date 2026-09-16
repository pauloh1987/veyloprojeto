import type { Prisma } from "@prisma/client";
import { diaDaSemana, limitesDoDia } from "@/lib/tz";
import { calcularHorariosDisponiveis, type ConfigDiaTrabalho } from "./disponibilidade";

export interface ContextoDisponibilidade {
  profissionalId: string;
  dataYMD: string;
  fuso: string;
  duracaoMin: number;
  antecedenciaMinMin: number;
}

/**
 * Busca no banco tudo que o motor puro precisa (horário do dia, bloqueios, agendamentos
 * existentes) e calcula os horários disponíveis. Recebe o client do Prisma como parâmetro
 * (em vez de importar um singleton) para poder rodar tanto fora de transação (consulta de
 * disponibilidade) quanto dentro de uma (revalidação ao criar um agendamento).
 */
export async function calcularHorariosDisponiveisNoBanco(
  client: Prisma.TransactionClient,
  ctx: ContextoDisponibilidade,
): Promise<Date[]> {
  const diaSemana = diaDaSemana(ctx.dataYMD);
  const { inicio: inicioDia, fimExclusivo: fimDia } = limitesDoDia(ctx.dataYMD, ctx.fuso);

  const [horarioDia, bloqueios, agendamentosExistentes] = await Promise.all([
    client.horarioFuncionamento.findUnique({
      where: { profissionalId_diaSemana: { profissionalId: ctx.profissionalId, diaSemana } },
    }),
    client.bloqueio.findMany({
      where: { profissionalId: ctx.profissionalId, inicio: { lt: fimDia }, fim: { gt: inicioDia } },
    }),
    client.agendamento.findMany({
      where: {
        profissionalId: ctx.profissionalId,
        status: { not: "CANCELADO" },
        inicio: { lt: fimDia },
        fim: { gt: inicioDia },
      },
    }),
  ]);

  const configDia: ConfigDiaTrabalho | null =
    horarioDia && !horarioDia.fechado
      ? {
          abre: horarioDia.abre,
          fecha: horarioDia.fecha,
          almocoInicio: horarioDia.almocoInicio,
          almocoFim: horarioDia.almocoFim,
        }
      : null;

  return calcularHorariosDisponiveis({
    data: ctx.dataYMD,
    fuso: ctx.fuso,
    duracaoMin: ctx.duracaoMin,
    configDia,
    bloqueios: bloqueios.map((b) => ({ inicio: b.inicio, fim: b.fim })),
    agendamentos: agendamentosExistentes.map((a) => ({ inicio: a.inicio, fim: a.fim })),
    agora: new Date(),
    antecedenciaMinMin: ctx.antecedenciaMinMin,
  });
}
