const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatarCentavos(centavos: number): string {
  return formatadorMoeda.format(centavos / 100);
}

/** Valor digitado em reais ("130", "130,5", "1.300,50", "R$ 130,00", "130.50") em centavos.
 * Vazio ou fora do formato devolve null. */
export function reaisParaCentavos(texto: string): number | null {
  const limpo = texto.replace(/R\$|\s/g, "");
  if (!limpo) return null;
  let normalizado = limpo;
  if (limpo.includes(",")) normalizado = limpo.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) normalizado = limpo.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return null;
  return Math.round(Number(normalizado) * 100);
}

/** Centavos no formato de campo de valor: 13050 → "130,50". */
export function centavosParaCampo(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

export function formatarDuracao(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (resto === 0) return `${horas}h`;
  return `${horas}h${String(resto).padStart(2, "0")}`;
}

/** Aplica a máscara brasileira (99) 99999-9999 / (99) 9999-9999 enquanto o usuário digita. */
export function aplicarMascaraTelefone(valorAtual: string): string {
  const digitos = valorAtual.replace(/\D/g, "").slice(0, 11);

  if (digitos.length <= 2) return digitos.replace(/^(\d*)/, "($1");
  if (digitos.length <= 6) {
    return digitos.replace(/^(\d{2})(\d*)/, "($1) $2");
  }
  if (digitos.length <= 10) {
    return digitos.replace(/^(\d{2})(\d{4})(\d*)/, "($1) $2-$3");
  }
  return digitos.replace(/^(\d{2})(\d{5})(\d*)/, "($1) $2-$3");
}

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function telefoneValido(valor: string): boolean {
  const digitos = somenteDigitos(valor);
  return digitos.length === 10 || digitos.length === 11;
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
