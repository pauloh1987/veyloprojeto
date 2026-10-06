"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { verificarSenha } from "@/lib/senha";
import { obterUrlBase } from "@/lib/url";
import { criarTokenVerificacao } from "@/lib/tokenVerificacao";
import { notificadorEmailPadrao } from "@/lib/email/notificadorEmail";
import { emailEnderecoTrocado, emailNovoEnderecoConta } from "@/lib/email/textos";
import { alterarEmailSchema } from "@/lib/validacao";
import { mensagemSeguraDeErro } from "@/lib/erros";
import type { EstadoAcao } from "./agendamentos";

/** A pessoa logada troca o próprio e-mail de acesso, confirmando com a senha atual. O endereço
 * novo recebe um link de confirmação (a confirmação é um selo, não trava o login) e o antigo,
 * um aviso da troca. Os avisos de agendamento passam a ir para o endereço novo. */
export async function alterarEmailDeAcesso(_estadoAnterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  try {
    const sessao = await exigirSessao();
    const resultado = alterarEmailSchema.safeParse({
      email: formData.get("email") ?? "",
      senhaAtual: formData.get("senhaAtual") ?? "",
    });
    if (!resultado.success) return { erro: resultado.error.issues[0]?.message ?? "Dados inválidos." };
    const { email, senhaAtual } = resultado.data;

    const usuario = await db.usuario.findUniqueOrThrow({ where: { id: sessao.id } });
    if (!verificarSenha(senhaAtual, usuario.senhaHash)) return { erro: "Senha atual incorreta." };
    if (email === usuario.email) return { erro: "Esse já é o seu e-mail de acesso." };
    const outraConta = await db.usuario.findUnique({ where: { email }, select: { id: true } });
    if (outraConta) return { erro: "Esse e-mail já é usado por outra conta." };

    // Links ainda não usados (confirmar e-mail, nova senha) foram para o endereço antigo e
    // deixam de valer: quem só tem a caixa antiga não confirma a nova nem troca a senha.
    await db.$transaction([
      db.usuario.update({ where: { id: usuario.id }, data: { email, emailVerificadoEm: null } }),
      db.tokenVerificacao.deleteMany({ where: { usuarioId: usuario.id, usadoEm: null } }),
    ]);

    // A troca já valeu; se os e-mails falharem, fica só no log.
    try {
      const urlBase = await obterUrlBase();
      const token = await criarTokenVerificacao(usuario.id, "CONFIRMAR_EMAIL");
      await notificadorEmailPadrao.enviar({
        destinatario: email,
        ...emailNovoEnderecoConta(sessao.estabelecimento.nome, `${urlBase}/confirmar-email/${token}`),
      });
      await notificadorEmailPadrao.enviar({
        destinatario: usuario.email,
        ...emailEnderecoTrocado(sessao.estabelecimento.nome, email, `${urlBase}/login`),
      });
    } catch (erro) {
      console.error("[conta] e-mails da troca de endereço não saíram", erro);
    }

    revalidatePath("/painel/configuracoes");
    return { sucesso: true };
  } catch (erro) {
    return { erro: mensagemSeguraDeErro(erro) };
  }
}
