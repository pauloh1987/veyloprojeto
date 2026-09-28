"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Plus, X } from "lucide-react";
import { salvarHorariosSemana, type DiaHorarioInput } from "@/lib/acoes/horarios";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const NOMES_DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

interface ProfissionalComHorarios {
  id: string;
  nome: string;
  horarios: DiaHorarioInput[];
}

export function HorariosClient({ profissionais }: { profissionais: ProfissionalComHorarios[] }) {
  const [selecionadoId, setSelecionadoId] = useState(profissionais[0]?.id ?? "");

  if (profissionais.length === 0) {
    return <p className="text-text-muted">Nenhuma profissional cadastrada.</p>;
  }

  return (
    <div>
      {profissionais.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {profissionais.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelecionadoId(p.id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium",
                selecionadoId === p.id ? "bg-accent text-accent-foreground" : "bg-surface-2 text-text-muted hover:text-text",
              )}
            >
              {p.nome}
            </button>
          ))}
        </div>
      )}
      {profissionais
        .filter((p) => p.id === selecionadoId)
        .map((p) => (
          <FormularioSemana key={p.id} profissionalId={p.id} horariosIniciais={p.horarios} />
        ))}
    </div>
  );
}

function FormularioSemana({
  profissionalId,
  horariosIniciais,
}: {
  profissionalId: string;
  horariosIniciais: DiaHorarioInput[];
}) {
  const [dias, setDias] = useState(horariosIniciais);
  const [pendente, iniciar] = useTransition();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  function atualizar(diaSemana: number, campo: keyof DiaHorarioInput, valor: string | boolean | string[] | null) {
    setDias((atual) => atual.map((d) => (d.diaSemana === diaSemana ? { ...d, [campo]: valor } : d)));
  }

  /** Repete a lista de horários fixos deste dia em todos os outros dias abertos — o caso
   * comum é "terça a sexta nos mesmos horários". */
  function copiarFixosParaDiasAbertos(origem: DiaHorarioInput) {
    setDias((atual) =>
      atual.map((d) =>
        d.diaSemana !== origem.diaSemana && !d.fechado ? { ...d, horariosFixos: [...(origem.horariosFixos ?? [])] } : d,
      ),
    );
  }

  function salvar() {
    setMensagem(null);
    iniciar(async () => {
      const resultado = await salvarHorariosSemana(profissionalId, dias);
      setMensagem(
        resultado.sucesso
          ? { tipo: "ok", texto: "Horários salvos." }
          : { tipo: "erro", texto: resultado.erro ?? "Erro ao salvar." },
      );
    });
  }

  return (
    <div className="space-y-3">
      {dias.map((dia) => (
        <div key={dia.diaSemana} className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-text">{NOMES_DIAS[dia.diaSemana]}</p>
            <label className="flex items-center gap-2 text-sm text-text-muted">
              <input
                type="checkbox"
                checked={!dia.fechado}
                onChange={(e) => atualizar(dia.diaSemana, "fechado", !e.target.checked)}
                className="h-4 w-4 rounded"
              />
              Aberto
            </label>
          </div>
          {!dia.fechado && (
            <SeletorModo
              fixos={dia.horariosFixos !== null}
              aoMudar={(fixos) => atualizar(dia.diaSemana, "horariosFixos", fixos ? [] : null)}
            />
          )}
          {!dia.fechado && dia.horariosFixos !== null && (
            <EditorHorariosFixos
              horarios={dia.horariosFixos}
              aoMudar={(lista) => atualizar(dia.diaSemana, "horariosFixos", lista)}
              aoCopiar={() => copiarFixosParaDiasAbertos(dia)}
            />
          )}
          {!dia.fechado && dia.horariosFixos === null && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <CampoHora rotulo="Abre" valor={dia.abre} aoMudar={(v) => atualizar(dia.diaSemana, "abre", v)} />
              <CampoHora rotulo="Fecha" valor={dia.fecha} aoMudar={(v) => atualizar(dia.diaSemana, "fecha", v)} />
              <CampoHora
                rotulo="Almoço início"
                valor={dia.almocoInicio}
                aoMudar={(v) => atualizar(dia.diaSemana, "almocoInicio", v)}
              />
              <CampoHora
                rotulo="Almoço fim"
                valor={dia.almocoFim}
                aoMudar={(v) => atualizar(dia.diaSemana, "almocoFim", v)}
              />
            </div>
          )}
        </div>
      ))}

      <div className="flex items-center gap-3 pt-2">
        <Button onClick={salvar} disabled={pendente}>
          <Check size={16} /> {pendente ? "Salvando..." : "Salvar horários"}
        </Button>
        {mensagem && (
          <p className={mensagem.tipo === "ok" ? "text-sm text-success" : "text-sm text-danger"}>{mensagem.texto}</p>
        )}
      </div>
    </div>
  );
}

function SeletorModo({ fixos, aoMudar }: { fixos: boolean; aoMudar: (fixos: boolean) => void }) {
  const opcoes = [
    { fixos: false, rotulo: "Intervalo", dica: "Abre e fecha" },
    { fixos: true, rotulo: "Horários fixos", dica: "Só em horários certos" },
  ];
  return (
    <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1" role="radiogroup" aria-label="Tipo de horário">
      {opcoes.map((o) => (
        <button
          key={o.rotulo}
          type="button"
          role="radio"
          aria-checked={fixos === o.fixos}
          onClick={() => aoMudar(o.fixos)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-left text-sm transition-colors",
            fixos === o.fixos ? "bg-surface font-semibold text-text shadow-sm" : "text-text-muted hover:text-text",
          )}
        >
          {o.rotulo}
          <span className="block text-xs font-normal text-text-faint">{o.dica}</span>
        </button>
      ))}
    </div>
  );
}

function EditorHorariosFixos({
  horarios,
  aoMudar,
  aoCopiar,
}: {
  horarios: string[];
  aoMudar: (lista: string[]) => void;
  aoCopiar: () => void;
}) {
  const [novo, setNovo] = useState("");
  const ordenados = [...horarios].sort();

  function adicionar() {
    if (!novo || horarios.includes(novo)) return;
    aoMudar([...horarios, novo].sort());
    setNovo("");
  }

  return (
    <div className="mt-3 space-y-3">
      {ordenados.length === 0 ? (
        <p className="text-sm text-text-faint">Adicione os horários em que a cliente pode começar um atendimento.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {ordenados.map((h) => (
            <span
              key={h}
              className="inline-flex items-center gap-1 rounded-full bg-accent/10 py-1 pl-3 pr-1 text-sm font-semibold text-accent tabular-nums"
            >
              {h}
              <button
                type="button"
                onClick={() => aoMudar(horarios.filter((x) => x !== h))}
                className="rounded-full p-0.5 hover:bg-accent/20"
                aria-label={`Remover ${h}`}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="time"
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionar();
            }
          }}
          aria-label="Novo horário"
          className="rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-sm text-text"
        />
        <Button type="button" size="sm" variant="secondary" onClick={adicionar} disabled={!novo}>
          <Plus size={14} /> Adicionar
        </Button>
        {ordenados.length > 0 && (
          <Button type="button" size="sm" variant="ghost" onClick={aoCopiar}>
            <Copy size={14} /> Usar nos outros dias abertos
          </Button>
        )}
      </div>
    </div>
  );
}

function CampoHora({
  rotulo,
  valor,
  aoMudar,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-text-faint">{rotulo}</span>
      <input
        type="time"
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        className="w-full rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-sm text-text"
      />
    </label>
  );
}
