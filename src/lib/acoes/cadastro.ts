"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { cadastroSchema } from "@/lib/validacao";
import { hashSenha } from "@/lib/senha";
import { criarSessao } from "@/lib/auth";
import { criarHorariosPadrao } from "@/lib/agenda/horariosPadrao";
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

  await criarSessao(usuarioId);
  redirect("/painel/hoje");
}
