"use server";

import { db } from "@/lib/db";
import { obterUrlBase } from "@/lib/url";
import { hashSenha } from "@/lib/senha";
import { criarTokenVerificacao, consumirTokenVerificacao } from "@/lib/tokenVerificacao";
import { notificadorEmailPadrao } from "@/lib/email/notificadorEmail";
import { emailRedefinirSenha } from "@/lib/email/textos";
import { solicitarRedefinicaoSenhaSchema, redefinirSenhaSchema } from "@/lib/validacao";

export interface EstadoRedefinicaoSenha {
  erro?: string;
  mensagem?: string;
}

const MENSAGEM_GENERICA = "Se esse e-mail estiver cadastrado, você vai receber um link pra redefinir a senha em instantes.";

/** Sempre retorna a mesma mensagem, exista ou não o e-mail — assim quem não tem conta não
 * descobre isso tentando redefinir a senha de qualquer endereço. */
export async function solicitarRedefinicaoSenha(
  _estadoAnterior: EstadoRedefinicaoSenha,
  formData: FormData,
): Promise<EstadoRedefinicaoSenha> {
  const resultado = solicitarRedefinicaoSenhaSchema.safeParse({ email: formData.get("email") });
  if (!resultado.success) {
    return { erro: resultado.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const usuario = await db.usuario.findUnique({ where: { email: resultado.data.email } });
  if (usuario) {
    const token = await criarTokenVerificacao(usuario.id, "REDEFINIR_SENHA");
    const urlBase = await obterUrlBase();
    await notificadorEmailPadrao.enviar({
      destinatario: usuario.email,
      ...emailRedefinirSenha(`${urlBase}/redefinir-senha/${token}`),
    });
  }

  return { mensagem: MENSAGEM_GENERICA };
}

export interface EstadoNovaSenha {
  erro?: string;
  sucesso?: boolean;
}

/** Redefine a senha e derruba todas as sessões existentes do usuário — se a senha foi
 * comprometida (ou só esquecida), qualquer sessão aberta em outro lugar também deve cair. */
export async function redefinirSenha(_estadoAnterior: EstadoNovaSenha, formData: FormData): Promise<EstadoNovaSenha> {
  const resultado = redefinirSenhaSchema.safeParse({
    token: formData.get("token"),
    senha: formData.get("senha"),
  });
  if (!resultado.success) {
    return { erro: resultado.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const usuario = await consumirTokenVerificacao(resultado.data.token, "REDEFINIR_SENHA");
  if (!usuario) {
    return { erro: "Esse link expirou ou já foi usado. Peça um novo link de redefinição." };
  }

  await db.$transaction([
    db.usuario.update({ where: { id: usuario.id }, data: { senhaHash: hashSenha(resultado.data.senha) } }),
    db.sessao.deleteMany({ where: { usuarioId: usuario.id } }),
  ]);

  return { sucesso: true };
}
