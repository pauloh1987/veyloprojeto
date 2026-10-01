import type { Metadata } from "next";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { formatDistanceStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, ExternalLink, MessageCircle, TriangleAlert } from "lucide-react";
import { exigirAdmin } from "@/lib/admin/auth";
import { carregarVisaoGeral, type SalaoAdmin } from "@/lib/admin/dados";
import { rotuloEtapa } from "@/lib/admin/funil";
import type { SituacaoConta } from "@/lib/assinatura";
import { db } from "@/lib/db";
import { aplicarMascaraTelefone, formatarCentavos } from "@/lib/formatadores";
import { FUSO_PADRAO, limitesDoDia, paraDataYMD, somarDias } from "@/lib/tz";
import { Badge } from "@/components/ui/Badge";
import { AcoesSalao } from "@/components/admin/AcoesSalao";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Visão geral" };

function data(instante: Date): string {
  return formatInTimeZone(instante, FUSO_PADRAO, "dd/MM/yy");
}

function ha(instante: Date | null, agora: Date): string {
  return instante ? formatDistanceStrict(instante, agora, { locale: ptBR, addSuffix: true }) : "sem registro";
}

export default async function PaginaVisaoGeral() {
  await exigirAdmin();
  const agora = new Date();
  const fimDeHoje = limitesDoDia(somarDias(paraDataYMD(agora, FUSO_PADRAO), 1), FUSO_PADRAO).inicio;
  const [{ saloes, resumo }, contatosParaHoje] = await Promise.all([
    carregarVisaoGeral(agora),
    db.lead.count({
      where: { proximoContatoEm: { lt: fimDeHoje }, etapa: { notIn: ["FECHADO", "PERDIDO"] } },
    }),
  ]);

  const vencendo = saloes.filter((s) => s.situacao.tipo === "teste" && s.situacao.diasRestantes <= 3);
  const vencidos = saloes.filter((s) => s.situacao.tipo === "testeVencido");
  const percentualLink =
    resumo.agendamentos30d === 0 ? 0 : Math.round((resumo.agendamentosPeloLink30d / resumo.agendamentos30d) * 100);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-heading text-2xl font-extrabold text-text">Visão geral</h1>
        <p className="text-sm text-text-muted first-letter:uppercase">
          {formatInTimeZone(agora, FUSO_PADRAO, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Números do negócio">
        <Metrica rotulo="Salões cadastrados" valor={resumo.total} detalhe={`+${resumo.novos30d} nos últimos 30 dias`} />
        <Metrica
          rotulo="Em teste"
          valor={resumo.emTeste}
          detalhe={resumo.vencendoEm3Dias > 0 ? `${resumo.vencendoEm3Dias} vencem em até 3 dias` : "nenhum vencendo"}
          alerta={resumo.vencendoEm3Dias > 0}
        />
        <Metrica rotulo="Teste vencido" valor={resumo.testeVencido} detalhe="sem assinatura" alerta={resumo.testeVencido > 0} />
        <Metrica
          rotulo="Assinantes"
          valor={resumo.assinantes}
          detalhe={`${formatarCentavos(resumo.receitaMensalReais * 100)}/mês de receita`}
        />
        <Metrica rotulo="Parceiras" valor={resumo.parceiras} detalhe="piloto, sem cobrança" />
        <Metrica rotulo="Ativos na semana" valor={resumo.ativos7d} detalhe="com agendamento em 7 dias" />
        <Metrica rotulo="Agendamentos (30 dias)" valor={resumo.agendamentos30d} detalhe={`${percentualLink}% pelo link`} />
        <Metrica rotulo="WhatsApp no mês" valor={resumo.mensagensMes} detalhe="mensagens enviadas" />
      </section>

      {(contatosParaHoje > 0 || vencendo.length > 0 || vencidos.length > 0) && (
        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-text">
            <TriangleAlert size={16} className="text-warning" aria-hidden /> Para olhar hoje
          </h2>
          <ul className="space-y-2.5 text-sm">
            {contatosParaHoje > 0 && (
              <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-text">
                  {contatosParaHoje} contato{contatosParaHoje > 1 ? "s" : ""} do funil para hoje ou atrasado
                  {contatosParaHoje > 1 ? "s" : ""}
                </span>
                <Link href="/admin/funil" className="inline-flex items-center gap-1 font-semibold text-accent">
                  Abrir o funil <ArrowRight size={14} aria-hidden />
                </Link>
              </li>
            )}
            {vencendo.length > 0 && (
              <li className="text-text">
                Teste vencendo: <ListaNomes saloes={vencendo} />
              </li>
            )}
            {vencidos.length > 0 && (
              <li className="text-text">
                Teste vencido: <ListaNomes saloes={vencidos} />
              </li>
            )}
          </ul>
        </section>
      )}

      <section aria-labelledby="titulo-saloes">
        <h2 id="titulo-saloes" className="mb-3 font-heading text-lg font-bold text-text">
          Salões <span className="font-normal text-text-faint">({saloes.length})</span>
        </h2>
        {saloes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-text-muted">
            Nenhum salão cadastrado ainda.
          </p>
        ) : (
          <ul className="space-y-3">
            {saloes.map((salao) => (
              <CartaoSalao key={salao.id} salao={salao} agora={agora} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Metrica({ rotulo, valor, detalhe, alerta }: { rotulo: string; valor: number; detalhe: string; alerta?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-medium text-text-faint">{rotulo}</p>
      <p className="mt-1 font-heading text-2xl font-extrabold text-text">{valor}</p>
      <p className={alerta ? "text-xs font-semibold text-warning" : "text-xs text-text-muted"}>{detalhe}</p>
    </div>
  );
}

function ListaNomes({ saloes }: { saloes: SalaoAdmin[] }) {
  return (
    <>
      {saloes.map((salao, indice) => (
        <span key={salao.id}>
          {indice > 0 && ", "}
          <a href={`#salao-${salao.id}`} className="font-semibold text-accent">
            {salao.nome}
          </a>
        </span>
      ))}
    </>
  );
}

function SituacaoBadge({ situacao }: { situacao: SituacaoConta }) {
  switch (situacao.tipo) {
    case "assinante":
      return <Badge tom="success">Assinante desde {data(situacao.desde)}</Badge>;
    case "parceira":
      return <Badge tom="accent">Parceira</Badge>;
    case "teste":
      return (
        <Badge tom={situacao.diasRestantes <= 3 ? "warning" : "info"}>
          Teste: {situacao.diasRestantes} dia{situacao.diasRestantes > 1 ? "s" : ""}, até {data(situacao.vence)}
        </Badge>
      );
    case "testeVencido":
      return <Badge tom="danger">Teste vencido em {data(situacao.venceu)}</Badge>;
  }
}

function CartaoSalao({ salao, agora }: { salao: SalaoAdmin; agora: Date }) {
  return (
    <li id={`salao-${salao.id}`} className="scroll-mt-20 rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="font-heading text-base font-bold text-text">{salao.nome}</p>
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-text-faint">
            <a href={`/${salao.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-accent">
              /{salao.slug} <ExternalLink size={12} aria-hidden />
            </a>
            <span>cadastro em {data(salao.criadoEm)}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <SituacaoBadge situacao={salao.situacao} />
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

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-surface-2 p-3 text-xs sm:grid-cols-4">
        <Dado rotulo="Agendamentos (30 dias)" valor={`${salao.agendamentos30d} (${salao.agendamentosPeloLink30d} pelo link)`} />
        <Dado rotulo="Último agendamento" valor={ha(salao.ultimoAgendamentoEm, agora)} />
        <Dado rotulo="Último login" valor={ha(salao.ultimoLoginEm, agora)} />
        <Dado rotulo="WhatsApp no mês" valor={`${salao.mensagensMes} mensage${salao.mensagensMes === 1 ? "m" : "ns"}`} />
        <Dado rotulo="Equipe" valor={String(salao.profissionais)} />
        <Dado rotulo="Serviços" valor={String(salao.servicos)} />
        <Dado rotulo="Clientes" valor={String(salao.clientes)} />
      </dl>

      <AcoesSalao salaoId={salao.id} nome={salao.nome} situacao={salao.situacao.tipo} />
    </li>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-text-faint">{rotulo}</dt>
      <dd className="truncate font-semibold text-text">{valor}</dd>
    </div>
  );
}
