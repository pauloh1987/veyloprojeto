"use client";

import type { StatusAgendamento } from "@prisma/client";
import { cn } from "@/lib/cn";

export interface EventoGrade {
  id: string;
  inicioMin: number;
  fimMin: number;
  titulo: string;
  subtitulo: string;
  cor: string;
  status: StatusAgendamento;
}
export interface ColunaGrade {
  chave: string;
  titulo: string;
  subtitulo?: string;
  eventos: EventoGrade[];
}

const ALTURA_HORA_PX = 64;
const HORA_INICIO = 7;
const HORA_FIM = 21;

function minParaPx(min: number): number {
  return ((min - HORA_INICIO * 60) / 60) * ALTURA_HORA_PX;
}

export function GradeAgenda({
  colunas,
  aoClicarVazio,
  aoClicarEvento,
}: {
  colunas: ColunaGrade[];
  aoClicarVazio: (chaveColuna: string, minutosDoDia: number) => void;
  aoClicarEvento: (eventoId: string) => void;
}) {
  const alturaTotal = (HORA_FIM - HORA_INICIO) * ALTURA_HORA_PX;
  const horas = Array.from({ length: HORA_FIM - HORA_INICIO }, (_, i) => HORA_INICIO + i);

  function clicouNoFundo(e: React.MouseEvent<HTMLDivElement>, chave: string) {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const minutosBrutos = HORA_INICIO * 60 + (offsetY / ALTURA_HORA_PX) * 60;
    const minutosArredondados = Math.round(minutosBrutos / 15) * 15;
    aoClicarVazio(chave, minutosArredondados);
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <div className="flex min-w-max">
        <div className="w-14 shrink-0 border-r border-border pt-8">
          {horas.map((h) => (
            <div key={h} style={{ height: ALTURA_HORA_PX }} className="relative">
              <span className="absolute -top-2.5 right-1.5 text-[11px] text-text-faint">{String(h).padStart(2, "0")}h</span>
            </div>
          ))}
        </div>

        {colunas.map((coluna) => (
          <div key={coluna.chave} className="w-[150px] shrink-0 border-r border-border last:border-r-0">
            <div className="h-8 border-b border-border px-2 pt-1">
              <p className="truncate text-xs font-semibold text-text">{coluna.titulo}</p>
              {coluna.subtitulo && <p className="truncate text-[10px] text-text-faint">{coluna.subtitulo}</p>}
            </div>
            <div
              className="relative cursor-pointer"
              style={{ height: alturaTotal }}
              onClick={(e) => clicouNoFundo(e, coluna.chave)}
            >
              {horas.map((h, i) => (
                <div
                  key={h}
                  className="absolute inset-x-0 border-t border-border/60"
                  style={{ top: i * ALTURA_HORA_PX }}
                />
              ))}
              {coluna.eventos.map((evento) => (
                <button
                  key={evento.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    aoClicarEvento(evento.id);
                  }}
                  className={cn(
                    "absolute inset-x-0.5 overflow-hidden rounded-md border-l-4 p-1 text-left shadow-sm",
                    evento.status === "CANCELADO" && "opacity-50",
                  )}
                  style={{
                    top: minParaPx(evento.inicioMin) + 1,
                    height: Math.max(minParaPx(evento.fimMin) - minParaPx(evento.inicioMin) - 2, 18),
                    backgroundColor: `color-mix(in oklab, ${evento.cor} 22%, var(--surface))`,
                    borderLeftColor: evento.cor,
                  }}
                >
                  <p className="truncate text-[11px] font-semibold text-text">{evento.titulo}</p>
                  <p className="truncate text-[10px] text-text-muted">{evento.subtitulo}</p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
