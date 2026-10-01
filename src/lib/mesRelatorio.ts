import { paraDataYMD } from "./tz";

/** Mês de calendário (`mes` de 1 a 12), usado para escolher o mês do Relatório. */
export interface MesAno {
  ano: number;
  mes: number;
}

const NOMES_MES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "Setembro" (com inicial maiúscula, para títulos e botões). */
export function nomeDoMes({ mes }: MesAno): string {
  const nome = NOMES_MES[mes - 1];
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

/** Mês civil de um instante no fuso do estabelecimento. */
export function mesDoInstante(instante: Date, fuso: string): MesAno {
  const [ano, mes] = paraDataYMD(instante, fuso).split("-").map(Number);
  return { ano, mes };
}

function indice({ ano, mes }: MesAno): number {
  return ano * 12 + (mes - 1);
}

function doIndice(valor: number): MesAno {
  return { ano: Math.floor(valor / 12), mes: (valor % 12) + 1 };
}

export function somarMeses(mesAno: MesAno, quantidade: number): MesAno {
  return doIndice(indice(mesAno) + quantidade);
}

/** Lê o parâmetro `?mes=2026-09` da URL; null se ausente ou inválido. */
export function lerParametroMes(valor: unknown): MesAno | null {
  if (typeof valor !== "string") return null;
  const partes = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(valor);
  return partes ? { ano: Number(partes[1]), mes: Number(partes[2]) } : null;
}

export function parametroMes({ ano, mes }: MesAno): string {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

/** Mês mostrado no Relatório e os vizinhos para as setas. Vai do primeiro mês do negócio
 * (cadastro ou primeiro agendamento) até o mês atual; um pedido fora disso fica no limite. */
export function escolherMesRelatorio(pedido: MesAno | null, atual: MesAno, primeiro: MesAno) {
  const inicio = indice(primeiro) < indice(atual) ? primeiro : atual;
  const alvo = Math.min(Math.max(indice(pedido ?? atual), indice(inicio)), indice(atual));
  const mes = doIndice(alvo);
  return {
    mes,
    anterior: alvo > indice(inicio) ? somarMeses(mes, -1) : null,
    proximo: alvo < indice(atual) ? somarMeses(mes, 1) : null,
  };
}
