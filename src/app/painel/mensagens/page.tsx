import type { Metadata } from "next";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { MessageSquare } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { BotaoSimularTempo } from "./BotaoSimularTempo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mensagens" };

const ROTULO_TIPO: Record<string, string> = {
  CONFIRMACAO: "Confirmação",
  LEMBRETE: "Lembrete",
  CONVITE_RETORNO: "Convite de retorno",
};

const CONFIG_STATUS: Record<string, { rotulo: string; tom: "success" | "warning" | "danger" | "neutral" }> = {
  ENVIADA: { rotulo: "Enviada", tom: "success" },
  PENDENTE: { rotulo: "Pendente", tom: "warning" },
  ERRO: { rotulo: "Erro", tom: "danger" },
  CANCELADA: { rotulo: "Cancelada", tom: "neutral" },
};

export default async function PaginaMensagens() {
  const usuario = await exigirSessao();
  const fuso = usuario.estabelecimento.fuso;

  const mensagens = await db.mensagem.findMany({
    where: {
      agendamento: {
        estabelecimentoId: usuario.estabelecimentoId,
        ...(usuario.papel === "PROFISSIONAL" ? { profissionalId: usuario.profissionalId ?? "" } : {}),
      },
    },
    include: { agendamento: { include: { cliente: true } } },
    orderBy: { agendadaPara: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-5">
        <h1 className="font-heading text-2xl font-extrabold text-text">Mensagens</h1>
        <p className="text-sm text-text-muted">Fila de confirmações e lembretes enviados aos clientes.</p>
      </header>

      <div className="mb-6">
        <BotaoSimularTempo fuso={fuso} />
      </div>

      {mensagens.length === 0 ? (
        <EstadoVazio
          icone={<MessageSquare className="mx-auto" />}
          titulo="Nenhuma mensagem ainda"
          descricao="Confirmações e lembretes aparecem aqui assim que houver agendamentos."
        />
      ) : (
        <ul className="space-y-2.5">
          {mensagens.map((m) => {
            const status = CONFIG_STATUS[m.status];
            return (
              <li key={m.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tom="neutral">{ROTULO_TIPO[m.tipo]}</Badge>
                    <Badge tom={status.tom}>{status.rotulo}</Badge>
                  </div>
                  <span className="text-xs text-text-faint">
                    {formatInTimeZone(m.agendadaPara, fuso, "d MMM, HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-sm text-text-muted">
                  Para <span className="font-medium text-text">{m.agendamento.cliente.nome}</span> · {m.canal}
                </p>
                <p className="mt-1.5 text-sm text-text">{m.texto}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
