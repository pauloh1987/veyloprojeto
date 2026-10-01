import "server-only";
import { db } from "@/lib/db";
import { situacaoDaConta, type SituacaoConta } from "@/lib/assinatura";
import { mesDoInstante, parametroMes } from "@/lib/mesRelatorio";
import { PRECO_MENSAL_REAIS } from "@/lib/plano";
import { FUSO_PADRAO, limitesDoDia } from "@/lib/tz";
import type { EtapaFunil } from "./funil";

const UM_DIA_MS = 24 * 60 * 60 * 1000;

/** Um salão como o admin vê: dados da conta e da dona e números de uso. Nada das clientes do
 * salão além de contagens (LGPD: elas são clientes deles, não da Veylo). */
export interface SalaoAdmin {
  id: string;
  nome: string;
  slug: string;
  telefone: string;
  criadoEm: Date;
  dona: { nome: string; email: string } | null;
  situacao: SituacaoConta;
  profissionais: number;
  servicos: number;
  clientes: number;
  agendamentos30d: number;
  agendamentosPeloLink30d: number;
  agendamentos7d: number;
  ultimoAgendamentoEm: Date | null;
  mensagensMes: number;
  ultimoLoginEm: Date | null;
  etapaFunil: EtapaFunil | null;
}

export interface ResumoAdmin {
  total: number;
  novos30d: number;
  emTeste: number;
  vencendoEm3Dias: number;
  testeVencido: number;
  assinantes: number;
  parceiras: number;
  receitaMensalReais: number;
  ativos7d: number;
  agendamentos30d: number;
  agendamentosPeloLink30d: number;
  mensagensMes: number;
}

function contagemPorSalao(linhas: { estabelecimentoId: string; _count: { _all: number } }[]): Map<string, number> {
  return new Map(linhas.map((linha) => [linha.estabelecimentoId, linha._count._all]));
}

export async function carregarVisaoGeral(agora: Date = new Date()): Promise<{ saloes: SalaoAdmin[]; resumo: ResumoAdmin }> {
  const desde30d = new Date(agora.getTime() - 30 * UM_DIA_MS);
  const desde7d = new Date(agora.getTime() - 7 * UM_DIA_MS);
  const inicioMes = limitesDoDia(`${parametroMes(mesDoInstante(agora, FUSO_PADRAO))}-01`, FUSO_PADRAO).inicio;

  const [estabelecimentos, porSalao30d, peloLink30d, porSalao7d, ultimos, mensagens, logins] = await Promise.all([
    db.estabelecimento.findMany({
      orderBy: { criadoEm: "desc" },
      select: {
        id: true,
        nome: true,
        slug: true,
        telefone: true,
        criadoEm: true,
        assinanteDesde: true,
        parceira: true,
        testeAte: true,
        usuarios: { where: { papel: "DONO" }, orderBy: { criadoEm: "asc" }, take: 1, select: { nome: true, email: true } },
        lead: { select: { etapa: true } },
        _count: {
          select: { profissionais: { where: { ativo: true } }, servicos: { where: { ativo: true } }, clientes: true },
        },
      },
    }),
    db.agendamento.groupBy({ by: ["estabelecimentoId"], where: { criadoEm: { gte: desde30d } }, _count: { _all: true } }),
    db.agendamento.groupBy({
      by: ["estabelecimentoId"],
      where: { criadoEm: { gte: desde30d }, origem: "LINK" },
      _count: { _all: true },
    }),
    db.agendamento.groupBy({ by: ["estabelecimentoId"], where: { criadoEm: { gte: desde7d } }, _count: { _all: true } }),
    db.agendamento.groupBy({ by: ["estabelecimentoId"], _max: { criadoEm: true } }),
    db.mensagem.findMany({
      where: { status: "ENVIADA", enviadaEm: { gte: inicioMes } },
      select: { cliente: { select: { estabelecimentoId: true } }, agendamento: { select: { estabelecimentoId: true } } },
    }),
    db.usuario.findMany({
      select: {
        estabelecimentoId: true,
        ultimoLoginEm: true,
        sessoes: { orderBy: { criadaEm: "desc" }, take: 1, select: { criadaEm: true } },
      },
    }),
  ]);

  const agendamentos30d = contagemPorSalao(porSalao30d);
  const agendamentosPeloLink30d = contagemPorSalao(peloLink30d);
  const agendamentos7d = contagemPorSalao(porSalao7d);
  const ultimoAgendamento = new Map(ultimos.map((linha) => [linha.estabelecimentoId, linha._max.criadoEm]));
  const mensagensMes = new Map<string, number>();
  for (const mensagem of mensagens) {
    const salao = mensagem.agendamento?.estabelecimentoId ?? mensagem.cliente?.estabelecimentoId;
    if (salao) mensagensMes.set(salao, (mensagensMes.get(salao) ?? 0) + 1);
  }
  const ultimoLogin = new Map<string, Date>();
  for (const usuario of logins) {
    // Contas de antes do ultimoLoginEm só têm a data da sessão aberta mais recente.
    const login = usuario.ultimoLoginEm ?? usuario.sessoes[0]?.criadaEm;
    const atual = ultimoLogin.get(usuario.estabelecimentoId);
    if (login && (!atual || login > atual)) ultimoLogin.set(usuario.estabelecimentoId, login);
  }

  const saloes: SalaoAdmin[] = estabelecimentos.map((e) => ({
    id: e.id,
    nome: e.nome,
    slug: e.slug,
    telefone: e.telefone,
    criadoEm: e.criadoEm,
    dona: e.usuarios[0] ?? null,
    situacao: situacaoDaConta(e, agora),
    profissionais: e._count.profissionais,
    servicos: e._count.servicos,
    clientes: e._count.clientes,
    agendamentos30d: agendamentos30d.get(e.id) ?? 0,
    agendamentosPeloLink30d: agendamentosPeloLink30d.get(e.id) ?? 0,
    agendamentos7d: agendamentos7d.get(e.id) ?? 0,
    ultimoAgendamentoEm: ultimoAgendamento.get(e.id) ?? null,
    mensagensMes: mensagensMes.get(e.id) ?? 0,
    ultimoLoginEm: ultimoLogin.get(e.id) ?? null,
    etapaFunil: e.lead?.etapa ?? null,
  }));

  const contar = (filtro: (salao: SalaoAdmin) => boolean) => saloes.filter(filtro).length;
  const somar = (campo: (salao: SalaoAdmin) => number) => saloes.reduce((total, salao) => total + campo(salao), 0);
  const assinantes = contar((s) => s.situacao.tipo === "assinante");

  return {
    saloes,
    resumo: {
      total: saloes.length,
      novos30d: contar((s) => s.criadoEm >= desde30d),
      emTeste: contar((s) => s.situacao.tipo === "teste"),
      vencendoEm3Dias: contar((s) => s.situacao.tipo === "teste" && s.situacao.diasRestantes <= 3),
      testeVencido: contar((s) => s.situacao.tipo === "testeVencido"),
      assinantes,
      parceiras: contar((s) => s.situacao.tipo === "parceira"),
      receitaMensalReais: assinantes * PRECO_MENSAL_REAIS,
      ativos7d: contar((s) => s.agendamentos7d > 0),
      agendamentos30d: somar((s) => s.agendamentos30d),
      agendamentosPeloLink30d: somar((s) => s.agendamentosPeloLink30d),
      mensagensMes: somar((s) => s.mensagensMes),
    },
  };
}
