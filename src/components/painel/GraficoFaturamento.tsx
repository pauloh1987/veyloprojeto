import { formatarCentavos } from "@/lib/formatadores";

export function GraficoFaturamento({ valoresCentavos }: { valoresCentavos: number[] }) {
  const maximo = Math.max(1, ...valoresCentavos);

  return (
    <div
      role="img"
      aria-label={`Faturamento por dia do mês, total de ${formatarCentavos(valoresCentavos.reduce((s, v) => s + v, 0))}`}
      className="flex h-32 items-end gap-[3px]"
    >
      {valoresCentavos.map((valor, indice) => (
        <div
          key={indice}
          title={`Dia ${indice + 1}: ${formatarCentavos(valor)}`}
          className="min-h-[2px] flex-1 rounded-t bg-accent/70"
          style={{ height: `${Math.max((valor / maximo) * 100, valor > 0 ? 4 : 0)}%` }}
        />
      ))}
    </div>
  );
}
