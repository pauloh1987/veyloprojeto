const DIAS_TESTE_GRATIS = 14;
const UM_DIA_MS = 24 * 60 * 60 * 1000;

interface AssinaturaEstabelecimento {
  criadoEm: Date;
  assinanteDesde: Date | null;
}

function fimDoTeste(estabelecimento: AssinaturaEstabelecimento): number {
  return estabelecimento.criadoEm.getTime() + DIAS_TESTE_GRATIS * UM_DIA_MS;
}

/** `assinanteDesde` nulo = ainda em teste grátis (todo estabelecimento novo começa assim).
 * Contas já existentes antes desse recurso foram marcadas como assinantes na migração, pra
 * não afetar ninguém retroativamente — só cadastros novos entram no período de teste. */
export function testeGratisExpirado(estabelecimento: AssinaturaEstabelecimento): boolean {
  if (estabelecimento.assinanteDesde) return false;
  return Date.now() > fimDoTeste(estabelecimento);
}
