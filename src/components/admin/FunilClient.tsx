"use client";

import { useState, useTransition } from "react";
import { ArrowRight, AtSign, CalendarClock, MessageCircle, Plus, Search } from "lucide-react";
import { excluirLead, moverLead, salvarLead } from "@/lib/acoes/admin";
import { ETAPAS_FUNIL, proximaEtapa, rotuloEtapa, SEGMENTOS, type EtapaFunil } from "@/lib/admin/funil";
import { aplicarMascaraTelefone } from "@/lib/formatadores";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Campo, Input, Select, Textarea } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";

export interface LeadCartao {
  id: string;
  nome: string;
  contato: string;
  telefone: string;
  email: string;
  instagram: string;
  cidade: string;
  segmento: string;
  etapa: EtapaFunil;
  responsavel: string;
  /** "AAAA-MM-DD" no fuso de Recife, ou "" sem data marcada. */
  proximoContato: string;
  anotacoes: string;
  salao: { id: string; nome: string; slug: string; situacao: string } | null;
}

interface Props {
  leads: LeadCartao[];
  equipe: string[];
  saloesSemContato: { id: string; nome: string }[];
  hojeYMD: string;
}

const COR_ETAPA: Record<EtapaFunil, string> = {
  PROSPECCAO: "bg-text-faint",
  CONTATO: "bg-info",
  DEMONSTRACAO: "bg-accent",
  EM_TESTE: "bg-warning",
  FECHADO: "bg-success",
  PERDIDO: "bg-danger",
};

function emAberto(etapa: EtapaFunil): boolean {
  return etapa !== "FECHADO" && etapa !== "PERDIDO";
}

function dataCurta(ymd: string): string {
  const [, mes, dia] = ymd.split("-");
  return `${dia}/${mes}`;
}

/** Quem tem próximo contato marcado vem primeiro, do mais antigo (atrasado) para o mais novo. */
function ordenar(a: LeadCartao, b: LeadCartao): number {
  if (a.proximoContato && b.proximoContato) return a.proximoContato.localeCompare(b.proximoContato);
  if (a.proximoContato) return -1;
  if (b.proximoContato) return 1;
  return a.nome.localeCompare(b.nome, "pt-BR");
}

