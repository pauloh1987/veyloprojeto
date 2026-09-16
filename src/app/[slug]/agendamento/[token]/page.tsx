import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { db } from "@/lib/db";
import { obterEstabelecimentoPorSlug } from "@/lib/estabelecimentoPublico";
import { formatarCentavos } from "@/lib/formatadores";
import { StatusBadge } from "@/components/painel/StatusBadge";
import { BotaoCancelar } from "./BotaoCancelar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Seu agendamento" };

export default async function PaginaAgendamentoPublico({
  params,
}: PageProps<"/[slug]/agendamento/[token]">) {
  const { slug, token } = await params;
  const estabelecimento = await obterEstabelecimentoPorSlug(slug);
  if (!estabelecimento) notFound();

  const agendamento = await db.agendamento.findFirst({
    where: { tokenPublico: token, estabelecimentoId: estabelecimento.id },
    include: { servico: true, profissional: true },
  });
  if (!agendamento) notFound();

  const fuso = estabelecimento.fuso;
  const podeCancelar = agendamento.status === "PENDENTE" || agendamento.status === "CONFIRMADO";

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-10">
      <h1 className="mb-1 font-heading text-xl font-bold text-text">Seu agendamento</h1>
      <p className="mb-6 text-sm text-text-muted">{estabelecimento.nome}</p>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="font-semibold text-text">{agendamento.servico.nome}</p>
          <StatusBadge status={agendamento.status} />
        </div>
        <p className="text-sm text-text-muted">{agendamento.profissional.nome}</p>
        <p className="mt-2 text-sm capitalize text-text">
          {formatInTimeZone(agendamento.inicio, fuso, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
        <p className="text-sm text-text">
          {formatInTimeZone(agendamento.inicio, fuso, "HH:mm")}–{formatInTimeZone(agendamento.fim, fuso, "HH:mm")}
        </p>
        <p className="mt-2 font-semibold text-text">{formatarCentavos(agendamento.servico.precoCentavos)}</p>
      </div>

      <div className="mt-5">
        {podeCancelar ? (
          <BotaoCancelar token={token} />
        ) : agendamento.status === "CANCELADO" ? (
          <p className="text-center text-sm text-text-muted">Este agendamento foi cancelado.</p>
        ) : (
          <p className="text-center text-sm text-text-muted">Este agendamento já foi concluído.</p>
        )}
      </div>
    </main>
  );
}
