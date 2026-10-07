"use server";

import { revalidatePath } from "next/cache";
import { fromZonedTime } from "date-fns-tz";
import { db } from "@/lib/db";
import { exigirDono } from "@/lib/auth";
import { carregarAgendamentoDoUsuario } from "@/lib/agenda/agendamentoDoUsuario";
import {
  finalizarAtendimentoSchema,
  pagamentoComissaoSchema,
  receberFiadosSchema,
  registrarRecebimentoSchema,
  type FinalizarAtendimentoInput,
  type PagamentoComissaoInput,
  type ReceberFiadosInput,
  type RegistrarRecebimentoInput,
} from "@/lib/validacao";
import { dataDoPagamentoNaHora, problemaNoPagamento, totalDoAtendimento } from "@/lib/financeiro/fechamento";
import { formatarCentavos } from "@/lib/formatadores";
import { paraDataYMD } from "@/lib/tz";
import { mesDoInstante, parametroMes } from "@/lib/mesRelatorio";
import { mensagemSeguraDeErro } from "@/lib/erros";
import type { EstadoAcao } from "./agendamentos";

function revalidarTelas(clienteId: string) {
  for (const caminho of ["/painel/hoje", "/painel/agenda", "/painel/financeiro", "/painel/relatorio", `/painel/clientes/${clienteId}`]) {
    revalidatePath(caminho);
  }
}

/** Janela "Finalizar atendimento": marca como atendido e grava o valor cobrado, os adicionais e como
 * foi pago. Serve também para corrigir um fechamento: refaz tudo, desde que nenhum fiado dele já
 * tenha sido recebido (aí o recebimento precisa ser desfeito antes, em Financeiro). */
