"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

const NOMES_DIA = ["D", "S", "T", "Q", "Q", "S", "S"];
const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function somarDiasSimples(dataYMD: string, dias: number): string {
  const [y, m, d] = dataYMD.split("-").map(Number);
  const alvo = new Date(Date.UTC(y, m - 1, d, 12) + dias * 86_400_000);
  return `${alvo.getUTCFullYear()}-${String(alvo.getUTCMonth() + 1).padStart(2, "0")}-${String(alvo.getUTCDate()).padStart(2, "0")}`;
}

export function CalendarioMensal({
  mesReferenciaYMD,
  hojeYMD,
  limiteYMD,
  disponibilidade,
  carregandoDisponibilidade,
  selecionado,
  aoSelecionar,
  aoMudarMes,
}: {
  mesReferenciaYMD: string;
  hojeYMD: string;
  limiteYMD: string;
  disponibilidade: Map<string, boolean> | null;
  carregandoDisponibilidade: boolean;
  selecionado: string | null;
  aoSelecionar: (dataYMD: string) => void;
  aoMudarMes: (novoMesYMD: string) => void;
}) {
  const [ano, mes] = mesReferenciaYMD.split("-").map(Number);
  const primeiroDiaSemana = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay();
  const diasNoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const celulas: (string | null)[] = [
    ...Array.from({ length: primeiroDiaSemana }, () => null),
    ...Array.from({ length: diasNoMes }, (_, i) => `${ano}-${String(mes).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`),
  ];

  const mesAnteriorYMD = somarDiasSimples(`${ano}-${String(mes).padStart(2, "0")}-01`, -1);
  const mesSeguinteYMD = somarDiasSimples(`${ano}-${String(mes).padStart(2, "0")}-${String(diasNoMes).padStart(2, "0")}`, 1);
  const podeAvancar = mesSeguinteYMD <= limiteYMD;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Mês anterior"
          disabled={mesAnteriorYMD.slice(0, 7) < hojeYMD.slice(0, 7)}
          onClick={() => aoMudarMes(mesAnteriorYMD)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="font-heading font-bold text-text">
          {NOMES_MES[mes - 1]} {ano}
        </p>
        <button
          type="button"
          aria-label="Próximo mês"
          disabled={!podeAvancar}
          onClick={() => aoMudarMes(mesSeguinteYMD)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-text-faint">
        {NOMES_DIA.map((d, i) => (
          <div key={i} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {celulas.map((dataYMD, i) => {
          if (!dataYMD) return <div key={i} />;
          const foraDoAlcance = dataYMD < hojeYMD || dataYMD > limiteYMD;
          const temVaga = disponibilidade?.get(dataYMD);
          const desabilitado = foraDoAlcance || temVaga === false;
          const dia = Number(dataYMD.split("-")[2]);

          return (
            <button
              key={i}
              type="button"
              disabled={desabilitado || carregandoDisponibilidade}
              onClick={() => aoSelecionar(dataYMD)}
              aria-label={`Dia ${dia}${desabilitado ? ", sem vaga" : ""}`}
              aria-current={selecionado === dataYMD ? "date" : undefined}
              className={cn(
                "flex aspect-square items-center justify-center rounded-full text-sm transition-colors",
                foraDoAlcance && "text-text-faint/40",
                !foraDoAlcance && temVaga === false && "text-text-faint/60 line-through",
                !foraDoAlcance && (temVaga === true || (temVaga === undefined && !carregandoDisponibilidade)) && "text-text hover:bg-surface-2",
                selecionado === dataYMD && "bg-accent text-accent-foreground hover:bg-accent",
              )}
            >
              {dia}
            </button>
          );
        })}
      </div>
    </div>
  );
}
