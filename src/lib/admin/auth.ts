import "server-only";
import { randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { lerEquipe, membroPorEmail, type MembroEquipe } from "./equipe";

/** Cookie só do admin, separado do `veylo_sessao` do painel dos salões e restrito a /admin. */
const COOKIE_ADMIN = "veylo_admin";
const CAMINHO_COOKIE = "/admin";
const DIAS_SESSAO = 30;
const MINUTOS_LINK = 15;
/** Acima disso de links pedidos para o mesmo e-mail dentro de MINUTOS_LINK, o pedido é ignorado. */
const MAX_LINKS_NA_JANELA = 3;

export function equipeAdmin(): MembroEquipe[] {
  return lerEquipe(process.env.ADMIN_EMAILS);
}

function gerarToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Cria o link de entrada para um e-mail da equipe. Null se o e-mail não tem acesso ou se já
 * pediu links demais nos últimos minutos. */
export async function criarLinkAcessoAdmin(email: string): Promise<{ token: string; membro: MembroEquipe } | null> {
  const membro = membroPorEmail(equipeAdmin(), email);
  if (!membro) return null;
  const recentes = await db.linkAcessoAdmin.count({
    where: { email: membro.email, criadoEm: { gte: new Date(Date.now() - MINUTOS_LINK * 60_000) } },
  });
  if (recentes >= MAX_LINKS_NA_JANELA) return null;

  const token = gerarToken();
  await db.linkAcessoAdmin.create({
    data: { id: token, email: membro.email, expiraEm: new Date(Date.now() + MINUTOS_LINK * 60_000) },
  });
  return { token, membro };
}

/** Confere o link sem gastá-lo: a página do link só mostra o botão "Entrar", para um leitor de
 * e-mail que abre links sozinho não consumir o acesso antes da pessoa. */
export async function linkAcessoValido(token: string): Promise<boolean> {
  const link = await db.linkAcessoAdmin.findUnique({ where: { id: token } });
  if (!link || link.usadoEm || link.expiraEm.getTime() <= Date.now()) return false;
  return membroPorEmail(equipeAdmin(), link.email) !== null;
}

/** Gasta o link (uso único) e abre a sessão do admin. */
export async function entrarComLinkAcesso(token: string): Promise<boolean> {
  if (!(await linkAcessoValido(token))) return false;
  // Marca como usado só se ainda não estava: duas abas com o mesmo link não entram as duas.
  const { count } = await db.linkAcessoAdmin.updateMany({
    where: { id: token, usadoEm: null },
    data: { usadoEm: new Date() },
  });
  if (count === 0) return false;
  const link = await db.linkAcessoAdmin.findUniqueOrThrow({ where: { id: token } });

  const expiraEm = new Date(Date.now() + DIAS_SESSAO * 24 * 60 * 60_000);
  const sessao = await db.sessaoAdmin.create({ data: { id: gerarToken(), email: link.email, expiraEm } });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_ADMIN, sessao.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiraEm,
    path: CAMINHO_COOKIE,
  });
  return true;
}

/** Quem da equipe está logado no admin. A lista ADMIN_EMAILS é conferida a cada acesso: tirar
 * um e-mail dela corta o acesso na hora, mesmo com a sessão aberta. */
export const obterAdminAtual = cache(async (): Promise<MembroEquipe | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_ADMIN)?.value;
  if (!token) return null;
  const sessao = await db.sessaoAdmin.findUnique({ where: { id: token } });
  if (!sessao || sessao.expiraEm.getTime() < Date.now()) return null;
  return membroPorEmail(equipeAdmin(), sessao.email);
});

export async function exigirAdmin(): Promise<MembroEquipe> {
  const admin = await obterAdminAtual();
  if (!admin) redirect("/admin/entrar");
  return admin;
}

export async function encerrarSessaoAdmin(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_ADMIN)?.value;
  if (token) await db.sessaoAdmin.deleteMany({ where: { id: token } });
  cookieStore.set(COOKIE_ADMIN, "", { path: CAMINHO_COOKIE, maxAge: 0 });
}
