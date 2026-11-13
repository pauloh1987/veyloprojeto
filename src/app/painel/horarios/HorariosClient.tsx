"use client";

import { useState, useTransition } from "react";
import { CalendarPlus, Check, Copy, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  removerHorariosEspeciais,
  salvarHorariosEspeciais,
  salvarHorariosSemana,
  type DiaHorarioInput,
  type HorarioDataInput,
} from "@/lib/acoes/horarios";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const NOMES_DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export interface HorarioEspecialTela extends HorarioDataInput {
  id: string;
  data: string;
}

interface ProfissionalComHorarios {
  id: string;
  nome: string;
  horarios: DiaHorarioInput[];
  especiais: HorarioEspecialTela[];
}

export function HorariosClient({ profissionais, hoje }: { profissionais: ProfissionalComHorarios[]; hoje: string }) {
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
          <div key={p.id} className="space-y-10">
            <FormularioSemana profissionalId={p.id} horariosIniciais={p.horarios} />
            <DatasEspeciais profissionalId={p.id} especiais={p.especiais} semana={p.horarios} hoje={hoje} />
          </div>
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

  function atualizar(diaSemana: number, campo: keyof HorarioDataInput, valor: string | boolean | string[] | null) {
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
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-bold text-text">Toda semana</h2>
      {dias.map((dia) => (
        <div key={dia.diaSemana} className="rounded-2xl border border-border bg-surface p-4">
          <EditorDia
            titulo={NOMES_DIAS[dia.diaSemana]}
            dia={dia}
            aoMudar={(campo, valor) => atualizar(dia.diaSemana, campo, valor)}
            aoCopiarFixos={() => copiarFixosParaDiasAbertos(dia)}
          />
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
    </section>
  );
}

/** "sáb., 20 de dez." a partir de "2026-12-20" (a data já é do salão, então formata em UTC). */
function rotuloData(dataYMD: string, completo = false): string {
  const texto = new Date(`${dataYMD}T12:00:00Z`).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    weekday: completo ? "long" : "short",
    day: "numeric",
    month: completo ? "long" : "short",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function resumoHorario(h: HorarioDataInput): string {
  if (h.fechado) return "Fechado";
  if (h.horariosFixos) return `Horários: ${[...h.horariosFixos].sort().join(", ")}`;
  const almoco = h.almocoInicio && h.almocoFim ? `, almoço ${h.almocoInicio}–${h.almocoFim}` : "";
  return `${h.abre} às ${h.fecha}${almoco}`;
}

function diaDaSemanaDe(dataYMD: string): number {
  return new Date(`${dataYMD}T12:00:00Z`).getUTCDay();
}

function copiaDoHorario(h: HorarioDataInput): HorarioDataInput {
  return {
    fechado: h.fechado,
    abre: h.abre,
    fecha: h.fecha,
    almocoInicio: h.almocoInicio,
    almocoFim: h.almocoFim,
    horariosFixos: h.horariosFixos ? [...h.horariosFixos] : null,
  };
}

const SIGLAS_DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MAXIMO_DATAS = 92;

/** Todas as datas de `de` até `ate` (inclusive) que caem nos dias da semana escolhidos. */
function datasDoPeriodo(de: string, ate: string, diasSemana: number[]): string[] {
  const lista: string[] = [];
  const atual = new Date(`${de}T12:00:00Z`);
  const fim = new Date(`${ate}T12:00:00Z`);
  while (atual <= fim && lista.length <= MAXIMO_DATAS) {
    if (diasSemana.includes(atual.getUTCDay())) lista.push(atual.toISOString().slice(0, 10));
    atual.setUTCDate(atual.getUTCDate() + 1);
  }
  return lista;
}

function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000) + 1;
}

/** "De sáb., 1 de dez. até qua., 24 de dez." ou a data só, quando é uma. */
function rotuloDatas(datas: string[]): string {
  if (datas.length === 1) return rotuloData(datas[0], true);
  return `De ${rotuloData(datas[0])} até ${rotuloData(datas[datas.length - 1])}`;
}

/** "20 datas, só sex, sáb": diz quais dias da semana entram quando o período pula algum. */
function detalheDatas(datas: string[]): string {
  if (datas.length === 1) return "";
  const dias = [...new Set(datas.map(diaDaSemanaDe))].sort();
  const todos = datas.length === diasEntre(datas[0], datas[datas.length - 1]);
  const quais = todos ? "todos os dias" : `só ${dias.map((d) => SIGLAS_DIAS[d].toLowerCase()).join(", ")}`;
  return `${datas.length} datas, ${quais}`;
}

interface GrupoEspecial {
  ids: string[];
  datas: string[];
  horario: HorarioEspecialTela;
}

/** Junta datas seguidas (na lista) com o mesmo horário, para um período aparecer numa linha só. */
function agrupar(especiais: HorarioEspecialTela[]): GrupoEspecial[] {
  const grupos: GrupoEspecial[] = [];
  for (const e of [...especiais].sort((a, b) => a.data.localeCompare(b.data))) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && resumoHorario(ultimo.horario) === resumoHorario(e)) {
      ultimo.ids.push(e.id);
      ultimo.datas.push(e.data);
    } else {
      grupos.push({ ids: [e.id], datas: [e.data], horario: e });
    }
  }
  return grupos;
}

