import type { Metadata } from "next";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { differenceInCalendarDays } from "date-fns";
import { ChevronLeft, ChevronRight, MessageCircle, Wallet } from "lucide-react";
import type { FormaPagamento } from "@prisma/client";
import { exigirDono } from "@/lib/auth";
import { db } from "@/lib/db";
import { limitesDoDia, paraDataYMD } from "@/lib/tz";
import { primeiroMesDoNegocio } from "@/lib/relatorio";
import {
  escolherMesRelatorio,
  lerParametroMes,
  mesDoInstante,
  nomeDoMes,
  parametroMes,
  somarMeses,
  type MesAno,
} from "@/lib/mesRelatorio";
import { FORMAS_DE_RECEBIMENTO, formaDoRecebimento, rotuloForma } from "@/lib/financeiro/fechamento";
import { formatarCentavos } from "@/lib/formatadores";
import { linkWhatsApp } from "@/lib/mensagens/textos";
import { Card, CardBody } from "@/components/ui/Card";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { BotaoDesfazerRecebimento, BotaoReceberFiado } from "./FinanceiroClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Financeiro" };

const CLASSE_BOTAO_MES =
  "inline-flex h-9 items-center gap-1 rounded-full border border-border px-3 text-sm font-medium " +
  "text-text-muted hover:bg-surface-2 hover:text-text";

/** O mês atual fica sem `?mes=` na URL. */
function hrefMes(mes: MesAno, atual: MesAno): string {
  const ehAtual = mes.ano === atual.ano && mes.mes === atual.mes;
  return ehAtual ? "/painel/financeiro" : `/painel/financeiro?mes=${parametroMes(mes)}`;
}

function primeiroDia({ ano, mes }: MesAno): string {
  return `${ano}-${String(mes).padStart(2, "0")}-01`;
}

function haQuantoTempo(dias: number): string {
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  return `há ${dias} dias`;
}

/** Financeiro do salão: o que as clientes ficaram devendo (fiado) e o dinheiro que entrou no mês,
 * por forma de pagamento. O fechamento de cada atendimento é feito na janela "Finalizar atendimento". */