export async function finalizarAtendimento(entrada: FinalizarAtendimentoInput): Promise<EstadoAcao> {
  try {
    const validado = finalizarAtendimentoSchema.safeParse(entrada);
    if (!validado.success) return { erro: validado.error.issues[0]?.message ?? "Dados inválidos." };
    const dados = validado.data;

    const { agendamento } = await carregarAgendamentoDoUsuario(dados.agendamentoId);
    if (agendamento.status === "CANCELADO" || agendamento.status === "AGUARDANDO_CLIENTE") {
      return { erro: "Esse agendamento não pode ser finalizado." };
    }

    const total = totalDoAtendimento(dados.valorServicoCentavos, dados.adicionais);
    // Atendimento de graça (total zero) fecha sem forma de pagamento.
    const pagamentos = total === 0 ? [] : dados.pagamentos;
    const problema = problemaNoPagamento(total, pagamentos);
    if (problema) return { erro: problema };

    const [fiadoJaRecebido, profissional] = await Promise.all([
      db.pagamento.count({ where: { agendamentoId: agendamento.id, forma: "FIADO", recebidoEm: { not: null } } }),
      db.profissional.findUnique({ where: { id: agendamento.profissionalId }, select: { comissaoPercentual: true } }),
    ]);
    if (fiadoJaRecebido > 0) {
      return { erro: "Parte do valor a receber desse atendimento já foi recebida. Desfaça o recebimento em Financeiro antes de mudar o pagamento." };
    }

    const pagoEm = dataDoPagamentoNaHora(agendamento.fim);
    await db.$transaction([
      db.adicionalAtendimento.deleteMany({ where: { agendamentoId: agendamento.id } }),
      db.pagamento.deleteMany({ where: { agendamentoId: agendamento.id } }),
      db.agendamento.update({
        where: { id: agendamento.id },
        data: {
          status: "ATENDIDO",
          valorServicoCentavos: dados.valorServicoCentavos,
          valorTotalCentavos: total,
          // A comissão de quando ele foi finalizado; ao corrigir o pagamento, fica a que já estava.
          comissaoPercentual: agendamento.comissaoPercentual ?? profissional?.comissaoPercentual ?? null,
          adicionais: { create: dados.adicionais },
          pagamentos: {
            create: pagamentos.map((p) => ({
              estabelecimentoId: agendamento.estabelecimentoId,
              valorCentavos: p.valorCentavos,
              forma: p.forma,
              recebidoEm: p.forma === "FIADO" ? null : pagoEm,
            })),
          },
        },
      }),
    ]);

    revalidarTelas(agendamento.clienteId);
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}

/** A cliente pagou o fiado (tudo ou uma parte). Recebimento em partes divide a linha: a parte paga
 * ganha data e forma, e o resto continua a receber. */
export async function registrarRecebimento(entrada: RegistrarRecebimentoInput): Promise<EstadoAcao> {
  try {
    const usuario = await exigirDono();
    const validado = registrarRecebimentoSchema.safeParse(entrada);
    if (!validado.success) return { erro: validado.error.issues[0]?.message ?? "Dados inválidos." };
    const { pagamentoId, forma, valorCentavos } = validado.data;

    const pagamento = await db.pagamento.findUnique({
      where: { id: pagamentoId },
      include: { agendamento: { select: { clienteId: true } } },
    });
    if (!pagamento || pagamento.estabelecimentoId !== usuario.estabelecimentoId) return { erro: "Valor não encontrado." };
    if (pagamento.forma !== "FIADO" || pagamento.recebidoEm) return { erro: "Esse valor já foi recebido." };
    if (valorCentavos > pagamento.valorCentavos) {
      return { erro: `O valor a receber é ${formatarCentavos(pagamento.valorCentavos)}.` };
    }

    const agora = new Date();
    if (valorCentavos === pagamento.valorCentavos) {
      await db.pagamento.update({ where: { id: pagamento.id }, data: { recebidoEm: agora, formaRecebimento: forma } });
    } else {
      await db.$transaction([
        db.pagamento.update({ where: { id: pagamento.id }, data: { valorCentavos: pagamento.valorCentavos - valorCentavos } }),
        db.pagamento.create({
          data: {
            estabelecimentoId: pagamento.estabelecimentoId,
            agendamentoId: pagamento.agendamentoId,
            valorCentavos,
            forma: "FIADO",
            recebidoEm: agora,
            formaRecebimento: forma,
          },
        }),
      ]);
    }

    revalidarTelas(pagamento.agendamento.clienteId);
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}

/** Marcou como recebido por engano: o valor volta para "a receber" (juntando com o que ainda faltava
 * desse atendimento, se houver). */
export async function desfazerRecebimento(pagamentoId: string): Promise<EstadoAcao> {
  try {
    const usuario = await exigirDono();
    const pagamento = await db.pagamento.findUnique({
      where: { id: String(pagamentoId) },
      include: { agendamento: { select: { clienteId: true } } },
    });
    if (!pagamento || pagamento.estabelecimentoId !== usuario.estabelecimentoId) return { erro: "Valor não encontrado." };
    if (pagamento.forma !== "FIADO" || !pagamento.recebidoEm) return { erro: "Só dá para desfazer o recebimento de um valor que era a receber." };

    const aindaAReceber = await db.pagamento.findFirst({
      where: { agendamentoId: pagamento.agendamentoId, forma: "FIADO", recebidoEm: null },
    });
    if (aindaAReceber) {
      await db.$transaction([
        db.pagamento.update({ where: { id: aindaAReceber.id }, data: { valorCentavos: aindaAReceber.valorCentavos + pagamento.valorCentavos } }),
        db.pagamento.delete({ where: { id: pagamento.id } }),
      ]);
    } else {
      await db.pagamento.update({ where: { id: pagamento.id }, data: { recebidoEm: null, formaRecebimento: null } });
    }

    revalidarTelas(pagamento.agendamento.clienteId);
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}

/** "Recebi tudo": a cliente pagou de uma vez os fiados em aberto que a tela mostrou, numa forma só.
 * Recebe só os que ainda estão em aberto (se outra aba já recebeu um, ele fica como está). */
export async function receberFiados(entrada: ReceberFiadosInput): Promise<EstadoAcao> {
  try {
    const usuario = await exigirDono();
    const validado = receberFiadosSchema.safeParse(entrada);
    if (!validado.success) return { erro: validado.error.issues[0]?.message ?? "Dados inválidos." };
    const { pagamentoIds, forma } = validado.data;

    const abertos = await db.pagamento.findMany({
      where: { id: { in: pagamentoIds }, estabelecimentoId: usuario.estabelecimentoId, forma: "FIADO", recebidoEm: null },
      select: { id: true, agendamento: { select: { clienteId: true } } },
    });
    if (abertos.length === 0) return { erro: "Esses valores já foram recebidos." };

    await db.pagamento.updateMany({
      where: { id: { in: abertos.map((p) => p.id) }, recebidoEm: null },
      data: { recebidoEm: new Date(), formaRecebimento: forma },
    });

    for (const clienteId of new Set(abertos.map((p) => p.agendamento.clienteId))) revalidarTelas(clienteId);
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}

/** Acerto de comissão: quanto a dona pagou a uma profissional da comissão de um mês (tudo de uma
 * vez ou em partes, como um vale). Pode passar do que ela fez no mês (vale adiantado); a tela
 * mostra como "pago a mais". */
export async function registrarPagamentoComissao(entrada: PagamentoComissaoInput): Promise<EstadoAcao> {
  try {
    const usuario = await exigirDono();
    const validado = pagamentoComissaoSchema.safeParse(entrada);
    if (!validado.success) return { erro: validado.error.issues[0]?.message ?? "Dados inválidos." };
    const dados = validado.data;

    const profissional = await db.profissional.findFirst({
      where: { id: dados.profissionalId, estabelecimentoId: usuario.estabelecimentoId },
      select: { id: true },
    });
    if (!profissional) return { erro: "Profissional não encontrada." };

    const fuso = usuario.estabelecimento.fuso;
    const agora = new Date();
    const hoje = paraDataYMD(agora, fuso);
    if (dados.data > hoje) return { erro: "A data do pagamento não pode ser depois de hoje." };
    if (dados.mesReferencia > parametroMes(mesDoInstante(agora, fuso))) return { erro: "Esse mês ainda não começou." };

    await db.pagamentoComissao.create({
      data: {
        estabelecimentoId: usuario.estabelecimentoId,
        profissionalId: profissional.id,
        mesReferencia: dados.mesReferencia,
        valorCentavos: dados.valorCentavos,
        // Pago hoje guarda a hora de agora; em outro dia, meio-dia (só o dia importa).
        pagoEm: dados.data === hoje ? agora : fromZonedTime(`${dados.data}T12:00:00`, fuso),
        observacao: dados.observacao,
      },
    });

    revalidatePath("/painel/financeiro");
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}

/** Registrou por engano: o acerto sai e o valor volta para "falta pagar". */
export async function desfazerPagamentoComissao(pagamentoComissaoId: string): Promise<EstadoAcao> {
  try {
    const usuario = await exigirDono();
    const pagamento = await db.pagamentoComissao.findUnique({
      where: { id: String(pagamentoComissaoId) },
      select: { id: true, estabelecimentoId: true },
    });
    if (!pagamento || pagamento.estabelecimentoId !== usuario.estabelecimentoId) return { erro: "Pagamento não encontrado." };

    await db.pagamentoComissao.delete({ where: { id: pagamento.id } });
    revalidatePath("/painel/financeiro");
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}
