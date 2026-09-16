"use server";

import { redirect } from "next/navigation";
import { loginSchema } from "@/lib/validacao";
import { autenticar, criarSessao, encerrarSessao } from "@/lib/auth";

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
