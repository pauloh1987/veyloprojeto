const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatarCentavos(centavos: number): string {
  return formatadorMoeda.format(centavos / 100);
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
