import { differenceInCalendarDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { paraDataYMD, somarDias } from "@/lib/tz";

/** Datas da tela Financeiro, a partir do dia civil já no fuso do salão ("2026-10-06"). */

function meioDia(dataYMD: string): Date {
  return new Date(`${dataYMD}T12:00:00Z`);
}

/** "06/10" */
export function diaEMes(dataYMD: string): string {
  return `${dataYMD.slice(8, 10)}/${dataYMD.slice(5, 7)}`;
}

/** "Hoje", "Ontem" ou "Terça, 06/10". */
export function rotuloDoDia(dataYMD: string, hojeYMD: string): string {
  if (dataYMD === hojeYMD) return "Hoje";
  if (dataYMD === somarDias(hojeYMD, -1)) return "Ontem";
  const texto = formatInTimeZone(meioDia(dataYMD), "UTC", "EEE, dd/MM", { locale: ptBR });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Quantos dias se passaram do dia de um instante (no fuso do salão) até hoje. */
export function diasAte(instante: Date, hojeYMD: string, fuso: string): number {
  return differenceInCalendarDays(meioDia(hojeYMD), meioDia(paraDataYMD(instante, fuso)));
}

export function haQuantoTempo(dias: number): string {
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  return `há ${dias} dias`;
}
