import { db } from "@/lib/db";
import { notificadorPadrao } from "./notificador";
import { textoConfirmacao, textoLembrete, textoPedidoRecebido } from "./textos";

const MINUTOS_LEMBRETE_ANTES = 24 * 60;
const AVANCO_SIMULACAO_MIN = 25 * 60;
const RELOGIO_ID = 1;

/** Cria a mensagem de confirmação (enviada de imediato) e o lembrete (agendado para 24h
 * antes do horário) de um agendamento recém-criado. */
export async function criarMensagensParaAgendamento(agendamentoId: string): Promise<void> {
  const agendamento = await db.agendamento.findUniqueOrThrow({
    where: { id: agendamentoId },
    include: { cliente: true, servico: true, estabelecimento: true },
  });

  const dadosTexto = {
    nomeEstabelecimento: agendamento.estabelecimento.nome,
    nomeServico: agendamento.servico.nome,
    inicio: agendamento.inicio,
    fuso: agendamento.estabelecimento.fuso,
  };

  const textoConf = agendamento.status === "PENDENTE" ? textoPedidoRecebido(dadosTexto) : textoConfirmacao(dadosTexto);
  const resultadoConf = await notificadorPadrao.enviar({
    canal: "SMS",
    destinatario: agendamento.cliente.telefone,
    texto: textoConf,
  });

  await db.mensagem.create({
    data: {
      agendamentoId,
      tipo: "CONFIRMACAO",
      canal: "SMS",
      status: resultadoConf.sucesso ? "ENVIADA" : "ERRO",
      texto: textoConf,
      agendadaPara: new Date(),
      enviadaEm: resultadoConf.sucesso ? new Date() : null,
    },
  });

  await db.mensagem.create({
    data: {
      agendamentoId,
      tipo: "LEMBRETE",
      canal: "SMS",
      status: "PENDENTE",
      texto: textoLembrete(dadosTexto),
      agendadaPara: new Date(agendamento.inicio.getTime() - MINUTOS_LEMBRETE_ANTES * 60_000),
    },
  });
}

/** "Agora" efetivo para fins de processamento da fila: horário real mais o deslocamento
 * acumulado pelo botão "Simular passagem do tempo" (0 até o primeiro clique). */
export async function obterAgoraEfetivo(): Promise<Date> {
  const relogio = await db.relogioSimulado.findUnique({ where: { id: RELOGIO_ID } });
  return new Date(Date.now() + (relogio?.offsetMin ?? 0) * 60_000);
}

/** Processa a fila: envia (via Notificador) toda mensagem pendente cujo agendamento não foi
 * cancelado e cujo horário programado já chegou, considerando o "agora" efetivo. */
export async function processarFilaMensagens(): Promise<{ processadas: number; agoraEfetivo: Date }> {
  const agoraEfetivo = await obterAgoraEfetivo();

  const pendentes = await db.mensagem.findMany({
    where: { status: "PENDENTE", agendadaPara: { lte: agoraEfetivo } },
    include: { agendamento: { include: { cliente: true } } },
  });

  for (const mensagem of pendentes) {
    if (mensagem.agendamento.status === "CANCELADO") {
      await db.mensagem.update({ where: { id: mensagem.id }, data: { status: "CANCELADA" } });
      continue;
    }

    const resultado = await notificadorPadrao.enviar({
      canal: mensagem.canal,
      destinatario: mensagem.agendamento.cliente.telefone,
      texto: mensagem.texto,
    });

    await db.mensagem.update({
      where: { id: mensagem.id },
      data: {
        status: resultado.sucesso ? "ENVIADA" : "ERRO",
        enviadaEm: resultado.sucesso ? mensagem.agendadaPara : null,
      },
    });
  }

  return { processadas: pendentes.length, agoraEfetivo };
}

/** Avança o relógio simulado e processa a fila em seguida. Usado pelo botão de demonstração
 * "Simular passagem do tempo" — não afeta o motor de disponibilidade, só o envio de mensagens. */
export async function simularPassagemDoTempo(): Promise<{ processadas: number; agoraEfetivo: Date }> {
  await db.relogioSimulado.upsert({
    where: { id: RELOGIO_ID },
    update: { offsetMin: { increment: AVANCO_SIMULACAO_MIN } },
    create: { id: RELOGIO_ID, offsetMin: AVANCO_SIMULACAO_MIN },
  });

  return processarFilaMensagens();
}

/** Cancela (sem enviar) qualquer lembrete ainda pendente de um agendamento cancelado. */
export async function cancelarMensagensPendentes(agendamentoId: string): Promise<void> {
  await db.mensagem.updateMany({
    where: { agendamentoId, status: "PENDENTE" },
    data: { status: "CANCELADA" },
  });
}
