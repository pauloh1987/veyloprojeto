import "server-only";
import { db } from "@/lib/db";
import { situacaoDaConta, type SituacaoConta } from "@/lib/assinatura";
import { PASSOS_GUIA, passosFeitos } from "@/lib/guia/passos";
import { mesDoInstante, nomeDoMes, parametroMes, somarMeses } from "@/lib/mesRelatorio";
import { PRECO_MENSAL_REAIS } from "@/lib/plano";
import { FUSO_PADRAO, limitesDoDia, paraDataYMD, somarDias } from "@/lib/tz";
import { obterCotacaoDolar, type CotacaoDolar } from "./cotacao";
import {
  custoMensalEmReais,
  pareceContaDeTeste,
  resumirFinanceiro,
  type FrequenciaCusto,
  type MoedaCusto,
  type ResumoFinanceiro,
} from "./financeiro";
import { ETAPAS_FUNIL, type EtapaFunil } from "./funil";

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
  contaDeTeste: boolean;
  /** Não está marcada como teste, mas o nome, o endereço ou o e-mail parecem de teste. */
  pareceTeste: boolean;
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
  /** Passos do guia "Comece por aqui" já feitos. */
  configuracao: { feitos: number; total: number };
}

function contagemPorSalao(linhas: { estabelecimentoId: string; _count: { _all: number } }[]): Map<string, number> {
  return new Map(linhas.map((linha) => [linha.estabelecimentoId, linha._count._all]));
}

function inicioDoMes(agora: Date): Date {
  return limitesDoDia(`${parametroMes(mesDoInstante(agora, FUSO_PADRAO))}-01`, FUSO_PADRAO).inicio;
}

