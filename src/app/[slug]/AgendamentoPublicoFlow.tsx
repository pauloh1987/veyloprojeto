"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  Check,
  Clock,
  Loader2,
  Moon,
  Search,
  Sparkles,
  Sun,
  Sunset,
  User,
} from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { corParaNome } from "@/components/ui/Avatar";
import { aplicarMascaraTelefone, formatarCentavos, formatarDuracao, iniciais } from "@/lib/formatadores";
import { paraDataYMD, somarDias } from "@/lib/tz";
import { gerarIcs, baixarArquivo } from "@/lib/ics";
import { cn } from "@/lib/cn";
import { CalendarioMensal } from "./CalendarioMensal";

export interface ServicoPublico {
  id: string;
  nome: string;
  descricao: string;
  duracaoMin: number;
  precoCentavos: number;
  cor: string;
  foto: string | null;
  categoriaId: string | null;
  profissionaisIds: string[];
}
export interface ProfissionalPublico {
  id: string;
  nome: string;
  foto: string | null;
}
export interface CategoriaServicoPublica {
  id: string;
  nome: string;
}
export interface EstabelecimentoPublico {
  id: string;
  nome: string;
  slug: string;
  fuso: string;
}

type Etapa = "servico" | "profissional" | "data" | "horario" | "dados" | "confirmacao";

/** As 6 telas do fluxo aparecem para a cliente como 3 passos. */
const PASSOS = [
  { rotulo: "Serviço", dica: "O que você quer" },
  { rotulo: "Horário", dica: "Dia e hora" },
  { rotulo: "Seus dados", dica: "Nome e WhatsApp" },
] as const;

function passoDaEtapa(etapa: Etapa): number {
  if (etapa === "servico") return 0;
  if (etapa === "dados") return 2;
  if (etapa === "confirmacao") return PASSOS.length;
  return 1;
}

/** Para buscar sem diferenciar acento e maiúscula ("esmaltacao" acha "Esmaltação"). */
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/** A busca só aparece quando a lista é grande o bastante para precisar dela. */
const SERVICOS_PARA_BUSCA = 7;

const BORDA_DESTAQUE = "hover:border-[color:color-mix(in_oklab,var(--accent)_45%,var(--border))]";

