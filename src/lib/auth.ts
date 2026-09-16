import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verificarSenha } from "@/lib/senha";

export const COOKIE_SESSAO = "veylo_sessao";
const SESSAO_DURACAO_DIAS = 30;

export async function autenticar(email: string, senha: string) {
  const usuario = await db.usuario.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!usuario) return null;
  if (!verificarSenha(senha, usuario.senhaHash)) return null;
  return usuario;
}

export async function criarSessao(usuarioId: string): Promise<void> {
  const expiraEm = new Date(Date.now() + SESSAO_DURACAO_DIAS * 24 * 60 * 60 * 1000);
  const sessao = await db.sessao.create({ data: { usuarioId, expiraEm } });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_SESSAO, sessao.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiraEm,
    path: "/",
  });
}

export async function encerrarSessao(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_SESSAO)?.value;
  if (token) {
    await db.sessao.deleteMany({ where: { id: token } });
  }
  cookieStore.delete(COOKIE_SESSAO);
}

/** Sessão do usuário logado (sem o hash de senha), memoizada durante a mesma renderização. */
export const obterSessaoAtual = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_SESSAO)?.value;
  if (!token) return null;

  const sessao = await db.sessao.findUnique({
    where: { id: token },
    select: {
      expiraEm: true,
      usuario: {
        select: {
          id: true,
          nome: true,
          email: true,
          papel: true,
          estabelecimentoId: true,
          profissionalId: true,
          estabelecimento: true,
          profissional: true,
        },
      },
    },
  });

  if (!sessao || sessao.expiraEm.getTime() < Date.now()) return null;
  return sessao.usuario;
});

export type SessaoUsuario = NonNullable<Awaited<ReturnType<typeof obterSessaoAtual>>>;

export async function exigirSessao(): Promise<SessaoUsuario> {
  const usuario = await obterSessaoAtual();
  if (!usuario) redirect("/login");
  return usuario;
}

export async function exigirDono(): Promise<SessaoUsuario> {
  const usuario = await exigirSessao();
  if (usuario.papel !== "DONO") redirect("/painel/hoje");
  return usuario;
}
