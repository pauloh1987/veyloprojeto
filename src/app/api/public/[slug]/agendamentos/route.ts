import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { obterEstabelecimentoPorSlug } from "@/lib/estabelecimentoPublico";
import { criarAgendamento } from "@/lib/agenda/criarAgendamento";
import { novoAgendamentoPublicoSchema } from "@/lib/validacao";
import { ErroDeAplicacao, mensagemSeguraDeErro } from "@/lib/erros";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/public/[slug]/agendamentos">,
) {
  const { slug } = await ctx.params;
  const estabelecimento = await obterEstabelecimentoPorSlug(slug);
  if (!estabelecimento) return Response.json({ erro: "Não encontrado." }, { status: 404 });

  const corpo = await request.json().catch(() => null);
  const resultado = novoAgendamentoPublicoSchema.safeParse(corpo);
  if (!resultado.success) {
    return Response.json({ erro: resultado.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }
  const dados = resultado.data;

  try {
    let cliente = await db.cliente.findFirst({
      where: { estabelecimentoId: estabelecimento.id, telefone: dados.telefone },
    });
    if (!cliente) {
      cliente = await db.cliente.create({
        data: { nome: dados.nome, telefone: dados.telefone, estabelecimentoId: estabelecimento.id },
      });
    } else if (cliente.nome !== dados.nome) {
      cliente = await db.cliente.update({ where: { id: cliente.id }, data: { nome: dados.nome } });
    }

    const agendamento = await criarAgendamento({
      estabelecimentoId: estabelecimento.id,
      profissionalId: dados.profissionalId,
      servicoId: dados.servicoId,
      clienteId: cliente.id,
      inicio: new Date(dados.inicioIso),
      origem: "LINK",
    });

    return Response.json({ id: agendamento.id, tokenPublico: agendamento.tokenPublico }, { status: 201 });
  } catch (erro) {
    const status = erro instanceof ErroDeAplicacao ? 409 : 500;
    return Response.json({ erro: mensagemSeguraDeErro(erro) }, { status });
  }
}