/** Todos os salões, inclusive as contas de teste (quem chama decide se separa). */
export async function carregarSaloes(agora: Date = new Date()): Promise<SalaoAdmin[]> {
  const desde30d = new Date(agora.getTime() - 30 * UM_DIA_MS);
  const desde7d = new Date(agora.getTime() - 7 * UM_DIA_MS);

  const [estabelecimentos, comLogo, porSalao30d, peloLink30d, porSalao7d, peloLinkTotal, ultimos, mensagens, logins] =
    await Promise.all([
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
          contaDeTeste: true,
          guiaPassos: true,
          usuarios: { where: { papel: "DONO" }, orderBy: { criadoEm: "asc" }, take: 1, select: { nome: true, email: true } },
          lead: { select: { etapa: true } },
          _count: {
            select: { profissionais: { where: { ativo: true } }, servicos: { where: { ativo: true } }, clientes: true },
          },
        },
      }),
      db.estabelecimento.findMany({ where: { foto: { not: null } }, select: { id: true } }),
      db.agendamento.groupBy({ by: ["estabelecimentoId"], where: { criadoEm: { gte: desde30d } }, _count: { _all: true } }),
      db.agendamento.groupBy({
        by: ["estabelecimentoId"],
        where: { criadoEm: { gte: desde30d }, origem: "LINK" },
        _count: { _all: true },
      }),
      db.agendamento.groupBy({ by: ["estabelecimentoId"], where: { criadoEm: { gte: desde7d } }, _count: { _all: true } }),
      db.agendamento.groupBy({ by: ["estabelecimentoId"], where: { origem: "LINK" }, _count: { _all: true } }),
      db.agendamento.groupBy({ by: ["estabelecimentoId"], _max: { criadoEm: true } }),
      db.mensagem.findMany({
        where: { status: "ENVIADA", enviadaEm: { gte: inicioDoMes(agora) } },
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

  const idsComLogo = new Set(comLogo.map((e) => e.id));
  const agendamentos30d = contagemPorSalao(porSalao30d);
  const agendamentosPeloLink30d = contagemPorSalao(peloLink30d);
  const agendamentos7d = contagemPorSalao(porSalao7d);
  const agendamentosPeloLink = contagemPorSalao(peloLinkTotal);
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

  return estabelecimentos.map((e) => {
    const dona = e.usuarios[0] ?? null;
    const feitos = passosFeitos(e.guiaPassos, {
      temLogo: idsComLogo.has(e.id),
      servicosAtivos: e._count.servicos,
      profissionaisAtivas: e._count.profissionais,
      temAgendamentoPeloLink: (agendamentosPeloLink.get(e.id) ?? 0) > 0,
    });
    return {
      id: e.id,
      nome: e.nome,
      slug: e.slug,
      telefone: e.telefone,
      criadoEm: e.criadoEm,
      dona,
      situacao: situacaoDaConta(e, agora),
      contaDeTeste: e.contaDeTeste,
      pareceTeste: !e.contaDeTeste && pareceContaDeTeste(e.nome, e.slug, dona?.email),
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
      configuracao: { feitos: feitos.length, total: PASSOS_GUIA.length },
    };
  });
}

export interface CustoAdmin {
  id: string;
  nome: string;
  categoria: string;
  valor: number;
  moeda: MoedaCusto;
  frequencia: FrequenciaCusto;
  observacao: string;
  ativo: boolean;
  /** Quanto pesa por mês, em reais (0 se desativado). */
  mensalEmReais: number;
}

export interface DadosFinanceiros {
  custos: CustoAdmin[];
  cotacao: CotacaoDolar;
  /** Todas as mensagens de WhatsApp enviadas em 30 dias, inclusive de contas de teste: é o que a
   * Twilio cobra. */
  mensagensWhatsApp30d: number;
  resumo: ResumoFinanceiro;
  assinantes: { id: string; nome: string; desde: Date }[];
  parceiras: { id: string; nome: string }[];
  emTeste: number;
  precoMensal: number;
}

/** Custos, receita e resultado do mês. `saloesReais` = salões sem as contas de teste. */
export async function carregarFinanceiro(saloesReais: SalaoAdmin[], agora: Date = new Date()): Promise<DadosFinanceiros> {
  const [custos, cotacao, mensagensWhatsApp30d] = await Promise.all([
    db.custo.findMany({ orderBy: [{ ativo: "desc" }, { nome: "asc" }] }),
    obterCotacaoDolar(),
    db.mensagem.count({
      where: { canal: "WHATSAPP", status: "ENVIADA", enviadaEm: { gte: new Date(agora.getTime() - 30 * UM_DIA_MS) } },
    }),
  ]);
  const base = { cotacaoDolar: cotacao.valor, mensagensWhatsApp30d };
  const assinantes = saloesReais.flatMap((s) => (s.situacao.tipo === "assinante" ? [{ id: s.id, nome: s.nome, desde: s.situacao.desde }] : []));
  const emTeste = saloesReais.filter((s) => s.situacao.tipo === "teste").length;

  return {
    custos: custos
      .map((custo) => ({
        id: custo.id,
        nome: custo.nome,
        categoria: custo.categoria,
        valor: custo.valor,
        moeda: custo.moeda,
        frequencia: custo.frequencia,
        observacao: custo.observacao,
        ativo: custo.ativo,
        mensalEmReais: custoMensalEmReais(custo, base),
      }))
      .sort((a, b) => Number(b.ativo) - Number(a.ativo) || b.mensalEmReais - a.mensalEmReais),
    cotacao,
    mensagensWhatsApp30d,
    resumo: resumirFinanceiro({ custos, base, assinantes: assinantes.length, emTeste, precoMensal: PRECO_MENSAL_REAIS }),
    assinantes,
    parceiras: saloesReais.filter((s) => s.situacao.tipo === "parceira").map((s) => ({ id: s.id, nome: s.nome })),
    emTeste,
    precoMensal: PRECO_MENSAL_REAIS,
  };
}

export interface ResumoAdmin {
  total: number;
  novos30d: number;
  emTeste: number;
  vencendoEm3Dias: number;
  testeVencido: number;
  assinantes: number;
  parceiras: number;
  ativos7d: number;
  agendamentos30d: number;
  agendamentosPeloLink30d: number;
  mensagensMes: number;
  contasDeTeste: number;
}

export interface VisaoGeral {
  resumo: ResumoAdmin;
  financeiro: DadosFinanceiros;
  cadastrosPorMes: { rotulo: string; total: number }[];
  agendamentosPorSemana: { rotulo: string; link: number; manual: number }[];
  atencao: {
    vencendo: SalaoAdmin[];
    vencidos: SalaoAdmin[];
    semConfigurar: SalaoAdmin[];
    parados: SalaoAdmin[];
    pareceTeste: SalaoAdmin[];
    mensagensComErro7d: number;
  };
  funil: { porEtapa: Record<EtapaFunil, number>; emNegociacao: number; paraHoje: number; fechados30d: number };
}

const MESES_NO_GRAFICO = 6;
const SEMANAS_NO_GRAFICO = 8;

export async function carregarVisaoGeral(agora: Date = new Date()): Promise<VisaoGeral> {
  const todos = await carregarSaloes(agora);
  const reais = todos.filter((s) => !s.contaDeTeste);
  const idsDeTeste = todos.filter((s) => s.contaDeTeste).map((s) => s.id);
  const desde30d = new Date(agora.getTime() - 30 * UM_DIA_MS);
  const desdeSemanas = new Date(agora.getTime() - SEMANAS_NO_GRAFICO * 7 * UM_DIA_MS);
  const fimDeHoje = limitesDoDia(somarDias(paraDataYMD(agora, FUSO_PADRAO), 1), FUSO_PADRAO).inicio;

  const [financeiro, agendamentosRecentes, mensagensComErro7d, leadsPorEtapa, paraHoje, fechados30d] = await Promise.all([
    carregarFinanceiro(reais, agora),
    db.agendamento.findMany({
      where: { criadoEm: { gte: desdeSemanas }, estabelecimentoId: { notIn: idsDeTeste } },
      select: { criadoEm: true, origem: true },
    }),
    db.mensagem.count({
      where: {
        status: "ERRO",
        agendadaPara: { gte: new Date(agora.getTime() - 7 * UM_DIA_MS) },
        OR: [{ agendamento: { estabelecimentoId: { notIn: idsDeTeste } } }, { cliente: { estabelecimentoId: { notIn: idsDeTeste } } }],
      },
    }),
    db.lead.groupBy({ by: ["etapa"], _count: { _all: true } }),
    db.lead.count({ where: { proximoContatoEm: { lt: fimDeHoje }, etapa: { notIn: ["FECHADO", "PERDIDO"] } } }),
    db.lead.count({ where: { etapa: "FECHADO", atualizadoEm: { gte: desde30d } } }),
  ]);

  const mesAtual = mesDoInstante(agora, FUSO_PADRAO);
  const cadastrosPorMes = Array.from({ length: MESES_NO_GRAFICO }, (_, i) => {
    const mes = somarMeses(mesAtual, i - (MESES_NO_GRAFICO - 1));
    const total = reais.filter((s) => {
      const criado = mesDoInstante(s.criadoEm, FUSO_PADRAO);
      return criado.ano === mes.ano && criado.mes === mes.mes;
    }).length;
    return { rotulo: nomeDoMes(mes).slice(0, 3).toLowerCase(), total };
  });

  const agendamentosPorSemana = Array.from({ length: SEMANAS_NO_GRAFICO }, (_, i) => {
    const fim = agora.getTime() - (SEMANAS_NO_GRAFICO - 1 - i) * 7 * UM_DIA_MS;
    const inicio = fim - 7 * UM_DIA_MS;
    const daSemana = agendamentosRecentes.filter((a) => a.criadoEm.getTime() > inicio && a.criadoEm.getTime() <= fim);
    const link = daSemana.filter((a) => a.origem === "LINK").length;
    const [, mes, dia] = paraDataYMD(new Date(inicio + UM_DIA_MS), FUSO_PADRAO).split("-");
    return { rotulo: `${dia}/${mes}`, link, manual: daSemana.length - link };
  });

  const porEtapa = Object.fromEntries(ETAPAS_FUNIL.map((e) => [e.id, 0])) as Record<EtapaFunil, number>;
  for (const linha of leadsPorEtapa) porEtapa[linha.etapa] = linha._count._all;
  const contar = (filtro: (salao: SalaoAdmin) => boolean) => reais.filter(filtro).length;
  const somar = (campo: (salao: SalaoAdmin) => number) => reais.reduce((total, salao) => total + campo(salao), 0);
  const diasDesde = (data: Date) => (agora.getTime() - data.getTime()) / UM_DIA_MS;

  return {
    resumo: {
      total: reais.length,
      novos30d: contar((s) => s.criadoEm >= desde30d),
      emTeste: contar((s) => s.situacao.tipo === "teste"),
      vencendoEm3Dias: contar((s) => s.situacao.tipo === "teste" && s.situacao.diasRestantes <= 3),
      testeVencido: contar((s) => s.situacao.tipo === "testeVencido"),
      assinantes: contar((s) => s.situacao.tipo === "assinante"),
      parceiras: contar((s) => s.situacao.tipo === "parceira"),
      ativos7d: contar((s) => s.agendamentos7d > 0),
      agendamentos30d: somar((s) => s.agendamentos30d),
      agendamentosPeloLink30d: somar((s) => s.agendamentosPeloLink30d),
      mensagensMes: somar((s) => s.mensagensMes),
      contasDeTeste: idsDeTeste.length,
    },
    financeiro,
    cadastrosPorMes,
    agendamentosPorSemana,
    atencao: {
      vencendo: reais.filter((s) => s.situacao.tipo === "teste" && s.situacao.diasRestantes <= 3),
      vencidos: reais.filter((s) => s.situacao.tipo === "testeVencido"),
      semConfigurar: reais.filter((s) => s.servicos === 0 && diasDesde(s.criadoEm) > 2),
      parados: reais.filter(
        (s) =>
          s.servicos > 0 &&
          s.situacao.tipo !== "testeVencido" &&
          diasDesde(s.criadoEm) > 7 &&
          (!s.ultimoAgendamentoEm || diasDesde(s.ultimoAgendamentoEm) > 14),
      ),
      pareceTeste: reais.filter((s) => s.pareceTeste),
      mensagensComErro7d,
    },
    funil: {
      porEtapa,
      emNegociacao: porEtapa.PROSPECCAO + porEtapa.CONTATO + porEtapa.DEMONSTRACAO + porEtapa.EM_TESTE,
      paraHoje,
      fechados30d,
    },
  };
}