export default async function PaginaFinanceiro({ searchParams }: PageProps<"/painel/financeiro">) {
  const usuario = await exigirDono();
  const fuso = usuario.estabelecimento.fuso;
  const { mes: mesPedido } = await searchParams;
  const agora = new Date();
  const atual = mesDoInstante(agora, fuso);
  const { mes, anterior, proximo } = escolherMesRelatorio(
    lerParametroMes(mesPedido),
    atual,
    await primeiroMesDoNegocio(usuario.estabelecimento, fuso),
  );
  const inicioMes = limitesDoDia(primeiroDia(mes), fuso).inicio;
  const fimMes = limitesDoDia(primeiroDia(somarMeses(mes, 1)), fuso).inicio;

  const incluir = { agendamento: { select: { inicio: true, clienteId: true, cliente: { select: { nome: true, telefone: true } }, servico: { select: { nome: true } } } } };
  const [aReceber, recebidos] = await Promise.all([
    db.pagamento.findMany({
      where: { estabelecimentoId: usuario.estabelecimentoId, forma: "FIADO", recebidoEm: null },
      include: incluir,
      orderBy: { criadoEm: "asc" },
    }),
    db.pagamento.findMany({
      where: { estabelecimentoId: usuario.estabelecimentoId, recebidoEm: { gte: inicioMes, lt: fimMes } },
      include: incluir,
      orderBy: { recebidoEm: "desc" },
    }),
  ]);

  const totalAReceber = aReceber.reduce((soma, p) => soma + p.valorCentavos, 0);
  const totalRecebido = recebidos.reduce((soma, p) => soma + p.valorCentavos, 0);
  const porForma = new Map<FormaPagamento, number>();
  for (const p of recebidos) {
    const forma = formaDoRecebimento(p);
    porForma.set(forma, (porForma.get(forma) ?? 0) + p.valorCentavos);
  }
  const hojeYMD = paraDataYMD(agora, fuso);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-text">Financeiro</h1>
        <p className="text-sm text-text-muted">Fiado a receber e o que entrou em cada forma de pagamento.</p>
      </header>

      <section className="mb-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="font-heading text-lg font-bold text-text">A receber</h2>
          {totalAReceber > 0 && <p className="font-heading text-xl font-extrabold text-warning">{formatarCentavos(totalAReceber)}</p>}
        </div>
        {aReceber.length === 0 ? (
          <EstadoVazio
            icone={<Wallet className="mx-auto" />}
            titulo="Nada a receber"
            descricao="Quando um atendimento for finalizado como fiado, o valor aparece aqui até você marcar como pago."
          />
        ) : (
          <ul className="space-y-2.5">
            {aReceber.map((p) => {
              const { agendamento } = p;
              const dataYMD = paraDataYMD(agendamento.inicio, fuso);
              const dias = differenceInCalendarDays(new Date(`${hojeYMD}T12:00:00`), new Date(`${dataYMD}T12:00:00`));
              const primeiroNome = agendamento.cliente.nome.trim().split(/\s+/)[0] ?? "";
              const cobranca = `Oi, ${primeiroNome}! Tudo bem? Passando para lembrar do valor de ${formatarCentavos(p.valorCentavos)} do seu atendimento de ${agendamento.servico.nome} no dia ${formatInTimeZone(agendamento.inicio, fuso, "dd/MM")}. Quando puder, me avisa por aqui.`;
              return (
                <li key={p.id} className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/painel/clientes/${agendamento.clienteId}`} className="font-semibold text-text hover:underline">
                        {agendamento.cliente.nome}
                      </Link>
                      <p className="text-sm text-text-muted">
                        {agendamento.servico.nome} · {formatInTimeZone(agendamento.inicio, fuso, "dd/MM")} ({haQuantoTempo(dias)})
                      </p>
                    </div>
                    <p className="shrink-0 font-heading text-lg font-bold text-text">{formatarCentavos(p.valorCentavos)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <BotaoReceberFiado
                      pagamentoId={p.id}
                      valorCentavos={p.valorCentavos}
                      clienteNome={agendamento.cliente.nome}
                    />
                    <a
                      href={linkWhatsApp(agendamento.cliente.telefone, cobranca)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border-strong px-3 text-sm font-semibold text-text hover:bg-surface-2"
                    >
                      <MessageCircle size={15} /> Cobrar no WhatsApp
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-bold text-text">
            Recebido em {nomeDoMes(mes).toLowerCase()}
          </h2>
          {(anterior || proximo) && (
            <nav aria-label="Escolher o mês" className="flex items-center gap-1.5">
              {anterior && (
                <Link href={hrefMes(anterior, atual)} className={CLASSE_BOTAO_MES} aria-label={`Ver ${nomeDoMes(anterior)}`}>
                  <ChevronLeft size={16} aria-hidden />
                </Link>
              )}
              {proximo && (
                <Link href={hrefMes(proximo, atual)} className={CLASSE_BOTAO_MES} aria-label={`Ver ${nomeDoMes(proximo)}`}>
                  <ChevronRight size={16} aria-hidden />
                </Link>
              )}
            </nav>
          )}
        </div>

        <Card className="mb-4">
          <CardBody>
            <p className="font-heading text-3xl font-extrabold text-text">{formatarCentavos(totalRecebido)}</p>
            <p className="text-xs text-text-faint">
              Dinheiro que entrou em {nomeDoMes(mes).toLowerCase()} de {mes.ano}, contando os fiados recebidos no mês.
            </p>
            {totalRecebido > 0 && (
              <ul className="mt-4 space-y-2.5">
                {FORMAS_DE_RECEBIMENTO.filter((f) => (porForma.get(f.forma) ?? 0) > 0).map((f) => {
                  const valor = porForma.get(f.forma) ?? 0;
                  return (
                    <li key={f.forma}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text">{f.rotulo}</span>
                        <span className="font-semibold text-text tabular-nums">{formatarCentavos(valor)}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round((valor / totalRecebido) * 100)}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        {recebidos.length > 0 && (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {recebidos.slice(0, 60).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">{p.agendamento.cliente.nome}</p>
                  <p className="text-xs text-text-faint">
                    {p.recebidoEm && formatInTimeZone(p.recebidoEm, fuso, "dd/MM")} · {rotuloForma(formaDoRecebimento(p))}
                    {p.forma === "FIADO" && " (fiado recebido)"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold text-text tabular-nums">{formatarCentavos(p.valorCentavos)}</span>
                  {p.forma === "FIADO" && <BotaoDesfazerRecebimento pagamentoId={p.id} />}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-text-faint">
          Pagamento feito na hora entra na data do atendimento. Atendimentos finalizados antes do registro de pagamento existir
          não aparecem aqui.
        </p>
      </section>
    </div>
  );
}