function DatasEspeciais({
  profissionalId,
  especiais,
  semana,
  hoje,
}: {
  profissionalId: string;
  especiais: HorarioEspecialTela[];
  semana: DiaHorarioInput[];
  hoje: string;
}) {
  const diasAbertos = semana.filter((d) => !d.fechado).map((d) => d.diaSemana);
  /** null = formulário fechado; lista = datas que estão sendo editadas. */
  const [datas, setDatas] = useState<string[] | null>(null);
  const [horario, setHorario] = useState<HorarioDataInput | null>(null);
  const [modo, setModo] = useState<"datas" | "periodo">("periodo");
  const [novaData, setNovaData] = useState("");
  const [periodoDe, setPeriodoDe] = useState("");
  const [periodoAte, setPeriodoAte] = useState("");
  const [diasPeriodo, setDiasPeriodo] = useState<number[]>(diasAbertos.length > 0 ? diasAbertos : [0, 1, 2, 3, 4, 5, 6]);
  const [pendente, iniciar] = useTransition();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const grupos = agrupar(especiais);

  function abrirNovo() {
    setMensagem(null);
    setDatas([]);
    setHorario(null);
    setNovaData("");
    setPeriodoDe("");
    setPeriodoAte("");
  }

  function editar(grupo: GrupoEspecial) {
    setMensagem(null);
    setDatas([...grupo.datas]);
    setHorario(copiaDoHorario(grupo.horario));
    setNovaData("");
  }

  function fechar() {
    setDatas(null);
    setHorario(null);
  }

  /** Junta as datas novas às que já estão escolhidas. O horário começa pelo que o dia da semana
   * da primeira data já tem; a dona só ajusta o que muda. */
  function incluirDatas(novas: string[]) {
    const validas = novas.filter((d) => d >= hoje);
    if (validas.length === 0) return;
    setDatas((atual) => [...new Set([...(atual ?? []), ...validas])].sort());
    if (!horario) {
      const daSemana = semana.find((d) => d.diaSemana === diaDaSemanaDe(validas[0]));
      setHorario(daSemana ? copiaDoHorario(daSemana) : copiaDoHorario({ ...semana[0], fechado: false }));
    }
  }

  function adicionarData() {
    if (!novaData) return;
    incluirDatas([novaData]);
    setNovaData("");
  }

  function usarPeriodo() {
    setMensagem(null);
    if (!periodoDe || !periodoAte) return;
    if (periodoAte < periodoDe) {
      setMensagem({ tipo: "erro", texto: "A data final precisa ser depois da inicial." });
      return;
    }
    if (diasEntre(periodoDe, periodoAte) > MAXIMO_DATAS) {
      setMensagem({ tipo: "erro", texto: "O período pode ter no máximo 3 meses." });
      return;
    }
    const lista = datasDoPeriodo(periodoDe < hoje ? hoje : periodoDe, periodoAte, diasPeriodo);
    if (lista.length === 0) {
      setMensagem({ tipo: "erro", texto: "Nenhuma data do período cai nos dias da semana marcados." });
      return;
    }
    incluirDatas(lista);
    setPeriodoDe("");
    setPeriodoAte("");
  }

  function alternarDiaPeriodo(dia: number) {
    setDiasPeriodo((atual) => (atual.includes(dia) ? atual.filter((d) => d !== dia) : [...atual, dia].sort()));
  }

  function salvar() {
    if (!datas || !horario) return;
    setMensagem(null);
    iniciar(async () => {
      const resultado = await salvarHorariosEspeciais(profissionalId, datas, horario);
      if (resultado.sucesso) {
        setMensagem({ tipo: "ok", texto: datas.length > 1 ? "Datas especiais salvas." : "Data especial salva." });
        fechar();
      } else {
        setMensagem({ tipo: "erro", texto: resultado.erro ?? "Erro ao salvar." });
      }
    });
  }

  function remover(grupo: GrupoEspecial) {
    const quais =
      grupo.datas.length === 1
        ? rotuloData(grupo.datas[0], true)
        : `${grupo.datas.length} datas (${rotuloDatas(grupo.datas).toLowerCase()})`;
    if (!confirm(`Remover o horário especial de ${quais}? Esses dias voltam ao horário da semana.`)) return;
    setMensagem(null);
    iniciar(async () => {
      const resultado = await removerHorariosEspeciais(grupo.ids);
      if (resultado.erro) setMensagem({ tipo: "erro", texto: resultado.erro });
    });
  }

  const campoData = "rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-sm text-text";

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading text-lg font-bold text-text">Datas especiais</h2>
        <p className="text-sm text-text-muted">
          Para dias com horário diferente, como dezembro ou um feriado. Vale só nas datas escolhidas: as outras semanas
          continuam com o horário acima.
        </p>
      </div>

      {grupos.length > 0 && (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {grupos.map((g) => (
            <li key={g.ids[0]} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-text">{rotuloDatas(g.datas)}</p>
                {g.datas.length > 1 && <p className="text-xs text-text-faint">{detalheDatas(g.datas)}</p>}
                <p className={cn("text-sm", g.horario.fechado ? "text-danger" : "text-text-muted")}>
                  {resumoHorario(g.horario)}
                </p>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => editar(g)} aria-label={`Editar ${g.datas[0]}`}>
                <Pencil size={14} />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => remover(g)}
                disabled={pendente}
                aria-label={`Remover ${g.datas[0]}`}
              >
                <Trash2 size={14} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {datas === null ? (
        <Button type="button" variant="secondary" onClick={abrirNovo}>
          <CalendarPlus size={16} /> Adicionar data especial
        </Button>
      ) : (
        <div className="space-y-4 rounded-2xl border border-accent/40 bg-surface p-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-text">Datas</p>
            {datas.length > 0 && datas.length <= 8 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {datas.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 rounded-full bg-accent/10 py-1 pl-3 pr-1 text-sm font-semibold text-accent"
                  >
                    {rotuloData(d)}
                    <button
                      type="button"
                      onClick={() => setDatas(datas.filter((x) => x !== d))}
                      className="rounded-full p-0.5 hover:bg-accent/20"
                      aria-label={`Tirar ${d}`}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {datas.length > 8 && (
              <div className="mb-3 flex items-center gap-3 rounded-xl bg-accent/10 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-accent">{rotuloDatas(datas)}</p>
                  <p className="text-xs text-text-muted">{detalheDatas(datas)}</p>
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={() => setDatas([])}>
                  Limpar
                </Button>
              </div>
            )}

            <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1" role="radiogroup" aria-label="Como escolher">
              {(
                [
                  ["periodo", "Período", "Do dia X ao dia Y"],
                  ["datas", "Datas soltas", "Uma de cada vez"],
                ] as const
              ).map(([valor, rotulo, dica]) => (
                <button
                  key={valor}
                  type="button"
                  role="radio"
                  aria-checked={modo === valor}
                  onClick={() => setModo(valor)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-left text-sm transition-colors",
                    modo === valor ? "bg-surface font-semibold text-text shadow-sm" : "text-text-muted hover:text-text",
                  )}
                >
                  {rotulo}
                  <span className="block text-xs font-normal text-text-faint">{dica}</span>
                </button>
              ))}
            </div>

            {modo === "datas" ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  min={hoje}
                  value={novaData}
                  onChange={(e) => setNovaData(e.target.value)}
                  aria-label="Nova data"
                  className={campoData}
                />
                <Button type="button" size="sm" variant="secondary" onClick={adicionarData} disabled={!novaData}>
                  <Plus size={14} /> {datas.length === 0 ? "Escolher data" : "Mais uma data"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-end gap-2">
                  <label className="block">
                    <span className="mb-1 block text-xs text-text-faint">De</span>
                    <input
                      type="date"
                      min={hoje}
                      value={periodoDe}
                      onChange={(e) => setPeriodoDe(e.target.value)}
                      aria-label="Período: de"
                      className={campoData}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-text-faint">Até</span>
                    <input
                      type="date"
                      min={periodoDe || hoje}
                      value={periodoAte}
                      onChange={(e) => setPeriodoAte(e.target.value)}
                      aria-label="Período: até"
                      className={campoData}
                    />
                  </label>
                </div>
                <div>
                  <span className="mb-1 block text-xs text-text-faint">Nos dias</span>
                  <div className="flex flex-wrap gap-1.5">
                    {SIGLAS_DIAS.map((sigla, dia) => (
                      <button
                        key={sigla}
                        type="button"
                        aria-pressed={diasPeriodo.includes(dia)}
                        onClick={() => alternarDiaPeriodo(dia)}
                        className={cn(
                          "min-w-11 rounded-full px-3 py-1.5 text-sm font-medium",
                          diasPeriodo.includes(dia) ? "bg-accent text-accent-foreground" : "bg-surface-2 text-text-muted",
                        )}
                      >
                        {sigla}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={usarPeriodo}
                  disabled={!periodoDe || !periodoAte || diasPeriodo.length === 0}
                >
                  <Plus size={14} /> Usar este período
                </Button>
              </div>
            )}
          </div>

          {horario && datas.length > 0 && (
            <div className="border-t border-border pt-4">
              <EditorDia
                titulo={datas.length > 1 ? `Horário dessas ${datas.length} datas` : "Horário desta data"}
                dia={horario}
                aoMudar={(campo, valor) => setHorario({ ...horario, [campo]: valor })}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={salvar} disabled={pendente || !horario || datas.length === 0}>
              <Check size={16} /> {pendente ? "Salvando..." : "Salvar"}
            </Button>
            <Button type="button" variant="ghost" onClick={fechar} disabled={pendente}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {mensagem && (
        <p className={mensagem.tipo === "ok" ? "text-sm text-success" : "text-sm text-danger"}>{mensagem.texto}</p>
      )}
    </section>
  );
}

/** Aberto/fechado, intervalo ou horários fixos de um dia — usado na semana e nas datas especiais. */
function EditorDia({
  titulo,
  dia,
  aoMudar,
  aoCopiarFixos,
}: {
  titulo: string;
  dia: HorarioDataInput;
  aoMudar: (campo: keyof HorarioDataInput, valor: string | boolean | string[] | null) => void;
  aoCopiarFixos?: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="font-semibold text-text">{titulo}</p>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input
            type="checkbox"
            checked={!dia.fechado}
            onChange={(e) => aoMudar("fechado", !e.target.checked)}
            className="h-4 w-4 rounded"
          />
          Aberto
        </label>
      </div>
      {!dia.fechado && (
        <SeletorModo
          fixos={dia.horariosFixos !== null}
          aoMudar={(fixos) => aoMudar("horariosFixos", fixos ? [] : null)}
        />
      )}
      {!dia.fechado && dia.horariosFixos !== null && (
        <EditorHorariosFixos
          horarios={dia.horariosFixos}
          aoMudar={(lista) => aoMudar("horariosFixos", lista)}
          aoCopiar={aoCopiarFixos}
        />
      )}
      {!dia.fechado && dia.horariosFixos === null && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CampoHora rotulo="Abre" valor={dia.abre} aoMudar={(v) => aoMudar("abre", v)} />
          <CampoHora rotulo="Fecha" valor={dia.fecha} aoMudar={(v) => aoMudar("fecha", v)} />
          <CampoHora rotulo="Almoço início" valor={dia.almocoInicio} aoMudar={(v) => aoMudar("almocoInicio", v)} />
          <CampoHora rotulo="Almoço fim" valor={dia.almocoFim} aoMudar={(v) => aoMudar("almocoFim", v)} />
        </div>
      )}
    </>
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
  aoCopiar?: () => void;
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
        {aoCopiar && ordenados.length > 0 && (
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
