import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

export const FUSO_PADRAO = "America/Recife";

/** Formata um instante como "yyyy-MM-dd" na data civil correspondente ao fuso informado. */
export function paraDataYMD(instante: Date, fuso: string): string {
  return formatInTimeZone(instante, fuso, "yyyy-MM-dd");
}

/** Dia da semana (0=domingo..6=sábado) de uma data civil "yyyy-MM-dd". Não depende de fuso:
 * dia da semana de uma data de calendário é o mesmo em qualquer lugar do mundo. */
export function diaDaSemana(dataYMD: string): number {
  const [y, m, d] = dataYMD.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Soma (ou subtrai, com valor negativo) dias inteiros a uma data civil "yyyy-MM-dd", sem
 * depender do fuso da máquina que executa o código. Ancora ao meio-dia UTC para nunca cruzar
 * acidentalmente a virada do dia por causa de horário de verão. */
export function somarDias(dataYMD: string, dias: number): string {
  const [y, m, d] = dataYMD.split("-").map(Number);
  const meioDiaUtc = Date.UTC(y, m - 1, d, 12, 0, 0);
  const alvo = new Date(meioDiaUtc + dias * 86_400_000);
  const yy = alvo.getUTCFullYear();
  const mm = String(alvo.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(alvo.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Início (inclusivo) e fim (exclusivo) da data civil `dataYMD`, como instantes UTC, no fuso informado. */
export function limitesDoDia(dataYMD: string, fuso: string): { inicio: Date; fimExclusivo: Date } {
  const inicio = fromZonedTime(`${dataYMD}T00:00:00`, fuso);
  const fimExclusivo = fromZonedTime(`${somarDias(dataYMD, 1)}T00:00:00`, fuso);
  return { inicio, fimExclusivo };
}
