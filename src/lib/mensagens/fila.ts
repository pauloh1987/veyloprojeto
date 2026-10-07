import { db } from "@/lib/db";
import { notificadorPadrao, type ResultadoEnvio } from "./notificador";
import {
  textoConfirmacao,
  textoConviteRetorno,
  textoLembrete,
  urlBaseSite,
  variaveisConviteRetorno,
  variaveisMensagem,
} from "./textos";

const MINUTOS_LEMBRETE_ANTES = 24 * 60;

async function carregarDadosDaMensagem(agendamentoId: string) {
  const agendamento = await db.agendamento.findUniqueOrThrow({
    where: { id: agendamentoId },
    include: { cliente: true, servico: true, estabelecimento: true },
  });
  const dadosTexto = {
    nomeEstabelecimento: agendamento.estabelecimento.nome,
    telefoneEstabelecimento: agendamento.estabelecimento.telefone,
    nomeServico: agendamento.servico.nome,
    inicio: agendamento.inicio,
    fuso: agendamento.estabelecimento.fuso,
  };
  return { agendamento, dadosTexto, variaveis: variaveisMensagem(dadosTexto) };
}

/** Manda na hora a mensagem de confirmação (com os botões Confirmar e Cancelar) e guarda o
 * resultado, inclusive o motivo da falha. Devolve o resultado para quem precisa reagir a uma
 * falha, como a pré-reserva do link. */
export async function enviarConfirmacao(agendamentoId: string): Promise<ResultadoEnvio> {
  const { agendamento, dadosTexto, variaveis } = await carregarDadosDaMensagem(agendamentoId);
  const texto = textoConfirmacao(dadosTexto);
  const resultado = await notificadorPadrao.enviar({
    canal: notificadorPadrao.canal,
    destinatario: agendamento.cliente.telefone,
    texto,
    tipo: "CONFIRMACAO",
    variaveis,
  });

  const confirmacao = await db.mensagem.create({
    data: {
      agendamentoId,
      tipo: "CONFIRMACAO",
      canal: notificadorPadrao.canal,
      status: resultado.sucesso ? "ENVIADA" : "ERRO",
      texto,
      variaveisTemplate: JSON.stringify(variaveis),
      agendadaPara: new Date(),
      enviadaEm: resultado.sucesso ? new Date() : null,
      sidProvedor: resultado.idProvedor ?? null,
      erro: resultado.sucesso ? null : (resultado.erro ?? "Falha sem detalhe."),
    },
  });
  if (!resultado.sucesso) registrarFalha(confirmacao.id, "CONFIRMACAO", resultado.erro);
  return resultado;
}

/** Agenda o lembrete para 24h antes do horário (sai na primeira rodada da fila depois disso). */
export async function criarLembrete(agendamentoId: string): Promise<void> {
  const { agendamento, dadosTexto, variaveis } = await carregarDadosDaMensagem(agendamentoId);
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

/** Mensagens de um agendamento que já nasce valendo: a confirmação (enviada de imediato, só se
 * a dona não tiver desligado isso em Configurações) e o lembrete (sempre criado — o toggle é
 * só sobre a confirmação). A pré-reserva do link segue outro caminho: ver
 * `src/lib/agenda/confirmacaoPeloWhatsApp.ts`. */
export async function criarMensagensParaAgendamento(agendamentoId: string): Promise<void> {
  const agendamento = await db.agendamento.findUniqueOrThrow({
    where: { id: agendamentoId },
    select: { estabelecimento: { select: { confirmacaoAutomatica: true } } },
  });
  if (agendamento.estabelecimento.confirmacaoAutomatica) await enviarConfirmacao(agendamentoId);
  await criarLembrete(agendamentoId);
}

/** Processa a fila: envia (via Notificador) toda mensagem pendente cujo horário programado já
 * chegou. Mensagens ligadas a um agendamento cancelado são
 * canceladas sem enviar; mensagens ligadas direto a um cliente (lembrete de retorno, sem
 * agendamento nenhum por trás) não têm esse conceito de cancelamento — só saem quando chega a
 * hora, a menos que o cliente tenha sido excluído nesse meio tempo (aí a linha nem existe mais,
 * por causa do onDelete: Cascade). */
export async function processarFilaMensagens(): Promise<{ processadas: number; agora: Date }> {
  const agora = new Date();

  const pendentes = await db.mensagem.findMany({
    where: { status: "PENDENTE", agendadaPara: { lte: agora } },
    include: { agendamento: { include: { cliente: true } }, cliente: true },
  });

  for (const mensagem of pendentes) {
    if (mensagem.agendamento?.status === "CANCELADO") {
      await db.mensagem.update({ where: { id: mensagem.id }, data: { status: "CANCELADA" } });
      continue;
    }

    // A fila roda só em alguns horários do dia (ver netlify/functions/cron-mensagens.mts). Se
    // por algum motivo ela ficar sem rodar, um lembrete nunca pode sair depois do horário.
    if (mensagem.tipo === "LEMBRETE" && mensagem.agendamento && mensagem.agendamento.inicio <= agora) {
      await db.mensagem.update({ where: { id: mensagem.id }, data: { status: "CANCELADA" } });
      continue;
    }

    await enviarMensagemGuardada(mensagem, agora);
  }

  return { processadas: pendentes.length, agora };
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
    telefoneEstabelecimento: cliente.estabelecimento.telefone,
    nomeServico: servicoNome,
  };
  const linkAgendar = `${urlBaseSite()}/${cliente.estabelecimento.slug}`;

  await db.mensagem.create({
    data: {
      clienteId,
      tipo: "CONVITE_RETORNO",
      canal: notificadorPadrao.canal,
      status: "PENDENTE",
      texto: textoConviteRetorno(dadosTexto, linkAgendar),
      variaveisTemplate: JSON.stringify(variaveisConviteRetorno(dadosTexto, linkAgendar)),
      agendadaPara: new Date(Date.now() + dias * 24 * 60 * 60_000),
    },
  });
}

