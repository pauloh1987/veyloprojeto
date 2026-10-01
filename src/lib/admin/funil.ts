/** Funil comercial do admin. Sem acesso ao banco, para servir também aos componentes do
 * navegador. */

export const ETAPAS_FUNIL = [
  { id: "PROSPECCAO", rotulo: "Prospecção" },
  { id: "CONTATO", rotulo: "Contato feito" },
  { id: "DEMONSTRACAO", rotulo: "Demonstração" },
  { id: "EM_TESTE", rotulo: "Em teste" },
  { id: "FECHADO", rotulo: "Fechado" },
  { id: "PERDIDO", rotulo: "Perdido" },
] as const;

export type EtapaFunil = (typeof ETAPAS_FUNIL)[number]["id"];

export const IDS_ETAPAS = ETAPAS_FUNIL.map((etapa) => etapa.id) as [EtapaFunil, ...EtapaFunil[]];

/** Etapas de quem ainda não criou conta: é nelas que o cadastro procura o contato para ligar
 * ao salão novo (e passar para "Em teste"). */
export const ETAPAS_ANTES_DO_CADASTRO: EtapaFunil[] = ["PROSPECCAO", "CONTATO", "DEMONSTRACAO"];

export const SEGMENTOS = ["Salão", "Barbearia", "Esmalteria", "Sobrancelhas", "Estética", "Outro"];

export function rotuloEtapa(etapa: EtapaFunil): string {
  return ETAPAS_FUNIL.find((e) => e.id === etapa)?.rotulo ?? etapa;
}

/** Próxima etapa no caminho normal (Prospecção → ... → Fechado); null no fim ou em Perdido. */
export function proximaEtapa(etapa: EtapaFunil): EtapaFunil | null {
  if (etapa === "FECHADO" || etapa === "PERDIDO") return null;
  return IDS_ETAPAS[IDS_ETAPAS.indexOf(etapa) + 1] ?? null;
}

/** Chave para comparar telefones brasileiros: DDD + 8 últimos dígitos, ignorando o +55 e o 9
 * extra do celular ("(81) 99165-5358" e "558191655358" dão a mesma chave). */
export function chaveTelefone(telefone: string): string | null {
  let digitos = telefone.replace(/\D/g, "");
  if (digitos.length >= 12 && digitos.startsWith("55")) digitos = digitos.slice(2);
  if (digitos.length < 10) return null;
  return digitos.slice(0, 2) + digitos.slice(-8);
}

/** "@studio", "studio" ou o link do perfil → "studio". */
export function normalizarInstagram(valor: string): string {
  return valor
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
}
