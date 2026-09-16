import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { obterEstabelecimentoPorSlug } from "@/lib/estabelecimentoPublico";
import { calcularHorariosDisponiveisNoBanco } from "@/lib/agenda/consultarDisponibilidade";
import { paraDataYMD, somarDias } from "@/lib/tz";

const DIAS_JANELA = 60;

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/public/[slug]/disponibilidade">,
) {
  const { slug } = await ctx.params;
  const estabelecimento = await obterEstabelecimentoPorSlug(slug);
  if (!estabelecimento) return Response.json({ erro: "Não encontrado." }, { status: 404 });

  const servicoId = request.nextUrl.searchParams.get("servicoId");
  const profissionalId = request.nextUrl.searchParams.get("profissionalId");
  if (!servicoId || !profissionalId) {
    return Response.json({ erro: "Parâmetros ausentes." }, { status: 400 });
  }

  const [servico, profissional] = await Promise.all([
    db.servico.findFirst({ where: { id: servicoId, estabelecimentoId: estabelecimento.id, ativo: true } }),
    db.profissional.findFirst({ where: { id: profissionalId, estabelecimentoId: estabelecimento.id, ativo: true } }),
  ]);
  if (!servico || !profissional) return Response.json({ erro: "Não encontrado." }, { status: 404 });

  const hojeYMD = paraDataYMD(new Date(), estabelecimento.fuso);
  const dias: { data: string; temVaga: boolean }[] = [];

  for (let i = 0; i < DIAS_JANELA; i++) {
    const dataYMD = somarDias(hojeYMD, i);
    const slots = await calcularHorariosDisponiveisNoBanco(db, {
      profissionalId,
      dataYMD,
      fuso: estabelecimento.fuso,
      duracaoMin: servico.duracaoMin,
      antecedenciaMinMin: estabelecimento.antecedenciaMinMin,
    });
    dias.push({ data: dataYMD, temVaga: slots.length > 0 });
  }

  return Response.json({ dias });
}
