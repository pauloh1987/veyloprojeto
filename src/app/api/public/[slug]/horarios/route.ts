import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { obterEstabelecimentoPorSlug } from "@/lib/estabelecimentoPublico";
import { calcularHorariosDisponiveisNoBanco } from "@/lib/agenda/consultarDisponibilidade";
import { ultimoDiaAgendavelYMD } from "@/lib/agenda/janelaAgendamento";

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/public/[slug]/horarios">,
) {
  const { slug } = await ctx.params;
  const estabelecimento = await obterEstabelecimentoPorSlug(slug);
  if (!estabelecimento) return Response.json({ erro: "Não encontrado." }, { status: 404 });

  const servicoId = request.nextUrl.searchParams.get("servicoId");
  const profissionalId = request.nextUrl.searchParams.get("profissionalId");
  const data = request.nextUrl.searchParams.get("data");
  if (!servicoId || !profissionalId || !data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return Response.json({ erro: "Parâmetros ausentes ou inválidos." }, { status: 400 });
  }

  if (data > ultimoDiaAgendavelYMD(estabelecimento)) {
    return Response.json({ horarios: [] });
  }

  const [servico, profissional] = await Promise.all([
    db.servico.findFirst({ where: { id: servicoId, estabelecimentoId: estabelecimento.id, ativo: true } }),
    db.profissional.findFirst({ where: { id: profissionalId, estabelecimentoId: estabelecimento.id, ativo: true } }),
  ]);
  if (!servico || !profissional) return Response.json({ erro: "Não encontrado." }, { status: 404 });

  const slots = await calcularHorariosDisponiveisNoBanco(db, {
    profissionalId,
    dataYMD: data,
    fuso: estabelecimento.fuso,
    duracaoMin: servico.duracaoMin,
    antecedenciaMinMin: estabelecimento.antecedenciaMinMin,
  });

  return Response.json({ horarios: slots.map((d) => d.toISOString()) });
}
