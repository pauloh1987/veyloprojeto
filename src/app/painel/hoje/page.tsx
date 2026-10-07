import type { Metadata } from "next";
import { formatInTimeZone } from "date-fns-tz";
import { subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCheck, CheckCircle2, Clock3, MessageCircle, XCircle } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { db } from "@/lib/db";
import { limitesDoDia, paraDataYMD } from "@/lib/tz";
import { aplicarMascaraTelefone, formatarCentavos } from "@/lib/formatadores";
import { carregarPassosFeitos } from "@/lib/guia/progresso";
import { AVISO_COM_BOTOES_ENVIADO, situacaoResposta, textoParaConfirmarHorario } from "@/lib/agenda/situacaoResposta";
import { linkWhatsApp } from "@/lib/mensagens/textos";
import { obterUrlBase } from "@/lib/url";
import { Avatar } from "@/components/ui/Avatar";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/painel/StatusBadge";
import { BotoesStatusAgendamento } from "@/components/painel/BotoesStatusAgendamento";
import { GuiaComecePorAqui } from "@/components/painel/GuiaComecePorAqui";
import { INCLUIR_FECHAMENTO, carregarCatalogo, montarFechamento } from "@/lib/financeiro/dadosFechamento";
import { valorDoAtendimento } from "@/lib/financeiro/fechamento";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Hoje" };

const DIAS_RESPOSTAS_RECENTES = 3;

export default async function PaginaHoje() {
  const usuario = await exigirSessao();
  const fuso = usuario.estabelecimento.fuso;
  const agora = new Date();
  const hojeYMD = paraDataYMD(agora, fuso);
  const { inicio, fimExclusivo } = limitesDoDia(hojeYMD, fuso);

  const filtroProfissional = usuario.papel === "PROFISSIONAL" ? { profissionalId: usuario.profissionalId ?? "" } : {};
  const desde = subDays(new Date(), DIAS_RESPOSTAS_RECENTES);
  const mostrarGuia = usuario.papel === "DONO" && !usuario.estabelecimento.guiaEscondidoEm;

  const [agendamentos, respostas, guiaFeitos, catalogo] = await Promise.all([
    db.agendamento.findMany({
      where: {
        estabelecimentoId: usuario.estabelecimentoId,
        ...filtroProfissional,
        inicio: { gte: inicio, lt: fimExclusivo },
        confirmarAte: null,
      },
      include: { cliente: true, servico: true, profissional: true, mensagens: AVISO_COM_BOTOES_ENVIADO, ...INCLUIR_FECHAMENTO },
      orderBy: { inicio: "asc" },
    }),
    db.agendamento.findMany({
      where: {
        estabelecimentoId: usuario.estabelecimentoId,
        ...filtroProfissional,
        inicio: { gte: inicio },
        confirmarAte: null,
        OR: [{ presencaConfirmadaEm: { gte: desde } }, { canceladoPelaClienteEm: { gte: desde } }],
      },
      include: { cliente: true, servico: true },
      orderBy: { atualizadoEm: "desc" },
      take: 10,
    }),
    mostrarGuia ? carregarPassosFeitos(usuario.estabelecimento) : null,
    carregarCatalogo(usuario.estabelecimentoId),
  ]);

  const totalCentavos = agendamentos
    .filter((a) => a.status !== "CANCELADO")
    .reduce((soma, a) => soma + valorDoAtendimento(a), 0);

  const diaPorExtenso = formatInTimeZone(agora, fuso, "EEEE, d 'de' MMMM", { locale: ptBR });
  const tituloData = diaPorExtenso.charAt(0).toUpperCase() + diaPorExtenso.slice(1);
  const ehEquipe = usuario.estabelecimento.plano === "EQUIPE";
  const linkPublico = guiaFeitos ? `${await obterUrlBase()}/${usuario.estabelecimento.slug}` : "";

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-text">Hoje</h1>
          <p className="text-sm text-text-muted">{tituloData}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-faint">Total do dia</p>
          <p className="font-heading text-xl font-bold text-text">{formatarCentavos(totalCentavos)}</p>
        </div>
      </header>

      {guiaFeitos && (
        <GuiaComecePorAqui
          primeiroNome={usuario.nome.trim().split(/\s+/)[0] ?? ""}
          feitos={guiaFeitos}
          telefone={aplicarMascaraTelefone(usuario.estabelecimento.telefone)}
          linkPublico={linkPublico}
        />
      )}

      {respostas.length > 0 && (
        <section className="mb-6 rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
            <MessageCircle size={16} className="text-accent" /> Respostas das clientes
          </h2>
          <ul className="space-y-2">
            {respostas.map((r) => {
              const cancelou = r.status === "CANCELADO" && r.canceladoPelaClienteEm;
              return (
                <li key={r.id} className="flex items-start gap-2 text-sm">
                  {cancelou ? (
                    <XCircle size={16} className="mt-0.5 shrink-0 text-danger" />
                  ) : (
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
                  )}
                  <p className="text-text-muted">
                    <span className="font-semibold text-text">{r.cliente.nome}</span>{" "}
                    {cancelou ? "cancelou" : "confirmou presença em"} {r.servico.nome} ·{" "}
                    <span className="capitalize">{formatInTimeZone(r.inicio, fuso, "EEE, d/MM 'às' HH:mm", { locale: ptBR })}</span>
                    {cancelou && " — o horário voltou a ficar livre no link."}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

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
                  <p className="font-semibold text-text">{formatarCentavos(valorDoAtendimento(a))}</p>
                  <div className="mt-1 flex flex-col items-end gap-1">
                    <StatusBadge status={a.status} />
                    {situacaoResposta(a, agora) === "confirmou" && (
                      <Badge tom="success">
                        <CheckCircle2 size={11} /> cliente confirmou
                      </Badge>
                    )}
                    {situacaoResposta(a, agora) === "semResposta" && (
                      <>
                        <Badge tom="warning">
                          <Clock3 size={11} /> sem resposta
                        </Badge>
                        <a
                          href={linkWhatsApp(
                            a.cliente.telefone,
                            textoParaConfirmarHorario({ nomeCliente: a.cliente.nome, servico: a.servico.nome, inicio: a.inicio, fuso }, agora),
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-text hover:underline"
                        >
                          <MessageCircle size={12} /> Chamar no WhatsApp
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 border-t border-border pt-3">
                <BotoesStatusAgendamento agendamento={montarFechamento(a)} servicos={catalogo} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
