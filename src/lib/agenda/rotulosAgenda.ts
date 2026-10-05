import { diaDaSemana, somarDias } from "../tz";

/** Textos do topo da Agenda: qual dia ou semana está aberta e a relação com hoje. */

const NOMES_MES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Segunda-feira da semana de `dataYMD` (a Agenda mostra semanas de segunda a domingo). */
export function segundaDaSemana(dataYMD: string): string {
  const dia = diaDaSemana(dataYMD);
  return somarDias(dataYMD, dia === 0 ? -6 : 1 - dia);
}

/** "Hoje", "Amanhã" ou "Ontem"; nulo para os outros dias. */
export function relacaoComHoje(dataYMD: string, hojeYMD: string): "Hoje" | "Amanhã" | "Ontem" | null {
  if (dataYMD === hojeYMD) return "Hoje";
  if (dataYMD === somarDias(hojeYMD, 1)) return "Amanhã";
  if (dataYMD === somarDias(hojeYMD, -1)) return "Ontem";
  return null;
}

/** "Esta semana", "Próxima semana" ou "Semana passada"; nulo para as outras. */
export function relacaoDaSemana(segundaYMD: string, hojeYMD: string): "Esta semana" | "Próxima semana" | "Semana passada" | null {
  const segundaDeHoje = segundaDaSemana(hojeYMD);
  if (segundaYMD === segundaDeHoje) return "Esta semana";
  if (segundaYMD === somarDias(segundaDeHoje, 7)) return "Próxima semana";
  if (segundaYMD === somarDias(segundaDeHoje, -7)) return "Semana passada";
  return null;
}

/** "5 – 11 de outubro", ou "29 de setembro – 5 de outubro" quando a semana vira o mês. */
export function rotuloDaSemana(segundaYMD: string): string {
  const domingoYMD = somarDias(segundaYMD, 6);
  const [, mesInicio, diaInicio] = segundaYMD.split("-").map(Number);
  const [, mesFim, diaFim] = domingoYMD.split("-").map(Number);
  if (mesInicio === mesFim) return `${diaInicio} – ${diaFim} de ${NOMES_MES[mesFim - 1]}`;
  return `${diaInicio} de ${NOMES_MES[mesInicio - 1]} – ${diaFim} de ${NOMES_MES[mesFim - 1]}`;
}
