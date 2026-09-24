import { db } from "@/lib/db";
import { notificadorPadrao } from "./notificador";
import { textoConfirmacao, textoConviteRetorno, textoLembrete, textoPedidoRecebido, variaveisMensagem } from "./textos";

const MINUTOS_LEMBRETE_ANTES = 24 * 60;
const AVANCO_SIMULACAO_MIN = 25 * 60;
const RELOGIO_ID = 1;

/** Cria a mensagem de confirmação (enviada de imediato, só se a dona não tiver desligado isso
 * em Configurações) e o lembrete (agendado para 24h antes do horário, sempre criado — o
 * toggle é só sobre a confirmação) de um agendamento recém-criado. */
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

  const variaveis = variaveisMensagem(dadosTexto);

  if (agendamento.estabelecimento.confirmacaoAutomatica) {
    const textoConf = agendamento.status === "PENDENTE" ? textoPedidoRecebido(dadosTexto) : textoConfirmacao(dadosTexto);
    const resultadoConf = await notificadorPadrao.enviar({
      canal: notificadorPadrao.canal,
      destinatario: agendamento.cliente.telefone,
      texto: textoConf,
      tipo: "CONFIRMACAO",
      variaveis,
    });

    await db.mensagem.create({
      data: {
        agendamentoId,
        tipo: "CONFIRMACAO",
        canal: notificadorPadrao.canal,
        status: resultadoConf.sucesso ? "ENVIADA" : "ERRO",
        texto: textoConf,
        variaveisTemplate: JSON.stringify(variaveis),
        agendadaPara: new Date(),
        enviadaEm: resultadoConf.sucesso ? new Date() : null,
      },
    });
  }

  await db.mensagem.create({
    data: {
      agendamentoId,
      tipo: "LEMBRETE",
      canal: notificadorPadrao.canal,
      status: "PENDENTE",
      texto: textoLembrete(dadosTexto),
      variaveisTemplate: JSON.stringify(variaveis),
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

/** Processa a fila: envia (via Notificador) toda mensagem pendente cujo horário programado já
 * chegou, considerando o "agora" efetivo. Mensagens ligadas a um agendamento cancelado são
 * canceladas sem enviar; mensagens ligadas direto a um cliente (lembrete de retorno, sem
 * agendamento nenhum por trás) não têm esse conceito de cancelamento — só saem quando chega a
 * hora, a menos que o cliente tenha sido excluído nesse meio tempo (aí a linha nem existe mais,
 * por causa do onDelete: Cascade). */
export async function processarFilaMensagens(): Promise<{ processadas: number; agoraEfetivo: Date }> {
  const agoraEfetivo = await obterAgoraEfetivo();

  const pendentes = await db.mensagem.findMany({
    where: { status: "PENDENTE", agendadaPara: { lte: agoraEfetivo } },
    include: { agendamento: { include: { cliente: true } }, cliente: true },
  });

  for (const mensagem of pendentes) {
    if (mensagem.agendamento?.status === "CANCELADO") {
      await db.mensagem.update({ where: { id: mensagem.id }, data: { status: "CANCELADA" } });
      continue;
    }

    const cliente = mensagem.cliente ?? mensagem.agendamento?.cliente;
    if (!cliente) {
      await db.mensagem.update({ where: { id: mensagem.id }, data: { status: "ERRO" } });
      continue;
    }

    const resultado = await notificadorPadrao.enviar({
      canal: mensagem.canal,
      destinatario: cliente.telefone,
      texto: mensagem.texto,
      tipo: mensagem.tipo,
      variaveis: mensagem.variaveisTemplate ? JSON.parse(mensagem.variaveisTemplate) : [],
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

/** Agenda um lembrete de retorno (ex. manutenção) pra daqui X dias, direto pro cliente — sem
 * estar ligado a nenhum agendamento específico. Usa o mesmo texto/template fixo de sempre
 * (`textoConviteRetorno`), só variando o serviço mencionado e a data de envio, porque WhatsApp
 * de negócio não permite mandar texto totalmente livre (precisa de template aprovado). */
export async function criarLembreteRetorno(clienteId: string, servicoNome: string, dias: number): Promise<void> {
  const cliente = await db.cliente.findUniqueOrThrow({
    where: { id: clienteId },
    include: { estabelecimento: true },
  });

  const dadosTexto = {
    nomeEstabelecimento: cliente.estabelecimento.nome,
    nomeServico: servicoNome,
    inicio: new Date(),
    fuso: cliente.estabelecimento.fuso,
  };

  await db.mensagem.create({
    data: {
      clienteId,
      tipo: "CONVITE_RETORNO",
      canal: notificadorPadrao.canal,
      status: "PENDENTE",
      texto: textoConviteRetorno(dadosTexto),
      variaveisTemplate: JSON.stringify([dadosTexto.nomeEstabelecimento, dadosTexto.nomeServico]),
      agendadaPara: new Date(Date.now() + dias * 24 * 60 * 60_000),
    },
  });
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
