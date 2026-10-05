import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { CalendarDays, CalendarPlus, Clock, MessageCircle, User, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { obterEstabelecimentoPorSlug } from "@/lib/estabelecimentoPublico";
import { formatarCentavos, iniciais } from "@/lib/formatadores";
import { variaveisDaMarca } from "@/lib/cores";
import { linkWhatsApp } from "@/lib/mensagens/textos";
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
  const dia = formatInTimeZone(agendamento.inicio, fuso, "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <main
      className="tema-claro min-h-screen bg-[color:color-mix(in_oklab,var(--accent)_7%,var(--bg))] px-3 py-6 sm:py-10"
      style={variaveisDaMarca(estabelecimento.corDestaque)}
    >
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex items-center gap-3 px-1">
          {estabelecimento.foto ? (
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl p-1.5 shadow-sm ring-1 ring-border"
              style={{ backgroundColor: estabelecimento.logoFundo }}
            >
              <img src={estabelecimento.foto} alt="" className="max-h-full max-w-full object-contain" />
            </span>
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent font-heading font-extrabold text-accent-foreground">
              {iniciais(estabelecimento.nome)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-muted">{estabelecimento.nome}</p>
            <h1 className="font-heading text-xl font-extrabold text-text">Seu agendamento</h1>
          </div>
        </div>

        <section className="rounded-[28px] border border-border bg-surface p-5 shadow-[0_12px_32px_-16px_rgb(16_21_31/0.22)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <p className="font-heading text-lg leading-snug font-bold text-text">{agendamento.servico.nome}</p>
            <StatusBadge status={agendamento.status} />
          </div>
          <ul className="space-y-3 text-sm">
            <ItemDetalhe icone={<User size={16} />}>{agendamento.profissional.nome}</ItemDetalhe>
            <ItemDetalhe icone={<CalendarDays size={16} />}>
              {dia.charAt(0).toUpperCase() + dia.slice(1)}
            </ItemDetalhe>
            <ItemDetalhe icone={<Clock size={16} />}>
              {formatInTimeZone(agendamento.inicio, fuso, "HH:mm")} às {formatInTimeZone(agendamento.fim, fuso, "HH:mm")}
            </ItemDetalhe>
            <ItemDetalhe icone={<Wallet size={16} />}>{formatarCentavos(agendamento.servico.precoCentavos)}</ItemDetalhe>
          </ul>

          <div className="mt-5 border-t border-border pt-5">
            {podeCancelar ? (
              <BotaoCancelar token={token} />
            ) : agendamento.status === "CANCELADO" ? (
              <p className="text-center text-sm text-text-muted">Este agendamento foi cancelado.</p>
            ) : (
              <p className="text-center text-sm text-text-muted">Este agendamento já foi concluído.</p>
            )}
          </div>
        </section>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            href={linkWhatsApp(estabelecimento.telefone)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 text-sm font-semibold text-text transition hover:bg-surface-2"
          >
            <MessageCircle size={16} className="text-[color:var(--destaque-texto)]" aria-hidden /> Falar com o salão
          </a>
          <Link
            href={`/${estabelecimento.slug}`}
            className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 text-sm font-semibold text-text transition hover:bg-surface-2"
          >
            <CalendarPlus size={16} className="text-[color:var(--destaque-texto)]" aria-hidden /> Agendar outro
          </Link>
        </div>
      </div>
    </main>
  );
}

function ItemDetalhe({ icone, children }: { icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-text">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_oklab,var(--accent)_10%,var(--surface))] text-[color:var(--destaque-texto)]"
        aria-hidden
      >
        {icone}
      </span>
      {children}
    </li>
  );
}
