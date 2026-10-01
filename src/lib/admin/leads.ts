import "server-only";
import { db } from "@/lib/db";
import { chaveTelefone, ETAPAS_ANTES_DO_CADASTRO } from "./funil";

/** Chamado logo depois de um cadastro novo: se o salão estava no funil (mesmo telefone ou
 * e-mail) e ainda não tinha conta, liga o contato ao estabelecimento e passa para "Em teste". */
export async function ligarLeadAoCadastro(
  estabelecimento: { id: string; telefone: string },
  emailDona: string,
): Promise<void> {
  const chave = chaveTelefone(estabelecimento.telefone);
  const email = emailDona.trim().toLowerCase();
  const candidatos = await db.lead.findMany({
    where: { estabelecimentoId: null, etapa: { in: ETAPAS_ANTES_DO_CADASTRO } },
    orderBy: { atualizadoEm: "desc" },
    select: { id: true, telefone: true, email: true },
  });
  const lead = candidatos.find(
    (candidato) =>
      (chave !== null && chaveTelefone(candidato.telefone) === chave) || (candidato.email !== "" && candidato.email === email),
  );
  if (!lead) return;
  await db.lead.update({ where: { id: lead.id }, data: { estabelecimentoId: estabelecimento.id, etapa: "EM_TESTE" } });
}
