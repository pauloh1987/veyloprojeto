import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { db } from "@/lib/db";
import { aplicarMascaraTelefone } from "@/lib/formatadores";
import { linkWhatsApp, urlBaseSite } from "@/lib/mensagens/textos";
import { paraDataYMD } from "@/lib/tz";
import { notificadorEmailPadrao } from "./notificadorEmail";
import { emailCancelamento, emailNovoAgendamento } from "./textos";

export type EventoAvisoDona = "novo" | "cancelado";

/** Avisa por e-mail a dona do salão (cada conta de papel Dono) que uma cliente agendou pelo link
 * ou cancelou, quando o aviso está ligado em Configurações. Nunca lança: uma falha no e-mail não
 * pode atrapalhar o agendamento nem o cancelamento da cliente. */
export async function avisarDona(agendamentoId: string, evento: EventoAvisoDona): Promise<void> {
  try {
    const agendamento = await db.agendamento.findUnique({
      where: { id: agendamentoId },
      include: {
        cliente: true,
        servico: true,
        profissional: true,
        estabelecimento: {
          include: {
            usuarios: { where: { papel: "DONO" }, select: { email: true } },
            _count: { select: { profissionais: { where: { ativo: true } } } },
          },
        },
      },
    });
    if (!agendamento) return;
    const salao = agendamento.estabelecimento;
    if (evento === "novo" ? !salao.avisoNovoAgendamento : !salao.avisoCancelamento) return;
    const destinatarios = salao.usuarios.map((u) => u.email).filter(Boolean);
    if (destinatarios.length === 0) return;

    const base = urlBaseSite();
    const dados = {
      nomeEstabelecimento: salao.nome,
      nomeCliente: agendamento.cliente.nome,
      telefoneCliente: aplicarMascaraTelefone(agendamento.cliente.telefone),
      linkWhatsAppCliente: linkWhatsApp(agendamento.cliente.telefone),
      servico: agendamento.servico.nome,
      profissional: salao._count.profissionais > 1 ? agendamento.profissional.nome : null,
      quandoCurto: formatInTimeZone(agendamento.inicio, salao.fuso, "EEE, dd/MM 'às' HH:mm", { locale: ptBR }),
      quandoLongo: formatInTimeZone(agendamento.inicio, salao.fuso, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR }),
      linkAgenda: `${base}/painel/agenda?data=${paraDataYMD(agendamento.inicio, salao.fuso)}`,
      linkConfiguracoes: `${base}/painel/configuracoes`,
    };
    const email = evento === "novo" ? emailNovoAgendamento(dados) : emailCancelamento(dados);

    for (const destinatario of destinatarios) {
      const resultado = await notificadorEmailPadrao.enviar({ destinatario, assunto: email.assunto, html: email.html });
      if (!resultado.sucesso) {
        console.error(`[aviso-dona] e-mail (${evento}) do agendamento ${agendamentoId} não saiu: ${resultado.erro}`);
      }
    }
  } catch (erro) {
    console.error(`[aviso-dona] erro ao avisar a dona (${evento}) do agendamento ${agendamentoId}:`, erro);
  }
}
