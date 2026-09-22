import type { OrigemAgendamento, StatusAgendamento } from "@prisma/client";
import { db } from "@/lib/db";
import { paraDataYMD } from "@/lib/tz";
import { criarMensagensParaAgendamento } from "@/lib/mensagens/fila";
import { ConflitoDeHorarioError, NaoEncontradoError, ValidacaoError } from "@/lib/erros";
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

// Proteções contra abuso do link público (agendar só de brincadeira e não aparecer).
// Não se aplicam a agendamento manual (origem MANUAL): aí é a própria equipe decidindo.
const LIMITE_FALTAS_PARA_EXIGIR_CONFIRMACAO = 2;
const LIMITE_AGENDAMENTOS_FUTUROS_POR_CLIENTE = 3;
const COOLDOWN_ENTRE_AGENDAMENTOS_MIN = 1;

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

  const statusInicial: StatusAgendamento =
    input.origem === "LINK"
      ? await avaliarAbusoEDefinirStatus(input.clienteId, estabelecimento.id)
      : "CONFIRMADO";

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
        status: statusInicial,
        origem: input.origem,
        observacao: input.observacao ?? null,
      },
    });
  });

  await criarMensagensParaAgendamento(agendamento.id);
  return agendamento;
}

/**
 * Contra "agendar só de sacanagem e não aparecer": limita quantos agendamentos futuros um
 * mesmo cliente pode ter em aberto, exige um intervalo mínimo entre uma tentativa e outra, e
 * manda para revisão (PENDENTE em vez de CONFIRMADO) quem já faltou demais antes. Nada disso
 * bloqueia definitivamente — a profissional sempre pode confirmar manualmente.
 */
async function avaliarAbusoEDefinirStatus(clienteId: string, estabelecimentoId: string): Promise<StatusAgendamento> {
  const agora = new Date();

  const [totalFuturos, ultimoAgendamento, totalFaltas] = await Promise.all([
    db.agendamento.count({
      where: {
        clienteId,
        estabelecimentoId,
        status: { in: ["PENDENTE", "CONFIRMADO"] },
        inicio: { gte: agora },
      },
    }),
    db.agendamento.findFirst({
      where: { clienteId, estabelecimentoId },
      orderBy: { criadoEm: "desc" },
      select: { criadoEm: true },
    }),
    db.agendamento.count({
      where: { clienteId, estabelecimentoId, status: "FALTOU" },
    }),
  ]);

  if (totalFuturos >= LIMITE_AGENDAMENTOS_FUTUROS_POR_CLIENTE) {
    throw new ValidacaoError(
      `Você já tem ${totalFuturos} agendamentos marcados. Cancele algum antes de marcar outro.`,
    );
  }

  if (ultimoAgendamento) {
    const minutosDesdeUltimo = (agora.getTime() - ultimoAgendamento.criadoEm.getTime()) / 60_000;
    if (minutosDesdeUltimo < COOLDOWN_ENTRE_AGENDAMENTOS_MIN) {
      throw new ValidacaoError("Aguarde um instante antes de marcar outro horário.");
    }
  }

  return totalFaltas >= LIMITE_FALTAS_PARA_EXIGIR_CONFIRMACAO ? "PENDENTE" : "CONFIRMADO";
}
