import { iniciais } from "@/lib/formatadores";
import { cn } from "@/lib/cn";

const CORES_FUNDO = [
  "#2F6FED", "#22B8A0", "#D94E7F", "#E0A83E", "#8E5CD9", "#3EA05C", "#D9764E", "#4E9AD9",
];

export function corParaNome(nome: string): string {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = (hash * 31 + nome.charCodeAt(i)) >>> 0;
  return CORES_FUNDO[hash % CORES_FUNDO.length];
}

const TAMANHOS = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

export function Avatar({
  nome,
  tamanho = "md",
  className,
}: {
  nome: string;
  tamanho?: keyof typeof TAMANHOS;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-heading font-bold text-white",
        TAMANHOS[tamanho],
        className,
      )}
      style={{ backgroundColor: corParaNome(nome) }}
      aria-hidden
    >
      {iniciais(nome)}
    </span>
  );
}
