"use client";

import { useState } from "react";
import { ExternalLink, FlaskConical, MessageCircle, Search } from "lucide-react";
import type { SalaoAdmin } from "@/lib/admin/dados";
import { rotuloEtapa } from "@/lib/admin/funil";
import { aplicarMascaraTelefone } from "@/lib/formatadores";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Campo";
import { AcoesSalao } from "./AcoesSalao";
import { SituacaoBadge, dataCurta, tempoDesde } from "./formatos";

type Filtro = "todos" | "teste" | "testeVencido" | "assinante" | "parceira" | "contasDeTeste";

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "teste", rotulo: "Em teste" },
  { id: "testeVencido", rotulo: "Teste vencido" },
  { id: "assinante", rotulo: "Assinantes" },
  { id: "parceira", rotulo: "Parceiras" },
  { id: "contasDeTeste", rotulo: "Contas de teste" },
];

/** Contas de teste só aparecem no filtro delas; os outros filtros mostram os salões de verdade. */
function passaNoFiltro(salao: SalaoAdmin, filtro: Filtro): boolean {
  if (filtro === "contasDeTeste") return salao.contaDeTeste;
  if (salao.contaDeTeste) return false;
  return filtro === "todos" || salao.situacao.tipo === filtro;
}

export function ListaSaloes({ saloes, agora }: { saloes: SalaoAdmin[]; agora: Date }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");

  const termo = busca.trim().toLowerCase();
  const visiveis = saloes.filter(
    (salao) =>
      passaNoFiltro(salao, filtro) &&
      (!termo ||
        [salao.nome, salao.slug, salao.dona?.nome ?? "", salao.dona?.email ?? "", salao.telefone].some((campo) =>
          campo.toLowerCase().includes(termo),
        )),
  );

  return (
    <div>
      <header className="mb-4">
        <h1 className="font-heading text-2xl font-extrabold text-text">Salões</h1>
        <p className="text-sm text-text-muted">
          Todas as contas cadastradas. As marcadas como teste ficam separadas e fora dos números.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTROS.map(({ id, rotulo }) => {
          const quantidade = saloes.filter((salao) => passaNoFiltro(salao, id)).length;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setFiltro(id)}
              aria-pressed={filtro === id}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors",
                filtro === id ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface text-text-muted hover:text-text",
              )}
            >
              {id === "contasDeTeste" && <FlaskConical size={14} aria-hidden />}
              {rotulo}
              <span className={cn("text-xs", filtro === id ? "opacity-80" : "text-text-faint")}>{quantidade}</span>
            </button>
          );
        })}
        <label className="relative w-full sm:ml-auto sm:w-64">
          <span className="sr-only">Buscar salão</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" aria-hidden />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome, e-mail, telefone" className="pl-9" />
        </label>
      </div>

      {visiveis.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-text-muted">
          {filtro === "contasDeTeste" ? "Nenhuma conta marcada como teste." : "Nenhum salão encontrado."}
        </p>
      ) : (
        <ul className="space-y-3">
          {visiveis.map((salao) => (
            <CartaoSalao key={salao.id} salao={salao} agora={agora} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CartaoSalao({ salao, agora }: { salao: SalaoAdmin; agora: Date }) {
  const configuracaoIncompleta = salao.configuracao.feitos < salao.configuracao.total;

  return (
    <li
      id={`salao-${salao.id}`}
      className={cn("scroll-mt-32 rounded-2xl border bg-surface p-4 sm:p-5", salao.contaDeTeste ? "border-dashed border-border-strong" : "border-border")}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="font-heading text-base font-bold text-text">{salao.nome}</p>
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-text-faint">
            <span>cadastro em {dataCurta(salao.criadoEm)}</span>
            <a href={`/${salao.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-accent">
              /{salao.slug} <ExternalLink size={12} aria-hidden />
            </a>
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {salao.contaDeTeste ? <Badge>Conta de teste</Badge> : <SituacaoBadge situacao={salao.situacao} />}
          {salao.pareceTeste && <Badge tom="warning">Parece teste</Badge>}
          {salao.etapaFunil && <Badge>Funil: {rotuloEtapa(salao.etapaFunil)}</Badge>}
        </div>
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
        <span className="font-medium text-text">{salao.dona?.nome ?? "Sem dona cadastrada"}</span>
        {salao.dona && (
          <a href={`mailto:${salao.dona.email}`} className="hover:text-accent">
            {salao.dona.email}
          </a>
        )}
        <a
          href={`https://wa.me/55${salao.telefone}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-accent"
        >
          <MessageCircle size={14} aria-hidden /> {aplicarMascaraTelefone(salao.telefone)}
        </a>
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-xl bg-surface-2 p-3 text-xs sm:grid-cols-4">
        <Dado
          rotulo="Configuração"
          valor={`${salao.configuracao.feitos} de ${salao.configuracao.total} passos`}
          alerta={configuracaoIncompleta}
        />
        <Dado rotulo="Agendamentos (30 dias)" valor={`${salao.agendamentos30d} (${salao.agendamentosPeloLink30d} pelo link)`} />
        <Dado rotulo="Último agendamento" valor={tempoDesde(salao.ultimoAgendamentoEm, agora)} />
        <Dado rotulo="Último login" valor={tempoDesde(salao.ultimoLoginEm, agora)} />
        <Dado rotulo="WhatsApp no mês" valor={`${salao.mensagensMes} mensage${salao.mensagensMes === 1 ? "m" : "ns"}`} />
        <Dado rotulo="Equipe" valor={String(salao.profissionais)} />
        <Dado rotulo="Serviços" valor={String(salao.servicos)} alerta={salao.servicos === 0} />
        <Dado rotulo="Clientes" valor={String(salao.clientes)} />
      </dl>

      <AcoesSalao salaoId={salao.id} nome={salao.nome} situacao={salao.situacao.tipo} contaDeTeste={salao.contaDeTeste} />
    </li>
  );
}

function Dado({ rotulo, valor, alerta }: { rotulo: string; valor: string; alerta?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-text-faint">{rotulo}</dt>
      <dd className={cn("truncate font-semibold", alerta ? "text-warning" : "text-text")}>{valor}</dd>
    </div>
  );
}
