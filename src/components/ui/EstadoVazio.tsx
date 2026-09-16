import type { ReactNode } from "react";

export function EstadoVazio({
  icone,
  titulo,
  descricao,
  acao,
}: {
  icone?: ReactNode;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      {icone && <div className="text-4xl">{icone}</div>}
      <div className="space-y-1">
        <p className="font-heading text-base font-bold text-text">{titulo}</p>
        {descricao && <p className="text-sm text-text-muted max-w-sm">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}
