import { db } from "@/lib/db";
import { obterEstabelecimentoPorSlug } from "@/lib/estabelecimentoPublico";
import { preReservaNoPrazo } from "@/lib/agenda/preReserva";
import { cancelarPelaCliente } from "@/lib/agenda/respostaCliente";

/** O token é o mesmo segredo da página do agendamento: quem tem o token já vê tudo isso lá. */
async function buscarPeloToken(slug: string, token: string) {
  const estabelecimento = await obterEstabelecimentoPorSlug(slug);
  if (!estabelecimento) return null;
  return db.agendamento.findFirst({
    where: { tokenPublico: token, estabelecimentoId: estabelecimento.id },
    select: { id: true, status: true, confirmarAte: true },
  });
}

/** Situação de um agendamento feito pelo link, para a tela "Falta confirmar no WhatsApp" perceber
 * sozinha quando a cliente toca em Confirmar. */
export async function GET(_request: Request, ctx: RouteContext<"/api/public/[slug]/agendamentos/[token]">) {
  const { slug, token } = await ctx.params;
  const agendamento = await buscarPeloToken(slug, token);
  if (!agendamento) return Response.json({ erro: "Não encontrado." }, { status: 404 });

  const situacao =
    agendamento.status === "AGUARDANDO_CLIENTE"
      ? preReservaNoPrazo(agendamento.confirmarAte)
        ? "aguardando"
        : "vencida"
      : agendamento.status === "CANCELADO"
        ? "cancelado"
        : "confirmado";
  return Response.json({ situacao }, { headers: { "Cache-Control": "no-store" } });
}

/** A cliente voltou para corrigir o número ou trocar o horário: solta a pré-reserva. Agendamento
 * de verdade se cancela pela página do agendamento, não por aqui. */
export async function DELETE(_request: Request, ctx: RouteContext<"/api/public/[slug]/agendamentos/[token]">) {
  const { slug, token } = await ctx.params;
  const agendamento = await buscarPeloToken(slug, token);
  if (!agendamento) return Response.json({ erro: "Não encontrado." }, { status: 404 });
  if (agendamento.status !== "AGUARDANDO_CLIENTE") {
    return Response.json({ erro: "Esse horário não está mais esperando confirmação." }, { status: 409 });
  }
  await cancelarPelaCliente(agendamento.id);
  return new Response(null, { status: 204 });
}
