"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validacao";
import { autenticar, criarSessao, encerrarSessao } from "@/lib/auth";
import { consumirTokenVerificacao } from "@/lib/tokenVerificacao";

export interface EstadoLogin {
  erro?: string;
}

export async function entrar(_estadoAnterior: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const resultado = loginSchema.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
  });

  if (!resultado.success) {
    return { erro: resultado.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const usuario = await autenticar(resultado.data.email, resultado.data.senha);
  if (!usuario) {
    return { erro: "E-mail ou senha incorretos." };
  }

  await criarSessao(usuario.id);
  redirect("/painel");
}

export async function sair(): Promise<void> {
  await encerrarSessao();
  redirect("/login");
}

/** Não bloqueia nada — só marca o e-mail como confirmado. Chamado direto pela página de
 * confirmação (não é um form), por isso não segue o formato de EstadoAcao. */
export async function confirmarEmail(token: string): Promise<boolean> {
  const usuario = await consumirTokenVerificacao(token, "CONFIRMAR_EMAIL");
  if (!usuario) return false;

  await db.usuario.update({ where: { id: usuario.id }, data: { emailVerificadoEm: new Date() } });
  return true;
}
