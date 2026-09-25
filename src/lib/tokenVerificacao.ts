import "server-only";
import { db } from "@/lib/db";
import type { TipoTokenVerificacao } from "@prisma/client";

const HORAS_CONFIRMAR_EMAIL = 7 * 24;
const HORAS_REDEFINIR_SENHA = 1;

function horasParaTipo(tipo: TipoTokenVerificacao): number {
  return tipo === "CONFIRMAR_EMAIL" ? HORAS_CONFIRMAR_EMAIL : HORAS_REDEFINIR_SENHA;
}

/** O `id` do token (cuid, imprevisível o bastante pra servir de segredo) é o próprio valor
 * colocado no link — mesmo padrão já usado pra `Sessao.id` neste projeto. */
export async function criarTokenVerificacao(usuarioId: string, tipo: TipoTokenVerificacao): Promise<string> {
  const expiraEm = new Date(Date.now() + horasParaTipo(tipo) * 60 * 60 * 1000);
  const token = await db.tokenVerificacao.create({ data: { usuarioId, tipo, expiraEm } });
  return token.id;
}

/** Valida e consome (marca como usado) um token — token de uso único, então uma segunda
 * tentativa com o mesmo link sempre falha, mesmo dentro do prazo. */
export async function consumirTokenVerificacao(tokenId: string, tipo: TipoTokenVerificacao) {
  const token = await db.tokenVerificacao.findUnique({ where: { id: tokenId }, include: { usuario: true } });
  if (!token || token.tipo !== tipo) return null;
  if (token.usadoEm) return null;
  if (token.expiraEm.getTime() < Date.now()) return null;

  await db.tokenVerificacao.update({ where: { id: tokenId }, data: { usadoEm: new Date() } });
  return token.usuario;
}
