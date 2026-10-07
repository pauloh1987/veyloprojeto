import type { StatusAgendamento } from "@prisma/client";
import { db } from "@/lib/db";
import { notificadorPadrao, whatsAppSimulado } from "@/lib/mensagens/notificador";
import { criarLembrete, enviarConfirmacao } from "@/lib/mensagens/fila";
import { avisarDona } from "@/lib/email/avisoDona";
import { preReservaNoPrazo } from "./preReserva";

/**
 * Pré-reserva do link público (as regras puras ficam em preReserva.ts). Com o WhatsApp ligado, o
 * agendamento que a cliente faz pelo link nasce como AGUARDANDO_CLIENTE e a mensagem de
 * confirmação (botões Confirmar e Cancelar) sai na hora. Só quando ela toca em Confirmar o horário
 * vira agendamento: aí a dona é avisada e o lembrete de 24h é agendado. Isso prova que o número é
 * dela e acaba com o agendamento feito com número inventado para lotar a agenda. A pré-reserva
 * não aparece no painel.
 */

/** Envios da mensagem de confirmação por pré-reserva (o primeiro e os reenvios). */
export const MAXIMO_ENVIOS_CONFIRMACAO = 3;
export const SEGUNDOS_ENTRE_REENVIOS = 60;

/** Sem WhatsApp (ambiente local, ou só SMS) a cliente não tem botão para tocar: o link agenda
 * direto, como antes. */
export function exigeConfirmacaoPeloWhatsApp(): boolean {
  return notificadorPadrao.canal === "WHATSAPP";
}

/** Número de WhatsApp da Veylo (só dígitos), para o botão "Abrir o WhatsApp" da tela de espera
 * levar direto para a conversa onde a confirmação chegou. */
export function numeroWhatsAppDaVeylo(): string | null {
  if (!exigeConfirmacaoPeloWhatsApp() || whatsAppSimulado) return null;
  return process.env.TWILIO_WHATSAPP_FROM?.replace(/\D/g, "") || null;
}

/** A pré-reserva vira agendamento de verdade: sai do painel de espera, a dona é avisada e o
 * lembrete de 24h é agendado. `confirmadaPelaCliente` é falso só quando o WhatsApp falhou do
 * nosso lado e o agendamento entrou sem a confirmação (o salão não pode perder a cliente). */
export async function efetivarPreReserva(
  agendamentoId: string,
  status: StatusAgendamento,
  { confirmadaPelaCliente }: { confirmadaPelaCliente: boolean },
): Promise<void> {
  await db.agendamento.update({
    where: { id: agendamentoId },
    data: { status, confirmarAte: null, ...(confirmadaPelaCliente ? { presencaConfirmadaEm: new Date() } : {}) },
  });
  await criarLembrete(agendamentoId);
  await avisarDona(agendamentoId, "novo");
}

export type ResultadoReenvio = { sucesso: true } | { sucesso: false; erro: string };

/** "Não chegou? Reenviar": manda de novo a confirmação de uma pré-reserva no prazo. Tem intervalo
 * mínimo e limite de envios para o botão não virar um jeito de disparar mensagem para qualquer
 * número. */
export async function reenviarConfirmacaoDaPreReserva(agendamentoId: string): Promise<ResultadoReenvio> {
  const agendamento = await db.agendamento.findUniqueOrThrow({
    where: { id: agendamentoId },
    include: { mensagens: { where: { tipo: "CONFIRMACAO" }, orderBy: { agendadaPara: "desc" } } },
  });
  if (agendamento.status !== "AGUARDANDO_CLIENTE" || !preReservaNoPrazo(agendamento.confirmarAte)) {
    return { sucesso: false, erro: "Esse horário não está mais esperando confirmação." };
  }
  if (agendamento.mensagens.length >= MAXIMO_ENVIOS_CONFIRMACAO) {
    return { sucesso: false, erro: "Já mandamos a mensagem algumas vezes. Confira se o número está certo." };
  }
  const ultimoEnvio = agendamento.mensagens[0]?.agendadaPara;
  if (ultimoEnvio && Date.now() - ultimoEnvio.getTime() < SEGUNDOS_ENTRE_REENVIOS * 1000) {
    return { sucesso: false, erro: "Espere um minutinho antes de pedir de novo." };
  }
  const envio = await enviarConfirmacao(agendamentoId);
  return envio.sucesso ? { sucesso: true } : { sucesso: false, erro: "Não conseguimos mandar a mensagem. Confira o número." };
}
