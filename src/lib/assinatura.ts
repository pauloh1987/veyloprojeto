export const DIAS_TESTE_GRATIS = 14;
const UM_DIA_MS = 24 * 60 * 60 * 1000;

interface AssinaturaEstabelecimento {
  criadoEm: Date;
  assinanteDesde: Date | null;
  parceira: boolean;
  testeAte: Date | null;
}

/** Fim do teste grátis: 14 dias depois do cadastro, ou a data definida no admin ao estender. */
export function fimDoTeste(estabelecimento: AssinaturaEstabelecimento): Date {
  return estabelecimento.testeAte ?? new Date(estabelecimento.criadoEm.getTime() + DIAS_TESTE_GRATIS * UM_DIA_MS);
}

export type SituacaoConta =
  | { tipo: "assinante"; desde: Date }
  | { tipo: "parceira" }
  | { tipo: "teste"; vence: Date; diasRestantes: number }
  | { tipo: "testeVencido"; venceu: Date };

/** `assinanteDesde` preenchido = conta paga; `parceira` = piloto sem cobrança (marcada no
 * admin). Fora isso a conta está no teste grátis, que vence em `fimDoTeste`. Contas existentes
 * antes do teste grátis foram marcadas como assinantes na migração, pra não afetar ninguém. */
export function situacaoDaConta(estabelecimento: AssinaturaEstabelecimento, agora: Date = new Date()): SituacaoConta {
  if (estabelecimento.assinanteDesde) return { tipo: "assinante", desde: estabelecimento.assinanteDesde };
  if (estabelecimento.parceira) return { tipo: "parceira" };
  const vence = fimDoTeste(estabelecimento);
  const restanteMs = vence.getTime() - agora.getTime();
  if (restanteMs < 0) return { tipo: "testeVencido", venceu: vence };
  return { tipo: "teste", vence, diasRestantes: Math.ceil(restanteMs / UM_DIA_MS) };
}

export function testeGratisExpirado(estabelecimento: AssinaturaEstabelecimento, agora: Date = new Date()): boolean {
  return situacaoDaConta(estabelecimento, agora).tipo === "testeVencido";
}

/** Novo fim do teste ao estender pelo admin: soma a partir do fim atual ou, se o teste já
 * venceu, a partir de agora. */
export function testeEstendido(estabelecimento: AssinaturaEstabelecimento, dias: number, agora: Date = new Date()): Date {
  const base = Math.max(fimDoTeste(estabelecimento).getTime(), agora.getTime());
  return new Date(base + dias * UM_DIA_MS);
}
