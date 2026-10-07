import { db } from "@/lib/db";
import { obterEstabelecimentoPorSlug } from "@/lib/estabelecimentoPublico";
import { reenviarConfirmacaoDaPreReserva } from "@/lib/agenda/confirmacaoPeloWhatsApp";

/** "Não chegou? Reenviar" da tela de espera do link. */
export async function POST(_request: Request, ctx: RouteContext<"/api/public/[slug]/agendamentos/[token]/reenviar">) {
  const { slug, token } = await ctx.params;
  const estabelecimento = await obterEstabelecimentoPorSlug(slug);
  if (!estabelecimento) return Response.json({ erro: "Não encontrado." }, { status: 404 });

  const agendamento = await db.agendamento.findFirst({
    where: { tokenPublico: token, estabelecimentoId: estabelecimento.id },
    select: { id: true },
  });
  if (!agendamento) return Response.json({ erro: "Não encontrado." }, { status: 404 });

  const resultado = await reenviarConfirmacaoDaPreReserva(agendamento.id);
  return resultado.sucesso ? Response.json({ ok: true }) : Response.json({ erro: resultado.erro }, { status: 409 });
}