function registrarFalha(mensagemId: string, tipo: string, erro: string | undefined): void {
  console.error(`[mensagens] ${tipo} ${mensagemId} não enviada: ${erro ?? "sem detalhe"}`);
}

type MensagemComCliente = Awaited<ReturnType<typeof buscarMensagemComCliente>>;

function buscarMensagemComCliente(mensagemId: string) {
  return db.mensagem.findUniqueOrThrow({
    where: { id: mensagemId },
    include: { agendamento: { include: { cliente: true } }, cliente: true },
  });
}

/** Envia uma mensagem já gravada (da fila ou um reenvio) e guarda o resultado, inclusive o
 * motivo da falha. */
async function enviarMensagemGuardada(
  mensagem: NonNullable<MensagemComCliente>,
  agora: Date,
): Promise<{ sucesso: boolean; erro?: string }> {
  const cliente = mensagem.cliente ?? mensagem.agendamento?.cliente;
  const resultado = cliente
    ? await notificadorPadrao.enviar({
        canal: mensagem.canal,
        destinatario: cliente.telefone,
        texto: mensagem.texto,
        tipo: mensagem.tipo,
        variaveis: mensagem.variaveisTemplate ? JSON.parse(mensagem.variaveisTemplate) : [],
      })
    : { sucesso: false, erro: "Cliente não encontrada." };

  await db.mensagem.update({
    where: { id: mensagem.id },
    data: {
      status: resultado.sucesso ? "ENVIADA" : "ERRO",
      enviadaEm: resultado.sucesso ? agora : null,
      sidProvedor: resultado.sucesso ? (resultado.idProvedor ?? null) : null,
      erro: resultado.sucesso ? null : (resultado.erro ?? "Falha sem detalhe."),
    },
  });
  if (!resultado.sucesso) registrarFalha(mensagem.id, mensagem.tipo, resultado.erro);
  return { sucesso: resultado.sucesso, erro: resultado.erro };
}

/** "Tentar de novo" numa mensagem que deu erro. Confirmação e lembrete só fazem sentido para
 * um horário que ainda vai acontecer e não foi cancelado. */
export async function reenviarMensagem(mensagemId: string): Promise<{ sucesso: boolean; erro?: string }> {
  const mensagem = await buscarMensagemComCliente(mensagemId);
  if (mensagem.status !== "ERRO") return { sucesso: false, erro: "Só dá para reenviar mensagens que deram erro." };
  if (mensagem.agendamento) {
    if (mensagem.agendamento.status === "CANCELADO") return { sucesso: false, erro: "Esse horário foi cancelado." };
    if (mensagem.agendamento.inicio <= new Date()) return { sucesso: false, erro: "Esse horário já passou." };
  }
  return enviarMensagemGuardada(mensagem, new Date());
}

/** Cancela (sem enviar) qualquer lembrete ainda pendente de um agendamento cancelado. */
export async function cancelarMensagensPendentes(agendamentoId: string): Promise<void> {
  await db.mensagem.updateMany({
    where: { agendamentoId, status: "PENDENTE" },
    data: { status: "CANCELADA" },
  });
}
