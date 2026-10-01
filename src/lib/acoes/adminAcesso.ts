"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { criarLinkAcessoAdmin, encerrarSessaoAdmin, entrarComLinkAcesso } from "@/lib/admin/auth";
import { notificadorEmailPadrao } from "@/lib/email/notificadorEmail";
import { emailEntrarAdmin } from "@/lib/email/textos";
import { obterUrlBase } from "@/lib/url";
import type { EstadoAcao } from "./agendamentos";

const emailSchema = z.string().trim().min(1, "Informe o seu e-mail.").email("E-mail inválido.");

/** Responde sempre a mesma coisa, tenha o e-mail acesso ou não, para a tela não revelar quem
 * é da equipe. */
export async function pedirLinkAdmin(_estadoAnterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const resultado = emailSchema.safeParse(formData.get("email") ?? "");
  if (!resultado.success) return { erro: resultado.error.issues[0]?.message ?? "E-mail inválido." };

  try {
    const link = await criarLinkAcessoAdmin(resultado.data);
    if (link) {
      const urlBase = await obterUrlBase();
      const envio = await notificadorEmailPadrao.enviar({
        destinatario: link.membro.email,
        ...emailEntrarAdmin(link.membro.nome, `${urlBase}/admin/acesso/${link.token}`),
      });
      if (!envio.sucesso) console.error(`[admin] falha ao enviar o link de acesso: ${envio.erro}`);
    }
  } catch (erro) {
    console.error("[admin] erro ao criar o link de acesso", erro);
  }
  return { sucesso: true };
}

export async function entrarNoAdmin(token: string): Promise<EstadoAcao> {
  let entrou = false;
  try {
    entrou = await entrarComLinkAcesso(token);
  } catch {
    return { erro: "Não foi possível entrar agora. Tente de novo." };
  }
  if (!entrou) return { erro: "Este link já foi usado ou expirou. Peça um novo." };
  redirect("/admin");
}

export async function sairDoAdmin(): Promise<void> {
  await encerrarSessaoAdmin();
  redirect("/admin/entrar");
}
