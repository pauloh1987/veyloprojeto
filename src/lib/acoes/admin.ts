"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/admin/auth";
import { IDS_ETAPAS, type EtapaFunil } from "@/lib/admin/funil";
import { testeEstendido } from "@/lib/assinatura";
import { leadSchema } from "@/lib/validacao";
import { FUSO_PADRAO, limitesDoDia } from "@/lib/tz";
import { mensagemSeguraDeErro, NaoEncontradoError, ValidacaoError } from "@/lib/erros";
import type { EstadoAcao } from "./agendamentos";

const DIAS_PARA_ESTENDER = 7;

/* Todas as ações chamam exigirAdmin() antes do try: sem sessão, o redirect para o login
 * precisa passar adiante em vez de virar uma mensagem de erro. */

async function buscarSalao(estabelecimentoId: string) {
  const salao = await db.estabelecimento.findUnique({
    where: { id: estabelecimentoId },
    select: { id: true, criadoEm: true, assinanteDesde: true, parceira: true, testeAte: true },
  });
  if (!salao) throw new NaoEncontradoError("Salão");
  return salao;
}

/** Quando o salão vira assinante ou parceira, o contato dele no funil vai para "Fechado". */
async function fecharLeadDoSalao(estabelecimentoId: string): Promise<void> {
  await db.lead.updateMany({ where: { estabelecimentoId, etapa: { not: "FECHADO" } }, data: { etapa: "FECHADO" } });
}

function atualizarTelas(): void {
  revalidatePath("/admin");
  revalidatePath("/admin/funil");
}

export async function estenderTesteSalao(estabelecimentoId: string): Promise<EstadoAcao> {
  await exigirAdmin();
  try {
    const salao = await buscarSalao(estabelecimentoId);
    await db.estabelecimento.update({
      where: { id: salao.id },
      data: { testeAte: testeEstendido(salao, DIAS_PARA_ESTENDER) },
    });
    atualizarTelas();
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}

/** Parceira = piloto sem cobrança e sem prazo de teste. Exclui a assinatura (são situações
 * diferentes: a receita do admin conta só assinantes). */
export async function definirParceria(estabelecimentoId: string, parceira: boolean): Promise<EstadoAcao> {
  await exigirAdmin();
  try {
    const salao = await buscarSalao(estabelecimentoId);
    await db.estabelecimento.update({
      where: { id: salao.id },
      data: parceira ? { parceira: true, assinanteDesde: null } : { parceira: false },
    });
    if (parceira) await fecharLeadDoSalao(salao.id);
    atualizarTelas();
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}

/** Marca à mão quem já paga (Pix, enquanto não há cobrança automática). */
export async function definirAssinatura(estabelecimentoId: string, assinante: boolean): Promise<EstadoAcao> {
  await exigirAdmin();
  try {
    const salao = await buscarSalao(estabelecimentoId);
    await db.estabelecimento.update({
      where: { id: salao.id },
      data: assinante ? { assinanteDesde: new Date(), parceira: false } : { assinanteDesde: null },
    });
    if (assinante) await fecharLeadDoSalao(salao.id);
    atualizarTelas();
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}

export async function salvarLead(_estadoAnterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  await exigirAdmin();
  try {
    const campo = (nome: string) => String(formData.get(nome) ?? "");
    const resultado = leadSchema.safeParse({
      id: campo("id"),
      nome: campo("nome"),
      contato: campo("contato"),
      telefone: campo("telefone"),
      email: campo("email"),
      instagram: campo("instagram"),
      cidade: campo("cidade"),
      segmento: campo("segmento"),
      etapa: campo("etapa"),
      responsavel: campo("responsavel"),
      proximoContato: campo("proximoContato"),
      anotacoes: campo("anotacoes"),
      estabelecimentoId: campo("estabelecimentoId"),
    });
    if (!resultado.success) return { erro: resultado.error.issues[0]?.message ?? "Dados inválidos." };
    const { id, proximoContato, estabelecimentoId, ...dados } = resultado.data;

    if (estabelecimentoId) {
      const salao = await db.estabelecimento.findUnique({
        where: { id: estabelecimentoId },
        select: { lead: { select: { id: true } } },
      });
      if (!salao) throw new NaoEncontradoError("Salão");
      if (salao.lead && salao.lead.id !== id) throw new ValidacaoError("Esse salão já está ligado a outro contato do funil.");
    }

    const data = {
      ...dados,
      proximoContatoEm: proximoContato ? limitesDoDia(proximoContato, FUSO_PADRAO).inicio : null,
      estabelecimentoId: estabelecimentoId || null,
    };
    if (id) {
      await db.lead.update({ where: { id }, data });
    } else {
      await db.lead.create({ data });
    }
    atualizarTelas();
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}

export async function moverLead(leadId: string, etapa: string): Promise<EstadoAcao> {
  await exigirAdmin();
  try {
    if (!IDS_ETAPAS.includes(etapa as EtapaFunil)) throw new ValidacaoError("Etapa inválida.");
    await db.lead.update({ where: { id: leadId }, data: { etapa: etapa as EtapaFunil } });
    atualizarTelas();
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}

export async function excluirLead(leadId: string): Promise<EstadoAcao> {
  await exigirAdmin();
  try {
    await db.lead.delete({ where: { id: leadId } });
    atualizarTelas();
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}