export function FunilClient({ leads, equipe, saloesSemContato, hojeYMD }: Props) {
  const [responsavel, setResponsavel] = useState("");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<LeadCartao | "novo" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const termo = busca.trim().toLowerCase();
  const visiveis = leads.filter(
    (lead) =>
      (!responsavel || lead.responsavel === responsavel) &&
      (!termo || [lead.nome, lead.contato, lead.cidade, lead.instagram].some((campo) => campo.toLowerCase().includes(termo))),
  );
  const paraHoje = visiveis.filter((lead) => emAberto(lead.etapa) && lead.proximoContato && lead.proximoContato <= hojeYMD).length;

  function avancar(lead: LeadCartao, etapa: EtapaFunil) {
    setErro(null);
    iniciar(async () => {
      const resultado = await moverLead(lead.id, etapa);
      if (resultado.erro) setErro(resultado.erro);
    });
  }

  return (
    <div>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-text">Funil</h1>
          <p className="text-sm text-text-muted">
            {visiveis.length} contato{visiveis.length === 1 ? "" : "s"}
            {paraHoje > 0 && <span className="font-semibold text-warning"> · {paraHoje} para hoje ou atrasado{paraHoje > 1 ? "s" : ""}</span>}
          </p>
        </div>
        <Button type="button" onClick={() => setEditando("novo")}>
          <Plus size={16} aria-hidden /> Novo contato
        </Button>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {["", ...equipe].map((nome) => (
          <button
            key={nome || "todos"}
            type="button"
            onClick={() => setResponsavel(nome)}
            aria-pressed={responsavel === nome}
            className={cn(
              "h-9 rounded-full border px-3.5 text-sm font-semibold transition-colors",
              responsavel === nome ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface text-text-muted hover:text-text",
            )}
          >
            {nome || "Todos"}
          </button>
        ))}
        <label className="relative ml-auto w-full sm:w-64">
          <span className="sr-only">Buscar contato</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" aria-hidden />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar salão, cidade, @" className="pl-9" />
        </label>
      </div>

      {erro && <p className="mb-3 text-sm text-danger">{erro}</p>}

      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4">
        {ETAPAS_FUNIL.map((etapa) => {
          const daEtapa = visiveis.filter((lead) => lead.etapa === etapa.id).sort(ordenar);
          return (
            <section key={etapa.id} aria-label={etapa.rotulo} className="w-72 shrink-0 snap-start rounded-2xl bg-surface-2 p-2.5">
              <h2 className="flex items-center justify-between px-1.5 py-1 text-sm font-bold text-text">
                <span className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", COR_ETAPA[etapa.id])} aria-hidden />
                  {etapa.rotulo}
                </span>
                <span className="text-text-faint">{daEtapa.length}</span>
              </h2>
              <div className="mt-1.5 space-y-2">
                {daEtapa.map((lead) => (
                  <CartaoLead
                    key={lead.id}
                    lead={lead}
                    hojeYMD={hojeYMD}
                    pendente={pendente}
                    aoAbrir={() => setEditando(lead)}
                    aoAvancar={(proxima) => avancar(lead, proxima)}
                  />
                ))}
                {daEtapa.length === 0 && <p className="px-1.5 py-6 text-center text-xs text-text-faint">Nenhum contato</p>}
              </div>
            </section>
          );
        })}
      </div>

      <Modal aberto={editando !== null} aoFechar={() => setEditando(null)} titulo={editando === "novo" ? "Novo contato" : "Editar contato"}>
        {editando !== null && (
          <FormularioLead
            key={editando === "novo" ? "novo" : editando.id}
            lead={editando === "novo" ? null : editando}
            equipe={equipe}
            saloesSemContato={saloesSemContato}
            aoTerminar={() => setEditando(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function CartaoLead({
  lead,
  hojeYMD,
  pendente,
  aoAbrir,
  aoAvancar,
}: {
  lead: LeadCartao;
  hojeYMD: string;
  pendente: boolean;
  aoAbrir: () => void;
  aoAvancar: (etapa: EtapaFunil) => void;
}) {
  const proxima = proximaEtapa(lead.etapa);
  const mostrarData = emAberto(lead.etapa) && lead.proximoContato !== "";
  const atrasado = mostrarData && lead.proximoContato < hojeYMD;
  const hoje = mostrarData && lead.proximoContato === hojeYMD;

  return (
    <article className="rounded-xl border border-border bg-surface p-3">
      <button type="button" onClick={aoAbrir} className="block w-full text-left">
        <p className="text-sm font-semibold text-text">{lead.nome}</p>
        {(lead.contato || lead.cidade) && (
          <p className="text-xs text-text-muted">{[lead.contato, lead.cidade].filter(Boolean).join(" · ")}</p>
        )}
        {(lead.segmento || lead.responsavel) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {lead.segmento && <Badge>{lead.segmento}</Badge>}
            {lead.responsavel && <Badge tom="info">{lead.responsavel}</Badge>}
          </div>
        )}
        {mostrarData && (
          <p
            className={cn(
              "mt-2 flex items-center gap-1 text-xs",
              atrasado ? "font-semibold text-danger" : hoje ? "font-semibold text-warning" : "text-text-muted",
            )}
          >
            <CalendarClock size={13} aria-hidden />
            {atrasado ? "Atrasado" : hoje ? "Hoje" : "Próximo contato"}: {dataCurta(lead.proximoContato)}
          </p>
        )}
        {lead.salao && <p className="mt-2 text-xs font-medium text-success">Conta criada, {lead.salao.situacao}</p>}
      </button>
      {(lead.telefone || lead.instagram || proxima) && (
        <div className="mt-2 flex items-center gap-1 border-t border-border pt-2">
          {lead.telefone && (
            <a
              href={`https://wa.me/55${lead.telefone}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`WhatsApp de ${lead.nome}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-text"
            >
              <MessageCircle size={15} aria-hidden />
            </a>
          )}
          {lead.instagram && (
            <a
              href={`https://instagram.com/${lead.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Instagram de ${lead.nome}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-text"
            >
              <AtSign size={15} aria-hidden />
            </a>
          )}
          {proxima && (
            <button
              type="button"
              disabled={pendente}
              onClick={() => aoAvancar(proxima)}
              className="ml-auto flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-accent hover:bg-surface-2 disabled:opacity-50"
            >
              {rotuloEtapa(proxima)} <ArrowRight size={13} aria-hidden />
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function FormularioLead({
  lead,
  equipe,
  saloesSemContato,
  aoTerminar,
}: {
  lead: LeadCartao | null;
  equipe: string[];
  saloesSemContato: { id: string; nome: string }[];
  aoTerminar: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [telefone, setTelefone] = useState(lead ? aplicarMascaraTelefone(lead.telefone) : "");
  const [pendente, iniciar] = useTransition();

  const opcoesResponsavel = lead?.responsavel && !equipe.includes(lead.responsavel) ? [...equipe, lead.responsavel] : equipe;
  const opcoesSalao = lead?.salao ? [{ id: lead.salao.id, nome: lead.salao.nome }, ...saloesSemContato] : saloesSemContato;

  // onSubmit (e não <form action>) para o React não limpar o formulário quando o servidor
  // devolve um erro de validação.
  function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formData = new FormData(evento.currentTarget);
    setErro(null);
    iniciar(async () => {
      const resultado = await salvarLead({}, formData);
      if (resultado.erro) setErro(resultado.erro);
      else aoTerminar();
    });
  }

  function excluir() {
    if (!lead || !window.confirm(`Excluir ${lead.nome} do funil?`)) return;
    setErro(null);
    iniciar(async () => {
      const resultado = await excluirLead(lead.id);
      if (resultado.erro) setErro(resultado.erro);
      else aoTerminar();
    });
  }

  return (
    <form onSubmit={aoEnviar} className="space-y-3" noValidate>
      <input type="hidden" name="id" value={lead?.id ?? ""} />
      <Campo rotulo="Nome do salão" htmlFor="lead-nome">
        <Input id="lead-nome" name="nome" required defaultValue={lead?.nome} />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Contato" htmlFor="lead-contato">
          <Input id="lead-contato" name="contato" placeholder="Nome da dona" defaultValue={lead?.contato} />
        </Campo>
        <Campo rotulo="Telefone" htmlFor="lead-telefone">
          <Input
            id="lead-telefone"
            name="telefone"
            inputMode="tel"
            placeholder="(81) 91234-5678"
            value={telefone}
            onChange={(e) => setTelefone(aplicarMascaraTelefone(e.target.value))}
          />
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Instagram" htmlFor="lead-instagram">
          <Input id="lead-instagram" name="instagram" placeholder="@salao" defaultValue={lead?.instagram ? `@${lead.instagram}` : ""} />
        </Campo>
        <Campo rotulo="E-mail" htmlFor="lead-email">
          <Input id="lead-email" name="email" type="email" defaultValue={lead?.email} />
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Cidade" htmlFor="lead-cidade">
          <Input id="lead-cidade" name="cidade" defaultValue={lead?.cidade} />
        </Campo>
        <Campo rotulo="Segmento" htmlFor="lead-segmento">
          <Select id="lead-segmento" name="segmento" defaultValue={lead?.segmento ?? ""}>
            <option value="">Escolha</option>
            {SEGMENTOS.map((segmento) => (
              <option key={segmento} value={segmento}>
                {segmento}
              </option>
            ))}
          </Select>
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Etapa" htmlFor="lead-etapa">
          <Select id="lead-etapa" name="etapa" defaultValue={lead?.etapa ?? "PROSPECCAO"}>
            {ETAPAS_FUNIL.map((etapa) => (
              <option key={etapa.id} value={etapa.id}>
                {etapa.rotulo}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo rotulo="Responsável" htmlFor="lead-responsavel">
          <Select id="lead-responsavel" name="responsavel" defaultValue={lead?.responsavel ?? ""}>
            <option value="">Ninguém ainda</option>
            {opcoesResponsavel.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
          </Select>
        </Campo>
      </div>
      <Campo rotulo="Próximo contato" htmlFor="lead-proximo">
        <Input id="lead-proximo" name="proximoContato" type="date" defaultValue={lead?.proximoContato} />
      </Campo>
      <Campo rotulo="Anotações" htmlFor="lead-anotacoes">
        <Textarea
          id="lead-anotacoes"
          name="anotacoes"
          rows={4}
          placeholder="O que conversaram, objeções, quando voltar a falar..."
          defaultValue={lead?.anotacoes}
        />
      </Campo>
      <Campo rotulo="Conta no sistema" htmlFor="lead-salao">
        <Select id="lead-salao" name="estabelecimentoId" defaultValue={lead?.salao?.id ?? ""}>
          <option value="">Ainda não criou conta</option>
          {opcoesSalao.map((salao) => (
            <option key={salao.id} value={salao.id}>
              {salao.nome}
            </option>
          ))}
        </Select>
      </Campo>
      <p className="-mt-1 text-xs text-text-faint">
        Se o salão criar a conta com o mesmo telefone ou e-mail, ela é ligada sozinha e o contato vai para Em teste.
      </p>
      {erro && (
        <p role="alert" className="text-sm text-danger">
          {erro}
        </p>
      )}
      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variant="ghost" onClick={aoTerminar}>
          Cancelar
        </Button>
        {lead && (
          <Button type="button" variant="ghost" className="ml-auto text-danger hover:text-danger" disabled={pendente} onClick={excluir}>
            Excluir
          </Button>
        )}
      </div>
    </form>
  );
}
