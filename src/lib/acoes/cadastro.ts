"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { cadastroSchema } from "@/lib/validacao";
import { hashSenha } from "@/lib/senha";
import { criarSessao } from "@/lib/auth";
import { criarHorariosPadrao } from "@/lib/agenda/horariosPadrao";
import { criarTokenVerificacao } from "@/lib/tokenVerificacao";
import { notificadorEmailPadrao } from "@/lib/email/notificadorEmail";
import { emailConfirmarConta } from "@/lib/email/textos";
import { obterUrlBase } from "@/lib/url";
import { mensagemSeguraDeErro, ValidacaoError } from "@/lib/erros";

export interface EstadoCadastro {
  erro?: string;
}

export async function cadastrarEstabelecimento(
  _estadoAnterior: EstadoCadastro,
  formData: FormData,
): Promise<EstadoCadastro> {
  const resultado = cadastroSchema.safeParse({
    nomeEstabelecimento: formData.get("nomeEstabelecimento"),
    slug: formData.get("slug"),
    plano: formData.get("plano"),
    nomeDono: formData.get("nomeDono"),
    email: formData.get("email"),
    senha: formData.get("senha"),
    telefone: formData.get("telefone"),
    endereco: formData.get("endereco"),
  });
  if (!resultado.success) {
    return { erro: resultado.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const dados = resultado.data;

  let usuarioId: string;
  try {
    const [slugExistente, emailExistente] = await Promise.all([
      db.estabelecimento.findUnique({ where: { slug: dados.slug } }),
      db.usuario.findUnique({ where: { email: dados.email } }),
    ]);
    if (slugExistente) throw new ValidacaoError("Esse endereço já está em uso. Escolha outro.");
    if (emailExistente) throw new ValidacaoError("Já existe uma conta com esse e-mail.");

    usuarioId = await db.$transaction(async (tx) => {
      const estabelecimento = await tx.estabelecimento.create({
        data: {
          nome: dados.nomeEstabelecimento,
          slug: dados.slug,
          telefone: dados.telefone,
          endereco: dados.endereco,
          plano: dados.plano,
        },
      });

      const profissional = await tx.profissional.create({
        data: { nome: dados.nomeDono, ativo: true, estabelecimentoId: estabelecimento.id },
      });
      await criarHorariosPadrao(tx, profissional.id);

      const usuario = await tx.usuario.create({
        data: {
          nome: dados.nomeDono,
          email: dados.email,
          senhaHash: hashSenha(dados.senha),
          papel: "DONO",
          estabelecimentoId: estabelecimento.id,
          profissionalId: profissional.id,
        },
      });

      return usuario.id;
    });
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }

  // Fora da transação e sem travar o cadastro se falhar — a conta já existe de qualquer
  // jeito; confirmação de e-mail aqui é só um selo de confiança, não uma trava de acesso.
  try {
    const token = await criarTokenVerificacao(usuarioId, "CONFIRMAR_EMAIL");
    const urlBase = await obterUrlBase();
    await notificadorEmailPadrao.enviar({
      destinatario: dados.email,
      ...emailConfirmarConta(dados.nomeEstabelecimento, `${urlBase}/confirmar-email/${token}`),
    });
  } catch {
    // Segue o cadastro normalmente mesmo se o e-mail de confirmação falhar.
  }

  await criarSessao(usuarioId);
  redirect("/painel/hoje");
}
