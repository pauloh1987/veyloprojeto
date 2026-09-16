import type { Metadata } from "next";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { CalendarCheck } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { db } from "@/lib/db";
import { limitesDoDia, paraDataYMD } from "@/lib/tz";
import { formatarCentavos } from "@/lib/formatadores";
import { Avatar } from "@/components/ui/Avatar";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { StatusBadge } from "@/components/painel/StatusBadge";
import { BotoesStatusAgendamento } from "@/components/painel/BotoesStatusAgendamento";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Hoje" };

export default async function PaginaHoje() {
  const usuario = await exigirSessao();
  const fuso = usuario.estabelecimento.fuso;
  const hojeYMD = paraDataYMD(new Date(), fuso);
  const { inicio, fimExclusivo } = limitesDoDia(hojeYMD, fuso);

  const agendamentos = await db.agendamento.findMany({
    where: {
      estabelecimentoId: usuario.estabelecimentoId,
      ...(usuario.papel === "PROFISSIONAL" ? { profissionalId: usuario.profissionalId ?? "" } : {}),
      inicio: { gte: inicio, lt: fimExclusivo },
    },
    include: { cliente: true, servico: true, profissional: true },
    orderBy: { inicio: "asc" },
  });

  const totalCentavos = agendamentos
    .filter((a) => a.status !== "CANCELADO")
    .reduce((soma, a) => soma + a.servico.precoCentavos, 0);

  const tituloData = formatInTimeZone(new Date(), fuso, "EEEE, d 'de' MMMM", { locale: ptBR });
  const ehEquipe = usuario.estabelecimento.plano === "EQUIPE";

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-text">Hoje</h1>
          <p className="text-sm text-text-muted capitalize">{tituloData}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-faint">Total do dia</p>
          <p className="font-heading text-xl font-bold text-text">{formatarCentavos(totalCentavos)}</p>
        </div>
      </header>

      {agendamentos.length === 0 ? (
        <EstadoVazio
          icone={<CalendarCheck className="mx-auto" />}
          titulo="Nenhum agendamento hoje"
          descricao="Quando alguém marcar pelo link público, ou você criar um agendamento manual na Agenda, ele aparece aqui."
        />
      ) : (
        <ul className="space-y-3">
          {agendamentos.map((a) => (
            <li key={a.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <Avatar nome={a.cliente.nome} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-text">{a.cliente.nome}</p>
                    <p className="text-sm text-text-muted">
                      {formatInTimeZone(a.inicio, fuso, "HH:mm")}–{formatInTimeZone(a.fim, fuso, "HH:mm")} · {a.servico.nome}
                    </p>
                    {ehEquipe && <p className="text-xs text-text-faint">{a.profissional.nome}</p>}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-text">{formatarCentavos(a.servico.precoCentavos)}</p>
                  <div className="mt-1">
                    <StatusBadge status={a.status} />
                  </div>
                </div>
              </div>
              <div className="mt-3 border-t border-border pt-3">
                <BotoesStatusAgendamento agendamentoId={a.id} status={a.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
