import type { OrigemAgendamento, StatusAgendamento } from "@prisma/client";
import { db } from "@/lib/db";
import { paraDataYMD } from "@/lib/tz";
import { criarMensagensParaAgendamento, enviarConfirmacao } from "@/lib/mensagens/fila";
import { ehErroDoNumeroDaCliente } from "@/lib/mensagens/erros";
import { avisarDona } from "@/lib/email/avisoDona";
import { ultimoDiaAgendavelYMD } from "./janelaAgendamento";
import { ConflitoDeHorarioError, NaoEncontradoError, ValidacaoError } from "@/lib/erros";
import { calcularHorariosDisponiveisNoBanco } from "./consultarDisponibilidade";
import { efetivarPreReserva, exigeConfirmacaoPeloWhatsApp } from "./confirmacaoPeloWhatsApp";
import { prazoParaConfirmar } from "./preReserva";

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
// Cada tentativa pelo link manda uma mensagem de confirmação para o número digitado.
const LIMITE_AGENDAMENTOS_PELO_LINK_POR_HORA = 5;

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

  // Mesma regra do link público: a janela de semanas à frente só limita a cliente, nunca
  // um encaixe manual da própria equipe.
  if (input.origem === "LINK" && dataYMD > ultimoDiaAgendavelYMD(estabelecimento)) {
    const semanas = estabelecimento.janelaAgendamentoSemanas;
    throw new ValidacaoError(
      `Esse horário ainda não está aberto — dá pra marcar até ${semanas} semana${semanas > 1 ? "s" : ""} à frente.`,
    );
  }

  // Agendamento manual (feito pela própria equipe) não se sujeita à antecedência mínima
  // pensada para o link público — um encaixe de última hora é uma decisão da profissional.
  const antecedenciaMinMin = input.origem === "MANUAL" ? 0 : estabelecimento.antecedenciaMinMin;

  const statusInicial: StatusAgendamento =
    input.origem === "LINK"
      ? await avaliarAbusoEDefinirStatus(input.clienteId, estabelecimento.id)
      : "CONFIRMADO";
  // Pelo link, com o WhatsApp ligado, nasce como pré-reserva: ver confirmacaoPeloWhatsApp.ts.
  const preReserva = input.origem === "LINK" && exigeConfirmacaoPeloWhatsApp();

  const agendamento = await db.$transaction(async (tx) => {
    if (preReserva) {
      // Uma pré-reserva por número: escolher outro horário solta a anterior.
      await tx.agendamento.updateMany({
        where: { clienteId: input.clienteId, estabelecimentoId: estabelecimento.id, status: "AGUARDANDO_CLIENTE" },
        data: { status: "CANCELADO" },
      });
    }
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
        status: preReserva ? "AGUARDANDO_CLIENTE" : statusInicial,
        confirmarAte: preReserva ? prazoParaConfirmar() : null,
        origem: input.origem,
        observacao: input.observacao ?? null,
      },
    });
  });

  if (preReserva) {
    const envio = await enviarConfirmacao(agendamento.id);
    if (envio.sucesso) return agendamento;
    if (ehErroDoNumeroDaCliente(envio.erro)) {
      await db.agendamento.update({ where: { id: agendamento.id }, data: { status: "CANCELADO" } });
      throw new ValidacaoError("Não conseguimos mandar mensagem para esse WhatsApp. Confira o número e tente de novo.");
    }
    // Falha do nosso lado (Twilio fora do ar, configuração): o salão não pode perder a cliente, então
    // o agendamento entra sem a confirmação, como era antes.
    await efetivarPreReserva(agendamento.id, statusInicial, { confirmadaPelaCliente: false });
    return { ...agendamento, status: statusInicial, confirmarAte: null };
  }

  await criarMensagensParaAgendamento(agendamento.id);
  // Só o que a cliente marcou sozinha pelo link vira aviso: o agendamento manual quem fez foi a dona.
  if (input.origem === "LINK") await avisarDona(agendamento.id, "novo");
  return agendamento;
}

/**
 * Contra "agendar só de sacanagem e não aparecer": limita quantos agendamentos futuros um
 * mesmo cliente pode ter em aberto, exige um intervalo mínimo entre uma tentativa e outra (e um
 * máximo de tentativas por hora, porque cada uma manda mensagem para o número digitado), e
 * manda para revisão (PENDENTE em vez de CONFIRMADO) quem já faltou demais antes. Nada disso
 * bloqueia definitivamente — a profissional sempre pode confirmar manualmente.
 */
async function avaliarAbusoEDefinirStatus(clienteId: string, estabelecimentoId: string): Promise<StatusAgendamento> {
  const agora = new Date();

  const [totalFuturos, ultimoAgendamento, totalNaUltimaHora] = await Promise.all([
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
      where: { clienteId, estabelecimentoId, origem: "LINK", criadoEm: { gte: new Date(agora.getTime() - 60 * 60_000) } },
    }),
  ]);

  if (totalFuturos >= LIMITE_AGENDAMENTOS_FUTUROS_POR_CLIENTE) {
    throw new ValidacaoError(
      `Você já tem ${totalFuturos} agendamentos marcados. Cancele algum antes de marcar outro.`,
    );
  }

  if (totalNaUltimaHora >= LIMITE_AGENDAMENTOS_PELO_LINK_POR_HORA) {
    throw new ValidacaoError("Muitas tentativas seguidas com esse número. Tente de novo mais tarde ou fale com o salão.");
  }

  if (ultimoAgendamento) {
    const minutosDesdeUltimo = (agora.getTime() - ultimoAgendamento.criadoEm.getTime()) / 60_000;
    if (minutosDesdeUltimo < COOLDOWN_ENTRE_AGENDAMENTOS_MIN) {
      throw new ValidacaoError("Aguarde um instante antes de marcar outro horário.");
    }
  }

  return statusPeloHistorico(clienteId, estabelecimentoId);
}

/** Quem já faltou demais entra como PENDENTE (a dona revisa); o resto, CONFIRMADO. Vale na hora de
 * agendar e de novo quando a cliente confirma uma pré-reserva. */
export async function statusPeloHistorico(clienteId: string, estabelecimentoId: string): Promise<StatusAgendamento> {
  const totalFaltas = await db.agendamento.count({ where: { clienteId, estabelecimentoId, status: "FALTOU" } });
  return totalFaltas >= LIMITE_FALTAS_PARA_EXIGIR_CONFIRMACAO ? "PENDENTE" : "CONFIRMADO";
}