export function AgendamentoPublicoFlow({
  estabelecimento,
  servicos,
  profissionais,
  categorias = [],
}: {
  estabelecimento: EstabelecimentoPublico;
  servicos: ServicoPublico[];
  profissionais: ProfissionalPublico[];
  categorias?: CategoriaServicoPublica[];
}) {
  const [etapa, setEtapa] = useState<Etapa>("servico");
  const [servicoId, setServicoId] = useState<string | null>(null);
  const [profissionalId, setProfissionalId] = useState<string | null>(null);
  const [mesAtualYMD, setMesAtualYMD] = useState(() => paraDataYMD(new Date(), estabelecimento.fuso).slice(0, 8) + "01");
  const [dataYMD, setDataYMD] = useState<string | null>(null);
  const [horarioIso, setHorarioIso] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ tokenPublico: string } | null>(null);
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);

  const [disponibilidade, setDisponibilidade] = useState<Map<string, boolean> | null>(null);
  const [carregandoDisponibilidade, setCarregandoDisponibilidade] = useState(false);
  const [horariosDoDia, setHorariosDoDia] = useState<string[] | null>(null);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);

  const topoRef = useRef<HTMLDivElement>(null);
  const primeiraTela = useRef(true);

  const hojeYMD = paraDataYMD(new Date(), estabelecimento.fuso);
  const limiteYMD = somarDias(hojeYMD, 59);

  const servico = servicos.find((s) => s.id === servicoId) ?? null;
  const profissional = profissionais.find((p) => p.id === profissionalId) ?? null;
  const profissionaisDoServico = useMemo(
    () => (servico ? profissionais.filter((p) => servico.profissionaisIds.includes(p.id)) : []),
    [servico, profissionais],
  );
  // Com uma profissional só, a tela de escolher profissional é pulada.
  const unicaProfissional = profissionaisDoServico.length === 1;

  // Ao trocar de tela com a página rolada para baixo (lista longa de serviços), volta para o
  // topo do quadro de agendamento, onde ficam os passos e o resumo.
  useEffect(() => {
    if (primeiraTela.current) {
      primeiraTela.current = false;
      return;
    }
    const topo = topoRef.current;
    if (topo && topo.getBoundingClientRect().top < 0) topo.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [etapa]);

  function escolherServico(s: ServicoPublico) {
    const doServico = profissionais.filter((p) => s.profissionaisIds.includes(p.id));
    setServicoId(s.id);
    setDataYMD(null);
    setHorarioIso(null);
    setErro(null);
    if (doServico.length === 1) {
      setProfissionalId(doServico[0].id);
      setEtapa("data");
    } else {
      setProfissionalId(null);
      setEtapa("profissional");
    }
  }

  function escolherProfissional(p: ProfissionalPublico) {
    setProfissionalId(p.id);
    setDataYMD(null);
    setHorarioIso(null);
    setEtapa("data");
  }

  useEffect(() => {
    if (etapa !== "data" || !servicoId || !profissionalId) return;
    setCarregandoDisponibilidade(true);
    setErro(null);
    fetch(`/api/public/${estabelecimento.slug}/disponibilidade?servicoId=${servicoId}&profissionalId=${profissionalId}`)
      .then((r) => r.json())
      .then((json: { dias?: { data: string; temVaga: boolean }[]; erro?: string }) => {
        if (json.erro || !json.dias) throw new Error(json.erro ?? "Erro ao carregar disponibilidade.");
        setDisponibilidade(new Map(json.dias.map((d) => [d.data, d.temVaga])));
      })
      .catch(() => setErro("Não foi possível carregar os dias disponíveis. Tente novamente."))
      .finally(() => setCarregandoDisponibilidade(false));
  }, [etapa, servicoId, profissionalId, estabelecimento.slug]);

  function selecionarDia(dia: string) {
    setDataYMD(dia);
    setHorarioIso(null);
    setHorariosDoDia(null);
    setEtapa("horario");
    setCarregandoHorarios(true);
    setErro(null);
    fetch(`/api/public/${estabelecimento.slug}/horarios?servicoId=${servicoId}&profissionalId=${profissionalId}&data=${dia}`)
      .then((r) => r.json())
      .then((json: { horarios?: string[]; erro?: string }) => {
        if (json.erro || !json.horarios) throw new Error(json.erro ?? "Erro ao carregar horários.");
        setHorariosDoDia(json.horarios);
      })
      .catch(() => setErro("Não foi possível carregar os horários. Tente novamente."))
      .finally(() => setCarregandoHorarios(false));
  }

  async function confirmar() {
    if (!servicoId || !profissionalId || !horarioIso) return;
    setEnviando(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/public/${estabelecimento.slug}/agendamentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ servicoId, profissionalId, inicioIso: horarioIso, nome, telefone }),
      });
      const json = await resposta.json();
      if (!resposta.ok) {
        throw new Error(json.erro ?? "Não foi possível concluir o agendamento.");
      }
      setResultado({ tokenPublico: json.tokenPublico });
      setEtapa("confirmacao");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível concluir o agendamento.");
    } finally {
      setEnviando(false);
    }
  }

  function irPara(destino: Etapa) {
    setErro(null);
    setEtapa(destino);
  }

  function voltar() {
    if (etapa === "profissional") irPara("servico");
    else if (etapa === "data") irPara(unicaProfissional ? "servico" : "profissional");
    else if (etapa === "horario") irPara("data");
    else if (etapa === "dados") irPara("horario");
  }

  if (etapa === "confirmacao" && resultado && servico && profissional && horarioIso) {
    return (
      <TelaConfirmacao
        estabelecimento={estabelecimento}
        servico={servico}
        profissional={profissional}
        horarioIso={horarioIso}
        tokenPublico={resultado.tokenPublico}
      />
    );
  }

  return (
    <div ref={topoRef} className="scroll-mt-3">
      <div className="mb-2 h-6">
        {etapa !== "servico" && (
          <button onClick={voltar} className="flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text">
            <ArrowLeft size={16} /> Voltar
          </button>
        )}
      </div>
      <IndicadorPassos atual={passoDaEtapa(etapa)} />

      {etapa !== "servico" && servico && (
        <ResumoEscolha
          servico={servico}
          profissional={profissional}
          horarioIso={etapa === "dados" ? horarioIso : null}
          fuso={estabelecimento.fuso}
          aoTrocarServico={() => irPara("servico")}
          aoTrocarProfissional={unicaProfissional ? null : () => irPara("profissional")}
          aoTrocarHorario={() => irPara("data")}
        />
      )}

      {etapa === "servico" && (
        <EscolhaServico
          servicos={servicos}
          categorias={categorias}
          busca={busca}
          aoBuscar={setBusca}
          categoriaFiltro={categoriaFiltro}
          aoFiltrar={setCategoriaFiltro}
          aoEscolher={escolherServico}
        />
      )}

      {etapa === "profissional" && (
        <div>
          <TituloEtapa titulo="Com quem você quer agendar?" subtitulo="Escolha a profissional." />
          {profissionaisDoServico.length === 0 ? (
            <p className="text-center text-sm text-text-muted">
              Nenhuma profissional atende esse serviço pelo link no momento. Fale com o salão pelo WhatsApp.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {profissionaisDoServico.map((p) => (
                <button
                  key={p.id}
                  onClick={() => escolherProfissional(p)}
                  className={cn(
                    "group flex flex-col items-center gap-2 rounded-3xl border border-border bg-surface px-2 pt-3.5 pb-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.97]",
                    BORDA_DESTAQUE,
                  )}
                >
                  {p.foto ? (
                    <img src={p.foto} alt={p.nome} className="h-16 w-16 rounded-full object-cover" />
                  ) : (
                    <span
                      className="flex h-16 w-16 items-center justify-center rounded-full font-heading text-lg font-bold text-white"
                      style={{ backgroundColor: corParaNome(p.nome) }}
                      aria-hidden
                    >
                      {iniciais(p.nome)}
                    </span>
                  )}
                  <span className="line-clamp-2 text-center text-xs leading-snug font-semibold text-text">{p.nome}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {etapa === "data" && (
        <div>
          <TituloEtapa titulo="Escolha o dia" subtitulo="Os dias com um pontinho têm horário livre." />
          {erro && <p className="mb-3 text-center text-sm text-danger">{erro}</p>}
          <div className="rounded-3xl border border-border bg-surface p-4 shadow-sm">
            <CalendarioMensal
              mesReferenciaYMD={mesAtualYMD}
              hojeYMD={hojeYMD}
              limiteYMD={limiteYMD}
              disponibilidade={disponibilidade}
              carregandoDisponibilidade={carregandoDisponibilidade}
              selecionado={dataYMD}
              aoSelecionar={selecionarDia}
              aoMudarMes={setMesAtualYMD}
            />
          </div>
          {carregandoDisponibilidade && (
            <p className="mt-3 flex items-center justify-center gap-2 text-sm text-text-muted">
              <Loader2 size={14} className="animate-spin" /> Carregando dias disponíveis...
            </p>
          )}
        </div>
      )}

      {etapa === "horario" && dataYMD && (
        <div>
          <TituloEtapa
            titulo="Escolha o horário"
            subtitulo={primeiraMaiuscula(
              formatInTimeZone(new Date(`${dataYMD}T12:00:00`), estabelecimento.fuso, "EEEE, d 'de' MMMM", { locale: ptBR }),
            )}
          />
          {erro && <p className="mb-3 text-center text-sm text-danger">{erro}</p>}
          {carregandoHorarios ? (
            <p className="flex items-center justify-center gap-2 text-sm text-text-muted">
              <Loader2 size={14} className="animate-spin" /> Carregando horários...
            </p>
          ) : horariosDoDia && horariosDoDia.length === 0 ? (
            <div className="text-center">
              <p className="text-sm text-text-muted">Nenhum horário livre neste dia.</p>
              <button onClick={() => irPara("data")} className="mt-2 text-sm font-semibold text-[color:var(--destaque-texto)] hover:underline">
                Escolher outro dia
              </button>
            </div>
          ) : (
            horariosDoDia && (
              <HorariosPorTurno
                horarios={horariosDoDia}
                fuso={estabelecimento.fuso}
                aoEscolher={(iso) => {
                  setHorarioIso(iso);
                  setEtapa("dados");
                }}
              />
            )
          )}
        </div>
      )}

      {etapa === "dados" && servico && profissional && horarioIso && (
        <div>
          <TituloEtapa titulo="Seus dados" subtitulo="Para confirmar o horário e mandar o lembrete no seu WhatsApp." />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              confirmar();
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="nome" className="mb-1.5 block text-sm font-medium text-text">
                Nome completo
              </label>
              <input
                id="nome"
                required
                autoComplete="name"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                className="min-h-12 w-full rounded-2xl border border-border-strong bg-surface px-4 text-[15px] text-text placeholder:text-text-faint focus-visible:outline-2 focus-visible:outline-focus-ring"
              />
            </div>
            <div>
              <label htmlFor="telefone" className="mb-1.5 block text-sm font-medium text-text">
                WhatsApp
              </label>
              <input
                id="telefone"
                required
                inputMode="numeric"
                autoComplete="tel-national"
                value={telefone}
                onChange={(e) => setTelefone(aplicarMascaraTelefone(e.target.value))}
                placeholder="(81) 91234-5678"
                className="min-h-12 w-full rounded-2xl border border-border-strong bg-surface px-4 text-[15px] text-text placeholder:text-text-faint focus-visible:outline-2 focus-visible:outline-focus-ring"
              />
              <p className="mt-1.5 text-xs text-text-faint">A confirmação e o lembrete chegam nesse número.</p>
            </div>
            {erro && <p className="text-sm text-danger">{erro}</p>}
            <button
              type="submit"
              disabled={enviando}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent font-semibold text-accent-foreground shadow-sm transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
            >
              {enviando ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Confirmando...
                </>
              ) : (
                <>
                  <Check size={18} /> Confirmar agendamento
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function primeiraMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function TituloEtapa({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  return (
    <div className="mb-5 text-center">
      <h2 className="font-heading text-xl font-extrabold text-text">{titulo}</h2>
      {subtitulo && <p className="mt-1 text-sm text-text-muted">{subtitulo}</p>}
    </div>
  );
}

function IndicadorPassos({ atual }: { atual: number }) {
  return (
    <ol className="mb-6 grid grid-cols-3" aria-label="Passos do agendamento">
      {PASSOS.map((passo, i) => {
        const feito = i < atual;
        const agora = i === atual;
        return (
          <li key={passo.rotulo} aria-current={agora ? "step" : undefined} className="relative flex flex-col items-center px-1 text-center">
            {i > 0 && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-[17px] right-[calc(50%_+_24px)] left-[calc(-50%_+_24px)] h-0.5 rounded-full transition-colors duration-300",
                  i <= atual ? "bg-accent" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-300",
                feito && "bg-accent text-accent-foreground",
                agora && "bg-accent text-accent-foreground ring-4 ring-[color:color-mix(in_oklab,var(--accent)_22%,transparent)]",
                !feito && !agora && "bg-surface-2 text-text-faint",
              )}
            >
              {feito ? <Check size={16} strokeWidth={3} /> : i + 1}
            </span>
            <span className={cn("mt-2 text-xs font-bold", feito || agora ? "text-text" : "text-text-faint")}>{passo.rotulo}</span>
            <span className="text-[11px] leading-tight text-text-faint">{passo.dica}</span>
          </li>
        );
      })}
    </ol>
  );
}

function ResumoEscolha({
  servico,
  profissional,
  horarioIso,
  fuso,
  aoTrocarServico,
  aoTrocarProfissional,
  aoTrocarHorario,
}: {
  servico: ServicoPublico;
  profissional: ProfissionalPublico | null;
  horarioIso: string | null;
  fuso: string;
  aoTrocarServico: () => void;
  aoTrocarProfissional: (() => void) | null;
  aoTrocarHorario: () => void;
}) {
  return (
    <div className="mb-6 divide-y divide-border rounded-2xl border border-border bg-[color:color-mix(in_oklab,var(--accent)_5%,var(--surface))]">
      <LinhaResumo
        icone={<Sparkles size={16} />}
        titulo={servico.nome}
        detalhe={`${formatarDuracao(servico.duracaoMin)} · ${formatarCentavos(servico.precoCentavos)}`}
        aoTrocar={aoTrocarServico}
      />
      {profissional && <LinhaResumo icone={<User size={16} />} titulo={profissional.nome} detalhe="Profissional" aoTrocar={aoTrocarProfissional} />}
      {horarioIso && (
        <LinhaResumo
          icone={<CalendarDays size={16} />}
          titulo={primeiraMaiuscula(formatInTimeZone(new Date(horarioIso), fuso, "EEEE, d 'de' MMMM", { locale: ptBR }))}
          detalhe={`às ${formatInTimeZone(new Date(horarioIso), fuso, "HH:mm")}`}
          aoTrocar={aoTrocarHorario}
        />
      )}
    </div>
  );
}

function LinhaResumo({
  icone,
  titulo,
  detalhe,
  aoTrocar,
}: {
  icone: React.ReactNode;
  titulo: string;
  detalhe: string;
  aoTrocar: (() => void) | null;
}) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-[color:var(--destaque-texto)] shadow-sm" aria-hidden>
        {icone}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text">{titulo}</span>
        <span className="block text-xs text-text-muted">{detalhe}</span>
      </span>
      {aoTrocar && (
        <button type="button" onClick={aoTrocar} className="shrink-0 text-xs font-semibold text-[color:var(--destaque-texto)] hover:underline">
          Trocar
        </button>
      )}
    </div>
  );
}

function EscolhaServico({
  servicos,
  categorias,
  busca,
  aoBuscar,
  categoriaFiltro,
  aoFiltrar,
  aoEscolher,
}: {
  servicos: ServicoPublico[];
  categorias: CategoriaServicoPublica[];
  busca: string;
  aoBuscar: (texto: string) => void;
  categoriaFiltro: string | null;
  aoFiltrar: (categoriaId: string | null) => void;
  aoEscolher: (s: ServicoPublico) => void;
}) {
  const categoriasComServico = categorias.filter((c) => servicos.some((s) => s.categoriaId === c.id));
  const termo = normalizar(busca);
  const visiveis = servicos.filter(
    (s) =>
      (!categoriaFiltro || s.categoriaId === categoriaFiltro) &&
      (!termo || normalizar(`${s.nome} ${s.descricao}`).includes(termo)),
  );
  const grupos = [
    ...categoriasComServico.map((c) => ({ id: c.id, nome: c.nome, itens: visiveis.filter((s) => s.categoriaId === c.id) })),
    { id: "outros", nome: "Outros", itens: visiveis.filter((s) => !s.categoriaId || !categoriasComServico.some((c) => c.id === s.categoriaId)) },
  ].filter((g) => g.itens.length > 0);

  return (
    <div>
      <TituloEtapa titulo="Escolha o serviço" subtitulo="Selecione um serviço para ver os horários livres." />
      {servicos.length === 0 ? (
        <p className="text-center text-sm text-text-muted">Nenhum serviço disponível no momento.</p>
      ) : (
        <>
          {servicos.length >= SERVICOS_PARA_BUSCA && (
            <label className="relative mb-3 block">
              <span className="sr-only">Buscar serviço</span>
              <Search size={16} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-text-faint" aria-hidden />
              <input
                type="search"
                value={busca}
                onChange={(e) => aoBuscar(e.target.value)}
                placeholder="Buscar serviço"
                className="min-h-11 w-full rounded-2xl border border-border-strong bg-surface pr-4 pl-10 text-[15px] text-text placeholder:text-text-faint focus-visible:outline-2 focus-visible:outline-focus-ring"
              />
            </label>
          )}
          {categoriasComServico.length >= 2 && (
            <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-5 sm:px-5">
              <ChipCategoria ativo={!categoriaFiltro} aoClicar={() => aoFiltrar(null)}>
                Todos
              </ChipCategoria>
              {categoriasComServico.map((c) => (
                <ChipCategoria key={c.id} ativo={categoriaFiltro === c.id} aoClicar={() => aoFiltrar(c.id)}>
                  {c.nome}
                </ChipCategoria>
              ))}
            </div>
          )}

          {grupos.length === 0 ? (
            <p className="py-4 text-center text-sm text-text-muted">Nenhum serviço encontrado.</p>
          ) : (
            <div className="space-y-6">
              {grupos.map((grupo) => (
                <div key={grupo.id}>
                  {grupos.length > 1 && (
                    <p className="mb-3 flex items-center gap-3 text-[11px] font-bold tracking-[0.2em] text-text-faint uppercase">
                      <span className="h-px flex-1 bg-border" aria-hidden />
                      {grupo.nome}
                      <span className="h-px flex-1 bg-border" aria-hidden />
                    </p>
                  )}
                  <div className="space-y-3">
                    {grupo.itens.map((s) => (
                      <CartaoServico key={s.id} servico={s} aoEscolher={aoEscolher} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ChipCategoria({ ativo, aoClicar, children }: { ativo: boolean; aoClicar: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-pressed={ativo}
      className={cn(
        "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
        ativo ? "border-transparent bg-accent text-accent-foreground" : "border-border bg-surface text-text-muted hover:text-text",
      )}
    >
      {children}
    </button>
  );
}

function CartaoServico({ servico, aoEscolher }: { servico: ServicoPublico; aoEscolher: (s: ServicoPublico) => void }) {
  return (
    <button
      type="button"
      onClick={() => aoEscolher(servico)}
      className={cn(
        "group w-full rounded-3xl border border-border bg-surface p-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.99]",
        BORDA_DESTAQUE,
      )}
    >
      <span className="flex gap-3.5">
        {servico.foto ? (
          <img src={servico.foto} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
        ) : (
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl font-heading text-xl font-bold text-white"
            style={{ background: `linear-gradient(135deg, color-mix(in oklab, ${servico.cor} 70%, white), ${servico.cor})` }}
            aria-hidden
          >
            {servico.nome.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block leading-snug font-semibold text-text">{servico.nome}</span>
          {servico.descricao && (
            <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-text-muted">{servico.descricao}</span>
          )}
          <span className="mt-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-text-muted">
              <Clock size={12} aria-hidden /> {formatarDuracao(servico.duracaoMin)}
            </span>
            <span className="inline-flex items-center rounded-full bg-[color:color-mix(in_oklab,var(--accent)_12%,var(--surface))] px-2.5 py-1 text-xs font-bold text-[color:var(--destaque-texto)]">
              {formatarCentavos(servico.precoCentavos)}
            </span>
          </span>
        </span>
      </span>
      <span className="mt-3 flex h-11 items-center justify-center gap-2 rounded-2xl bg-accent text-sm font-semibold text-accent-foreground transition group-hover:brightness-105">
        Selecionar <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </button>
  );
}

const TURNOS = [
  { nome: "Manhã", icone: Sun, ate: 12 },
  { nome: "Tarde", icone: Sunset, ate: 18 },
  { nome: "Noite", icone: Moon, ate: 24 },
] as const;

function HorariosPorTurno({
  horarios,
  fuso,
  aoEscolher,
}: {
  horarios: string[];
  fuso: string;
  aoEscolher: (iso: string) => void;
}) {
  const comHora = horarios.map((iso) => ({ iso, hora: Number(formatInTimeZone(new Date(iso), fuso, "H")) }));
  return (
    <div className="space-y-5">
      {TURNOS.map((turno, i) => {
        const desde = i === 0 ? 0 : TURNOS[i - 1].ate;
        const doTurno = comHora.filter((h) => h.hora >= desde && h.hora < turno.ate);
        if (doTurno.length === 0) return null;
        const Icone = turno.icone;
        return (
          <div key={turno.nome}>
            <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold tracking-wide text-text-muted uppercase">
              <Icone size={14} className="text-[color:var(--destaque-texto)]" aria-hidden /> {turno.nome}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {doTurno.map(({ iso }) => (
                <button
                  key={iso}
                  onClick={() => aoEscolher(iso)}
                  className={cn(
                    "min-h-11 rounded-xl border border-border-strong bg-surface text-sm font-semibold text-text shadow-sm transition-all hover:bg-[color:color-mix(in_oklab,var(--accent)_8%,var(--surface))] active:scale-95",
                    BORDA_DESTAQUE,
                  )}
                >
                  {formatInTimeZone(new Date(iso), fuso, "HH:mm")}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TelaConfirmacao({
  estabelecimento,
  servico,
  profissional,
  horarioIso,
  tokenPublico,
}: {
  estabelecimento: EstabelecimentoPublico;
  servico: ServicoPublico;
  profissional: ProfissionalPublico;
  horarioIso: string;
  tokenPublico: string;
}) {
  const inicio = new Date(horarioIso);
  const fim = new Date(inicio.getTime() + servico.duracaoMin * 60_000);

  function adicionarAoCalendario() {
    const ics = gerarIcs({
      titulo: `${servico.nome} · ${estabelecimento.nome}`,
      descricao: `Agendamento com ${profissional.nome} em ${estabelecimento.nome}.`,
      localizacao: estabelecimento.nome,
      inicio,
      fim,
      uid: tokenPublico,
    });
    baixarArquivo(`${estabelecimento.slug}-agendamento.ics`, ics, "text/calendar");
  }

  return (
    <div className="flex flex-col items-center py-4 text-center">
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success">
        <Check size={32} strokeWidth={3} />
      </span>
      <h2 className="mb-1 font-heading text-xl font-extrabold text-text">Agendamento confirmado!</h2>
      <p className="mb-6 text-sm text-text-muted">Você vai receber uma mensagem de confirmação.</p>

      <div className="mb-6 w-full divide-y divide-border rounded-2xl border border-border bg-[color:color-mix(in_oklab,var(--accent)_5%,var(--surface))] text-left">
        <LinhaResumo
          icone={<Sparkles size={16} />}
          titulo={servico.nome}
          detalhe={`${formatarDuracao(servico.duracaoMin)} · ${formatarCentavos(servico.precoCentavos)}`}
          aoTrocar={null}
        />
        <LinhaResumo icone={<User size={16} />} titulo={profissional.nome} detalhe="Profissional" aoTrocar={null} />
        <LinhaResumo
          icone={<CalendarDays size={16} />}
          titulo={primeiraMaiuscula(formatInTimeZone(inicio, estabelecimento.fuso, "EEEE, d 'de' MMMM", { locale: ptBR }))}
          detalhe={`${formatInTimeZone(inicio, estabelecimento.fuso, "HH:mm")} às ${formatInTimeZone(fim, estabelecimento.fuso, "HH:mm")}`}
          aoTrocar={null}
        />
      </div>

      <div className="w-full space-y-2.5">
        <Button onClick={adicionarAoCalendario} variant="secondary" className="w-full">
          <CalendarPlus size={16} /> Adicionar ao calendário
        </Button>
        <LinkButton href={`/${estabelecimento.slug}/agendamento/${tokenPublico}`} className="w-full" variant="outline">
          Ver meu agendamento
        </LinkButton>
      </div>
    </div>
  );
}
