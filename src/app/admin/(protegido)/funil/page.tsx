import type { Metadata } from "next";
import { formatInTimeZone } from "date-fns-tz";
import { equipeAdmin, exigirAdmin } from "@/lib/admin/auth";
import { situacaoDaConta, type SituacaoConta } from "@/lib/assinatura";
import { db } from "@/lib/db";
import { FUSO_PADRAO, paraDataYMD } from "@/lib/tz";
import { FunilClient, type LeadCartao } from "@/components/admin/FunilClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Funil" };

function descreverSituacao(situacao: SituacaoConta): string {
  switch (situacao.tipo) {
    case "assinante":
      return "assinante";
    case "parceira":
      return "parceira";
    case "teste":
      return `em teste até ${formatInTimeZone(situacao.vence, FUSO_PADRAO, "dd/MM")}`;
    case "testeVencido":
      return "teste vencido";
  }
}

export default async function PaginaFunil() {
  await exigirAdmin();
  const agora = new Date();
  const [leads, saloesSemContato] = await Promise.all([
    db.lead.findMany({
      orderBy: { atualizadoEm: "desc" },
      include: {
        estabelecimento: {
          select: { id: true, nome: true, slug: true, criadoEm: true, assinanteDesde: true, parceira: true, testeAte: true },
        },
      },
    }),
    db.estabelecimento.findMany({ where: { lead: null }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);

  const cartoes: LeadCartao[] = leads.map((lead) => ({
    id: lead.id,
    nome: lead.nome,
    contato: lead.contato,
    telefone: lead.telefone,
    email: lead.email,
    instagram: lead.instagram,
    cidade: lead.cidade,
    segmento: lead.segmento,
    etapa: lead.etapa,
    responsavel: lead.responsavel,
    proximoContato: lead.proximoContatoEm ? paraDataYMD(lead.proximoContatoEm, FUSO_PADRAO) : "",
    anotacoes: lead.anotacoes,
    salao: lead.estabelecimento
      ? {
          id: lead.estabelecimento.id,
          nome: lead.estabelecimento.nome,
          slug: lead.estabelecimento.slug,
          situacao: descreverSituacao(situacaoDaConta(lead.estabelecimento, agora)),
        }
      : null,
  }));

  return (
    <FunilClient
      leads={cartoes}
      equipe={equipeAdmin().map((membro) => membro.nome)}
      saloesSemContato={saloesSemContato}
      hojeYMD={paraDataYMD(agora, FUSO_PADRAO)}
    />
  );
}
