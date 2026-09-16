import type { OrigemAgendamento } from "@prisma/client";
import { db } from "@/lib/db";
import { paraDataYMD } from "@/lib/tz";
import { criarMensagensParaAgendamento } from "@/lib/mensagens/fila";
import { ConflitoDeHorarioError, NaoEncontradoError } from "@/lib/erros";
import { calcularHorariosDisponiveisNoBanco } from "./consultarDisponibilidade";

export interface CriarAgendamentoInput {
  estabelecimentoId: string;
  profissionalId: string;
  servicoId: string;
  clienteId: string;
  inicio: Date;
  origem: OrigemAgendamento;
  observacao?: string | null;
}

/**
 * Cria um agendamento revalidando a disponibilidade dentro de uma transação, contra o
 * estado mais atual do banco — a mesma checagem vale para o link público e para o
 * agendamento manual do painel, então é impossível criar um horário sobreposto mesmo
 * chamando a rota diretamente.
 */
export async function criarAgendamento(input: CriarAgendamentoInput) {
  const estabelecimento = await db.estabelecimento.findUnique({
    where: { id: input.estabelecimentoId },
  });
  if (!estabelecimento) throw new NaoEncontradoError("Estabelecimento");

  const servico = await db.servico.findFirst({
    where: { id: input.servicoId, estabelecimentoId: input.estabelecimentoId, ativo: true },
  });
  if (!servico) throw new NaoEncontradoError("Serviço");

  const profissional = await db.profissional.findFirst({
    where: { id: input.profissionalId, estabelecimentoId: input.estabelecimentoId, ativo: true },
  });
  if (!profissional) throw new NaoEncontradoError("Profissional");

  const fim = new Date(input.inicio.getTime() + servico.duracaoMin * 60_000);
  const dataYMD = paraDataYMD(input.inicio, estabelecimento.fuso);

  // Agendamento manual (feito pela própria equipe) não se sujeita à antecedência mínima
  // pensada para o link público — um encaixe de última hora é uma decisão da profissional.
  const antecedenciaMinMin = input.origem === "MANUAL" ? 0 : estabelecimento.antecedenciaMinMin;

  const agendamento = await db.$transaction(async (tx) => {
    const slotsDisponiveis = await calcularHorariosDisponiveisNoBanco(tx, {
      profissionalId: input.profissionalId,
      dataYMD,
      fuso: estabelecimento.fuso,
      duracaoMin: servico.duracaoMin,
      antecedenciaMinMin,
    });

    const disponivel = slotsDisponiveis.some((slot) => slot.getTime() === input.inicio.getTime());
    if (!disponivel) throw new ConflitoDeHorarioError();

    return tx.agendamento.create({
      data: {
        estabelecimentoId: estabelecimento.id,
        profissionalId: profissional.id,
        servicoId: servico.id,
        clienteId: input.clienteId,
        inicio: input.inicio,
        fim,
        status: "CONFIRMADO",
        origem: input.origem,
        observacao: input.observacao ?? null,
      },
    });
  });

  await criarMensagensParaAgendamento(agendamento.id);
  return agendamento;
}
