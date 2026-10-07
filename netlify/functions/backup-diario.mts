import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { db } from "../../src/lib/db";

const DIAS_RETENCAO = 30;
const NOME_STORE = "backups-diarios";

/**
 * No plano gratuito da Netlify DB (Neon), backup automático/point-in-time recovery não existe
 * — só um snapshot manual. Essa função roda 1x por dia e salva um dump JSON de todo o banco
 * no Netlify Blobs (armazenamento próprio da Netlify, incluído em qualquer plano), mantendo os
 * últimos 30 dias. Não é um substituto de um Postgres com PITR de verdade, mas cobre o cenário
 * real que importa agora: "apaguei/estraguei algo sem querer, preciso voltar pra ontem".
 *
 * Restaurar (manual, quando precisar): puxar o JSON do dia via `getStore("backups-diarios")`
 * + `.get(chave, { type: "json" })` e recriar as linhas com Prisma — não existe um botão de
 * restaurar de propósito (é uma operação rara e perigosa demais pra deixar self-service).
 * `Sessao` fica de fora de propósito (são tokens de login, regeneram sozinhos e não têm valor
 * nenhum guardados por 30 dias), assim como as sessões e os links de acesso do admin. O funil
 * comercial e os custos do admin (`leads`, `custos`) entram, assim como o financeiro dos salões
 * (`adicionais`, `pagamentos` com o fiado, e `pagamentosComissao`).
 */
export default async () => {
  const [
    estabelecimentos,
    usuarios,
    profissionais,
    categorias,
    servicos,
    servicoProfissional,
    horarios,
    bloqueios,
    clientes,
    agendamentos,
    mensagens,
    relogioSimulado,
    leads,
    custos,
    adicionais,
    pagamentos,
    pagamentosComissao,
  ] = await Promise.all([
    db.estabelecimento.findMany(),
    db.usuario.findMany(),
    db.profissional.findMany(),
    db.categoriaServico.findMany(),
    db.servico.findMany(),
    db.servicoProfissional.findMany(),
    db.horarioFuncionamento.findMany(),
    db.bloqueio.findMany(),
    db.cliente.findMany(),
    db.agendamento.findMany(),
    db.mensagem.findMany(),
    db.relogioSimulado.findMany(),
    db.lead.findMany(),
    db.custo.findMany(),
    db.adicionalAtendimento.findMany(),
    db.pagamento.findMany(),
    db.pagamentoComissao.findMany(),
  ]);

  const backup = {
    geradoEm: new Date().toISOString(),
    estabelecimentos,
    usuarios,
    profissionais,
    categorias,
    servicos,
    servicoProfissional,
    horarios,
    bloqueios,
    clientes,
    agendamentos,
    mensagens,
    relogioSimulado,
    leads,
    custos,
    adicionais,
    pagamentos,
    pagamentosComissao,
  };

  const store = getStore(NOME_STORE);
  const chave = new Date().toISOString().slice(0, 10);
  await store.setJSON(chave, backup);

  const { blobs } = await store.list();
  const chavesAntigas = blobs.map((b) => b.key).sort().slice(0, -DIAS_RETENCAO);
  await Promise.all(chavesAntigas.map((k) => store.delete(k)));

  console.log(
    `[backup-diario] salvo ${chave} (${agendamentos.length} agendamentos, ${clientes.length} clientes) — ${chavesAntigas.length} backup(s) antigo(s) removido(s)`,
  );
};

export const config: Config = {
  // Mesmo horário da primeira rodada da fila de mensagens (08h de Brasília): as duas
  // aproveitam o mesmo período em que o banco já está acordado, em vez de acordá-lo de novo às 3h.
  schedule: "0 11 * * *",
};
