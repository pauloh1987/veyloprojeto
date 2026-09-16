"use client";

import { useEffect, useMemo, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, CalendarPlus, CheckCircle2, Loader2 } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { aplicarMascaraTelefone, formatarCentavos, formatarDuracao } from "@/lib/formatadores";
import { paraDataYMD, somarDias } from "@/lib/tz";
import { gerarIcs, baixarArquivo } from "@/lib/ics";
import { CalendarioMensal } from "./CalendarioMensal";

export interface ServicoPublico {
  id: string;
  nome: string;
  descricao: string;
  duracaoMin: number;
  precoCentavos: number;
  cor: string;
  profissionaisIds: string[];
}
export interface ProfissionalPublico {
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

export function AgendamentoPublicoFlow({
  estabelecimento,
  servicos,
  profissionais,
}: {
  estabelecimento: EstabelecimentoPublico;
  servicos: ServicoPublico[];
  profissionais: ProfissionalPublico[];
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

  const [disponibilidade, setDisponibilidade] = useState<Map<string, boolean> | null>(null);
  const [carregandoDisponibilidade, setCarregandoDisponibilidade] = useState(false);
  const [horariosDoDia, setHorariosDoDia] = useState<string[] | null>(null);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);

  const hojeYMD = paraDataYMD(new Date(), estabelecimento.fuso);
  const limiteYMD = somarDias(hojeYMD, 59);

  const servico = servicos.find((s) => s.id === servicoId) ?? null;
  const profissional = profissionais.find((p) => p.id === profissionalId) ?? null;
  const profissionaisDoServico = useMemo(
    () => (servico ? profissionais.filter((p) => servico.profissionaisIds.includes(p.id)) : []),
    [servico, profissionais],
  );

  function escolherServico(s: ServicoPublico) {
    setServicoId(s.id);
    setErro(null);
    const elegiveis = profissionais.filter((p) => s.profissionaisIds.includes(p.id));
    if (elegiveis.length === 1) {
      setProfissionalId(elegiveis[0].id);
      setEtapa("data");
    } else {
      setProfissionalId(null);
      setEtapa("profissional");
    }
  }

  function escolherProfissional(p: ProfissionalPublico) {
    setProfissionalId(p.id);
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

  function voltar() {
    setErro(null);
    if (etapa === "profissional") setEtapa("servico");
    else if (etapa === "data") setEtapa(profissionaisDoServico.length > 1 ? "profissional" : "servico");
    else if (etapa === "horario") setEtapa("data");
    else if (etapa === "dados") setEtapa("horario");
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
    <div className="pb-10">
      {etapa !== "servico" && (
        <button onClick={voltar} className="mb-4 flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text">
          <ArrowLeft size={16} /> Voltar
        </button>
      )}

      {etapa === "servico" && (
        <div>
          <h2 className="mb-3 font-heading text-lg font-bold text-text">Escolha o serviço</h2>
          {servicos.length === 0 ? (
            <p className="text-text-muted">Nenhum serviço disponível no momento.</p>
          ) : (
            <div className="space-y-2.5">
              {servicos.map((s) => (
                <button
                  key={s.id}
                  onClick={() => escolherServico(s)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left hover:border-accent"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.cor }} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-text">{s.nome}</span>
                    <span className="block text-sm text-text-muted">{formatarDuracao(s.duracaoMin)}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-text">{formatarCentavos(s.precoCentavos)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {etapa === "profissional" && (
        <div>
          <h2 className="mb-3 font-heading text-lg font-bold text-text">Escolha a profissional</h2>
          <div className="space-y-2.5">
            {profissionaisDoServico.map((p) => (
              <button
                key={p.id}
                onClick={() => escolherProfissional(p)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left hover:border-accent"
              >
                <Avatar nome={p.nome} />
                <span className="font-semibold text-text">{p.nome}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {etapa === "data" && (
        <div>
          <h2 className="mb-3 font-heading text-lg font-bold text-text">Escolha o dia</h2>
          {erro && <p className="mb-3 text-sm text-danger">{erro}</p>}
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
          {carregandoDisponibilidade && (
            <p className="mt-3 flex items-center gap-2 text-sm text-text-muted">
              <Loader2 size={14} className="animate-spin" /> Carregando dias disponíveis...
            </p>
          )}
        </div>
      )}

      {etapa === "horario" && dataYMD && (
        <div>
          <h2 className="mb-1 font-heading text-lg font-bold text-text">Escolha o horário</h2>
          <p className="mb-4 text-sm text-text-muted capitalize">
            {formatInTimeZone(new Date(`${dataYMD}T12:00:00`), estabelecimento.fuso, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
          {erro && <p className="mb-3 text-sm text-danger">{erro}</p>}
          {carregandoHorarios ? (
            <p className="flex items-center gap-2 text-sm text-text-muted">
              <Loader2 size={14} className="animate-spin" /> Carregando horários...
            </p>
          ) : horariosDoDia && horariosDoDia.length === 0 ? (
            <p className="text-sm text-text-muted">Nenhum horário livre neste dia. Escolha outro dia.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {horariosDoDia?.map((iso) => (
                <button
                  key={iso}
                  onClick={() => {
                    setHorarioIso(iso);
                    setEtapa("dados");
                  }}
                  className="min-h-11 rounded-xl border border-border-strong bg-surface text-sm font-medium text-text hover:border-accent hover:bg-surface-2"
                >
                  {formatInTimeZone(new Date(iso), estabelecimento.fuso, "HH:mm")}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {etapa === "dados" && servico && profissional && horarioIso && (
        <div>
          <h2 className="mb-3 font-heading text-lg font-bold text-text">Seus dados</h2>
          <div className="mb-4 rounded-2xl bg-surface-2 p-3.5 text-sm text-text-muted">
            <p className="font-medium text-text">{servico.nome}</p>
            <p>
              {profissional.nome} ·{" "}
              {formatInTimeZone(new Date(horarioIso), estabelecimento.fuso, "d 'de' MMMM, HH:mm", { locale: ptBR })}
            </p>
          </div>
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
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                className="min-h-11 w-full rounded-xl border border-border-strong bg-surface px-3.5 text-[15px] text-text placeholder:text-text-faint focus-visible:outline-2 focus-visible:outline-focus-ring"
              />
            </div>
            <div>
              <label htmlFor="telefone" className="mb-1.5 block text-sm font-medium text-text">
                Telefone (WhatsApp)
              </label>
              <input
                id="telefone"
                required
                inputMode="numeric"
                value={telefone}
                onChange={(e) => setTelefone(aplicarMascaraTelefone(e.target.value))}
                placeholder="(81) 91234-5678"
                className="min-h-11 w-full rounded-xl border border-border-strong bg-surface px-3.5 text-[15px] text-text placeholder:text-text-faint focus-visible:outline-2 focus-visible:outline-focus-ring"
              />
            </div>
            {erro && <p className="text-sm text-danger">{erro}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={enviando}>
              {enviando ? "Confirmando..." : "Confirmar agendamento"}
            </Button>
          </form>
        </div>
      )}
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
    <div className="flex flex-col items-center py-6 text-center">
      <CheckCircle2 className="mb-4 text-success" size={48} />
      <h2 className="mb-1 font-heading text-xl font-bold text-text">Agendamento confirmado!</h2>
      <p className="mb-6 text-sm text-text-muted">Você vai receber uma mensagem de confirmação.</p>

      <div className="mb-6 w-full max-w-xs rounded-2xl border border-border bg-surface p-4 text-left">
        <p className="font-semibold text-text">{servico.nome}</p>
        <p className="text-sm text-text-muted">{profissional.nome}</p>
        <p className="mt-2 text-sm text-text capitalize">
          {formatInTimeZone(inicio, estabelecimento.fuso, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
        <p className="text-sm text-text">
          {formatInTimeZone(inicio, estabelecimento.fuso, "HH:mm")}–{formatInTimeZone(fim, estabelecimento.fuso, "HH:mm")}
        </p>
        <p className="mt-2 text-sm font-semibold text-text">{formatarCentavos(servico.precoCentavos)}</p>
      </div>

      <div className="w-full max-w-xs space-y-2.5">
        <Button onClick={adicionarAoCalendario} variant="secondary" className="w-full">
          <CalendarPlus size={16} /> Adicionar ao calendário
        </Button>
        <LinkButton
          href={`/${estabelecimento.slug}/agendamento/${tokenPublico}`}
          className="w-full"
          variant="outline"
        >
          Ver meu agendamento
        </LinkButton>
      </div>
    </div>
  );
}
