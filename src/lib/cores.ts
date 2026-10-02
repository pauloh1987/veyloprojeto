/** Contas de cor para a marca de cada salão (link público). */

function luminancia(hex: string): number | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Cor do texto sobre um fundo na cor do salão: escuro só para cores claras (amarelo, rosa-bebê,
 * verde-menta), branco no resto. O limite fica acima do que a fórmula da WCAG sugere porque, em
 * cores vivas de tom médio (o rosa e o verde mais usados), texto branco é o que se espera ver. */
export function corDoTextoSobre(hex: string): "#ffffff" | "#10151f" {
  const l = luminancia(hex);
  return l !== null && l > 0.45 ? "#10151f" : "#ffffff";
}

/** Cor do salão para texto e ícones sobre fundo branco: as cores claras escurecem para dar
 * leitura (um amarelo puro some no branco). Valor CSS, para usar numa variável. */
export function destaqueParaTexto(hex: string): string {
  return corDoTextoSobre(hex) === "#ffffff" ? hex : `color-mix(in oklab, ${hex} 55%, black)`;
}

/** Variáveis CSS da marca do salão na área pública: `--accent` (botões), `--accent-foreground`
 * (texto sobre eles) e `--destaque-texto` (texto e ícones na cor do salão sobre fundo branco). */
export function variaveisDaMarca(hex: string): Record<`--${string}`, string> {
  return { "--accent": hex, "--accent-foreground": corDoTextoSobre(hex), "--destaque-texto": destaqueParaTexto(hex) };
}
