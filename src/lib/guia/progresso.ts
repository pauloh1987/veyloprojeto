import "server-only";
import { db } from "@/lib/db";
import { comPassoMarcado, passosFeitos, type IdPassoGuia } from "./passos";

interface EstabelecimentoDoGuia {
  id: string;
  foto: string | null;
  guiaPassos: string;
}

/** Passos do guia "Comece por aqui" que este estabelecimento já fez. */
export async function carregarPassosFeitos(estabelecimento: EstabelecimentoDoGuia): Promise<IdPassoGuia[]> {
  const estabelecimentoId = estabelecimento.id;
  const [servicosAtivos, profissionaisAtivas, agendamentoPeloLink] = await Promise.all([
    db.servico.count({ where: { estabelecimentoId, ativo: true } }),
    db.profissional.count({ where: { estabelecimentoId, ativo: true } }),
    db.agendamento.findFirst({ where: { estabelecimentoId, origem: "LINK", confirmarAte: null }, select: { id: true } }),
  ]);
  return passosFeitos(estabelecimento.guiaPassos, {
    temLogo: Boolean(estabelecimento.foto),
    servicosAtivos,
    profissionaisAtivas,
    temAgendamentoPeloLink: agendamentoPeloLink !== null,
  });
}

/** Marca um passo do guia como feito: pelo botão do próprio guia ou ao salvar a tela do passo. */
export async function registrarPassoGuia(estabelecimentoId: string, passo: IdPassoGuia): Promise<void> {
  const atual = await db.estabelecimento.findUnique({
    where: { id: estabelecimentoId },
    select: { guiaPassos: true },
  });
  if (!atual) return;
  const novo = comPassoMarcado(atual.guiaPassos, passo);
  if (novo !== atual.guiaPassos) {
    await db.estabelecimento.update({ where: { id: estabelecimentoId }, data: { guiaPassos: novo } });
  }
}
