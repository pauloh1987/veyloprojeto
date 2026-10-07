import type { DiaDeEntradas } from "@/lib/financeiro/resumoFinanceiro";
import { tetoDoGrafico } from "@/lib/financeiro/resumoFinanceiro";
import type { RecebimentoDoMes } from "@/lib/financeiro/dadosFinanceiro";
import { formatarCentavos, formatarCentavosCompacto } from "@/lib/formatadores";
import { cn } from "@/lib/cn";
import { diaEMes, rotuloDoDia } from "./formatos";

type Dia = DiaDeEntradas<RecebimentoDoMes>;

/** Dias com número embaixo do eixo: 1, 5, 10... e hoje (tirando os vizinhos de hoje, para os
 * números não se encostarem no celular). */
function diasComRotulo(quantidade: number, numeroHoje: number): Set<number> {
  const rotulados = new Set(
    [1, 5, 10, 15, 20, 25, 30].filter((n) => n <= quantidade && (numeroHoje === 0 || Math.abs(n - numeroHoje) > 2)),
  );
  if (numeroHoje > 0) rotulados.add(numeroHoje);
  return rotulados;
}

/** Quanto entrou em cada dia do mês, em colunas de uma cor só (a cor de dado do painel, não a do
 * salão). O valor aparece ao passar o mouse ou focar a coluna, e a coluna leva ao dia na lista
 * "Entradas dia a dia", que é a versão em tabela do gráfico. */
export function GraficoEntradas({ dias, hojeYMD, nomeMes }: { dias: Dia[]; hojeYMD: string; nomeMes: string }) {
  const teto = tetoDoGrafico(Math.max(0, ...dias.map((d) => d.totalCentavos)));
  if (teto === 0) return null;
  const numeroHoje = dias.findIndex((d) => d.dataYMD === hojeYMD) + 1;
  const rotulados = diasComRotulo(dias.length, numeroHoje);

  return (
    <figure className="mt-6">
      <figcaption className="sr-only">
        Entradas por dia em {nomeMes}. Os valores de cada dia também estão na lista Entradas dia a dia.
      </figcaption>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
        <div aria-hidden className="relative h-40 text-right text-[10px] leading-none text-text-faint tabular-nums">
          {/* Reserva a largura do maior rótulo; os rótulos de verdade ficam sobre as linhas da grade. */}
          <span className="invisible block whitespace-nowrap">{formatarCentavosCompacto(teto)}</span>
          <span className="absolute top-0 right-0 -translate-y-1/2 whitespace-nowrap">{formatarCentavosCompacto(teto)}</span>
          <span className="absolute top-1/2 right-0 -translate-y-1/2 whitespace-nowrap">{formatarCentavosCompacto(teto / 2)}</span>
          <span className="absolute right-0 bottom-0 translate-y-1/2 whitespace-nowrap">{formatarCentavosCompacto(0)}</span>
        </div>
        <div className="relative h-40">
          <div aria-hidden className="absolute inset-x-0 top-0 border-t border-border" />
          <div aria-hidden className="absolute inset-x-0 top-1/2 border-t border-border" />
          <ol className="absolute inset-0 flex items-end gap-0.5 border-b border-border-strong sm:gap-1">
            {dias.map((dia, indice) => (
              <Coluna key={dia.dataYMD} dia={dia} teto={teto} hojeYMD={hojeYMD} posicao={indice / Math.max(1, dias.length - 1)} />
            ))}
          </ol>
        </div>
        <div />
        <div aria-hidden className="mt-2 flex gap-0.5 sm:gap-1">
          {dias.map((dia, indice) => (
            <span
              key={dia.dataYMD}
              className={cn(
                "min-w-0 flex-1 text-center text-[10px] leading-none whitespace-nowrap",
                indice + 1 === numeroHoje ? "font-bold text-text" : "text-text-faint",
              )}
            >
              {rotulados.has(indice + 1) ? indice + 1 : ""}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}

function Coluna({ dia, teto, hojeYMD, posicao }: { dia: Dia; teto: number; hojeYMD: string; posicao: number }) {
  if (dia.totalCentavos <= 0) return <li aria-hidden className="h-full min-w-0 flex-1" />;

  const quantidade = dia.recebimentos.length;
  const pagamentos = `${quantidade} ${quantidade === 1 ? "pagamento" : "pagamentos"}`;
  const quando = rotuloDoDia(dia.dataYMD, hojeYMD);
  const quandoCompleto = quando === "Hoje" || quando === "Ontem" ? `${quando}, ${diaEMes(dia.dataYMD)}` : quando;
  // Coluna fina demais some: um mínimo visível para dias com pouco movimento.
  const altura = Math.max((dia.totalCentavos / teto) * 100, 1.5);

  return (
    <li className="flex h-full min-w-0 flex-1">
      <a
        href={`#dia-${dia.dataYMD}`}
        aria-label={`${quandoCompleto}: ${formatarCentavos(dia.totalCentavos)}, ${pagamentos}`}
        className="group relative flex h-full w-full items-end justify-center rounded-sm"
      >
        <span
          className="relative block w-full max-w-6 rounded-t-[4px] bg-grafico-1 transition-[filter] group-hover:brightness-110 group-focus-visible:brightness-110"
          style={{ height: `${altura}%` }}
        >
          <span
            className={cn(
              "pointer-events-none absolute bottom-full z-20 mb-2 hidden w-max rounded-lg border border-border bg-bg-elevated px-2.5 py-1.5 text-left shadow-lg group-hover:block group-focus-visible:block",
              posicao < 0.15 ? "left-0" : posicao > 0.85 ? "right-0" : "left-1/2 -translate-x-1/2",
            )}
          >
            <span className="block font-heading text-sm font-bold text-text">{formatarCentavos(dia.totalCentavos)}</span>
            <span className="block text-xs text-text-muted">
              {quandoCompleto} · {pagamentos}
            </span>
          </span>
        </span>
      </a>
    </li>
  );
}
