import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Phone, Mail, StickyNote } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatarCentavos } from "@/lib/formatadores";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardBody } from "@/components/ui/Card";
import { StatusBadge } from "@/components/painel/StatusBadge";
import { FormularioClienteModal } from "../FormularioClienteModal";
import { LembreteRetornoForm } from "../LembreteRetornoForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cliente" };

export default async function PaginaFichaCliente({ params }: PageProps<"/painel/clientes/[id]">) {
  const usuario = await exigirSessao();
  const { id } = await params;

  const cliente = await db.cliente.findFirst({
    where: { id, estabelecimentoId: usuario.estabelecimentoId },
  });
  if (!cliente) notFound();

  const [agendamentos, servicos] = await Promise.all([
    db.agendamento.findMany({
      where: { clienteId: cliente.id },
      include: { servico: true, profissional: true },
      orderBy: { inicio: "desc" },
    }),
    db.servico.findMany({
      where: { estabelecimentoId: usuario.estabelecimentoId, ativo: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  const atendidos = agendamentos.filter((a) => a.status === "ATENDIDO");
  const totalGastoCentavos = atendidos.reduce((soma, a) => soma + a.servico.precoCentavos, 0);
  const faltas = agendamentos.filter((a) => a.status === "FALTOU").length;
  const ultimoAtendimento = atendidos[0]?.inicio ?? null;
  const fuso = usuario.estabelecimento.fuso;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <Link href="/painel/clientes" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text">
        <ArrowLeft size={16} /> Clientes
      </Link>

      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar nome={cliente.nome} tamanho="lg" />
          <div>
            <h1 className="font-heading text-xl font-extrabold text-text">{cliente.nome}</h1>
            <p className="flex items-center gap-1.5 text-sm text-text-muted">
              <Phone size={14} /> {cliente.telefone}
            </p>
            {cliente.email && (
              <p className="flex items-center gap-1.5 text-sm text-text-muted">
                <Mail size={14} /> {cliente.email}
              </p>
            )}
          </div>
        </div>
        <FormularioClienteModal cliente={cliente} />
      </div>

      {cliente.observacoes && (
        <Card className="mb-5">
          <CardBody className="flex items-start gap-2 text-sm text-text-muted">
            <StickyNote size={16} className="mt-0.5 shrink-0" />
            {cliente.observacoes}
          </CardBody>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card>
          <CardBody className="text-center">
            <p className="font-heading text-lg font-bold text-text">{formatarCentavos(totalGastoCentavos)}</p>
            <p className="text-xs text-text-faint">Total gasto</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="font-heading text-lg font-bold text-text">{faltas}</p>
            <p className="text-xs text-text-faint">Faltas</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="font-heading text-sm font-bold text-text">
              {ultimoAtendimento ? formatInTimeZone(ultimoAtendimento, fuso, "dd/MM/yy") : "—"}
            </p>
            <p className="text-xs text-text-faint">Último atendimento</p>
          </CardBody>
        </Card>
      </div>

      {servicos.length > 0 && (
        <LembreteRetornoForm
          clienteId={cliente.id}
          servicos={servicos.map((s) => ({ id: s.id, nome: s.nome }))}
          servicoSugeridoId={atendidos[0]?.servico.id}
        />
      )}

      <h2 className="mb-3 font-heading text-lg font-bold text-text">Histórico</h2>
      {agendamentos.length === 0 ? (
        <p className="text-sm text-text-muted">Nenhum agendamento ainda.</p>
      ) : (
        <ul className="space-y-2.5">
          {agendamentos.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">{a.servico.nome}</p>
                <p className="text-xs text-text-faint">
                  {formatInTimeZone(a.inicio, fuso, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
                  {a.profissional && ` · ${a.profissional.nome}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm text-text-muted">{formatarCentavos(a.servico.precoCentavos)}</span>
                <StatusBadge status={a.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
