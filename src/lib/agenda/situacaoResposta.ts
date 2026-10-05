import { formatInTimeZone } from "date-fns-tz";
import type { Prisma, StatusAgendamento } from "@prisma/client";
import { paraDataYMD, somarDias } from "../tz";

/** Como a cliente respondeu aos avisos de WhatsApp (botões Confirmar e Cancelar), para o painel.
 * "Sem resposta" só aparece depois que um aviso com os botões saiu de fato, e só até o fim do
 * horário. É um aviso para a dona chamar a cliente: o agendamento continua na agenda. */
export type SituacaoResposta = "confirmou" | "semResposta" | null;

/** Para incluir nas buscas de agendamento (`mensagens`): um aviso com botões já enviado, se houver. */
export const AVISO_COM_BOTOES_ENVIADO = {
  where: { tipo: { in: ["CONFIRMACAO", "LEMBRETE"] }, status: "ENVIADA" },
  select: { id: true },
  take: 1,
} satisfies Prisma.Agendamento$mensagensArgs;

export function situacaoResposta(
  agendamento: { status: StatusAgendamento; fim: Date; presencaConfirmadaEm: Date | null; mensagens: unknown[] },
  agora = new Date(),
): SituacaoResposta {
  if (agendamento.status === "CANCELADO") return null;
  if (agendamento.presencaConfirmadaEm) return "confirmou";
  if (agendamento.status !== "PENDENTE" && agendamento.status !== "CONFIRMADO") return null;
  return agendamento.mensagens.length > 0 && agendamento.fim > agora ? "semResposta" : null;
}

/** Mensagem pronta para a dona chamar a cliente no WhatsApp dela e confirmar o horário. */
export function textoParaConfirmarHorario(
  dados: { nomeCliente: string; servico: string; inicio: Date; fuso: string },
  agora = new Date(),
): string {
  const primeiroNome = dados.nomeCliente.trim().split(/\s+/)[0] ?? "";
  const diaYMD = paraDataYMD(dados.inicio, dados.fuso);
  const hojeYMD = paraDataYMD(agora, dados.fuso);
  const quando =
    diaYMD === hojeYMD
      ? "hoje"
      : diaYMD === somarDias(hojeYMD, 1)
        ? "amanhã"
        : `no dia ${formatInTimeZone(dados.inicio, dados.fuso, "dd/MM")}`;
  const hora = formatInTimeZone(dados.inicio, dados.fuso, "HH:mm");
  return `Oi, ${primeiroNome}! Tudo bem? Passando para confirmar seu horário de ${dados.servico} ${quando} às ${hora}. Posso confirmar?`;
}
