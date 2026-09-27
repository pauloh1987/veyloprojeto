import { paraDataYMD, somarDias } from "@/lib/tz";

export const OPCOES_JANELA_SEMANAS = [1, 2, 3, 4, 6, 8, 12] as const;

/** Último dia (YYYY-MM-DD, no fuso do salão) que a cliente pode marcar pelo link público.
 * "1 semana" vai até o mesmo dia da semana que vem — ex.: num sábado, até o próximo sábado. */
export function ultimoDiaAgendavelYMD(
  estabelecimento: { fuso: string; janelaAgendamentoSemanas: number },
  agora: Date = new Date(),
): string {
  return somarDias(paraDataYMD(agora, estabelecimento.fuso), estabelecimento.janelaAgendamentoSemanas * 7);
}
