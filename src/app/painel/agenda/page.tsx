import type { Metadata } from "next";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { exigirSessao } from "@/lib/auth";
import { db } from "@/lib/db";
import { diaDaSemana, limitesDoDia, paraDataYMD, somarDias } from "@/lib/tz";
import { relacaoComHoje, relacaoDaSemana, rotuloDaSemana, segundaDaSemana } from "@/lib/agenda/rotulosAgenda";
import { AVISO_COM_BOTOES_ENVIADO, situacaoResposta, textoParaConfirmarHorario } from "@/lib/agenda/situacaoResposta";
import { linkWhatsApp } from "@/lib/mensagens/textos";
import type { ColunaGrade, EventoGrade } from "@/components/painel/GradeAgenda";
import { AgendaClient, type AgendamentoDetalhe, type DiaDaFaixa } from "./AgendaClient";
import { filtroClienteVisivel } from "@/lib/agenda/preReserva";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Agenda" };

const NOMES_DIA_CURTO = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function paraDDMM(dataYMD: string): string {
  const [, mes, dia] = dataYMD.split("-");
  return `${dia}/${mes}`;
}

function minutosDoDia(instante: Date, fuso: string): number {
  const [h, m] = formatInTimeZone(instante, fuso, "HH:mm").split(":").map(Number);
  return h * 60 + m;
}

type AgendamentoDaGrade = {
  id: string;
  inicio: Date;
  fim: Date;
  status: AgendamentoDetalhe["status"];
  observacao: string | null;
  presencaConfirmadaEm: Date | null;
  cliente: { nome: string; telefone: string };
  servico: { nome: string; cor: string; precoCentavos: number };
  mensagens: { id: string }[];
};

export default async function PaginaAgenda({ searchParams }: PageProps<"/painel/agenda">) {
  const usuario = await exigirSessao();
  const { data } = await searchParams;
  const fuso = usuario.estabelecimento.fuso;
  const agora = new Date();
  const hojeYMD = paraDataYMD(agora, fuso);
  const dataRef = typeof data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : hojeYMD;

  const ehVisaoEquipe = usuario.estabelecimento.plano === "EQUIPE" && usuario.papel === "DONO";

  const todosProfissionais = await db.profissional.findMany({
    where: {
      estabelecimentoId: usuario.estabelecimentoId,
      ativo: true,
      ...(usuario.papel === "PROFISSIONAL" ? { id: usuario.profissionalId ?? "" } : {}),
    },
    include: { servicos: { include: { servico: true } } },
    orderBy: { nome: "asc" },
  });

  const clientes = await db.cliente.findMany({
    where: { estabelecimentoId: usuario.estabelecimentoId, ...filtroClienteVisivel },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, telefone: true },
  });

  const profissionaisParaModal = todosProfissionais.map((p) => ({
    id: p.id,
    nome: p.nome,
    servicos: p.servicos.map((sp) => ({ id: sp.servico.id, nome: sp.servico.nome, duracaoMin: sp.servico.duracaoMin })),
  }));

  const detalhes = new Map<string, AgendamentoDetalhe>();
  const paraEvento = (a: AgendamentoDaGrade): EventoGrade => {
    detalhes.set(a.id, paraDetalhe(a, fuso, agora));
    return {
      id: a.id,
      inicioMin: minutosDoDia(a.inicio, fuso),
      fimMin: minutosDoDia(a.fim, fuso),
      titulo: a.cliente.nome,
      subtitulo: a.servico.nome,
      cor: a.servico.cor,
      status: a.status,
      resposta: situacaoResposta(a, agora),
    };
  };

  let colunas: ColunaGrade[] = [];
  let navegacaoAnterior: string;
  let navegacaoProxima: string;
  let rotuloPeriodo: string;
  let relacaoPeriodo: string | null;
  let estaNoPresente: boolean;
  let diasDaFaixa: DiaDaFaixa[] | null = null;
  let prefillPadrao: { profissionalId?: string; data: string };

  if (ehVisaoEquipe) {
    const { inicio, fimExclusivo } = limitesDoDia(dataRef, fuso);
    const agendamentos = await db.agendamento.findMany({
      where: {
        estabelecimentoId: usuario.estabelecimentoId,
        inicio: { gte: inicio, lt: fimExclusivo },
        status: { notIn: ["CANCELADO", "AGUARDANDO_CLIENTE"] },
      },
      include: { cliente: true, servico: true, mensagens: AVISO_COM_BOTOES_ENVIADO },
    });

    colunas = todosProfissionais.map((prof) => ({
      chave: prof.id,
      titulo: prof.nome,
      eventos: agendamentos.filter((a) => a.profissionalId === prof.id).map(paraEvento),
    }));

    navegacaoAnterior = `/painel/agenda?data=${somarDias(dataRef, -1)}`;
    navegacaoProxima = `/painel/agenda?data=${somarDias(dataRef, 1)}`;
    const diaPorExtenso = formatInTimeZone(inicio, fuso, "EEEE, d 'de' MMMM", { locale: ptBR });
    rotuloPeriodo = diaPorExtenso.charAt(0).toUpperCase() + diaPorExtenso.slice(1);
    relacaoPeriodo = relacaoComHoje(dataRef, hojeYMD);
    estaNoPresente = dataRef === hojeYMD;
    const segundaRef = segundaDaSemana(dataRef);
    diasDaFaixa = Array.from({ length: 7 }, (_, i) => somarDias(segundaRef, i)).map((ymd) => ({
      dataYMD: ymd,
      href: `/painel/agenda?data=${ymd}`,
      diaSemana: NOMES_DIA_CURTO[diaDaSemana(ymd)],
      dia: Number(ymd.slice(8)),
    }));
    prefillPadrao = { data: dataRef };
  } else {
    const profissional = todosProfissionais[0];
    const segundaYMD = segundaDaSemana(dataRef);
    const diasDaSemana = Array.from({ length: 7 }, (_, i) => somarDias(segundaYMD, i));

    const { inicio: inicioSemana } = limitesDoDia(diasDaSemana[0], fuso);
    const { fimExclusivo: fimSemana } = limitesDoDia(diasDaSemana[6], fuso);

    const agendamentos = profissional
      ? await db.agendamento.findMany({
          where: {
            profissionalId: profissional.id,
            inicio: { gte: inicioSemana, lt: fimSemana },
            status: { notIn: ["CANCELADO", "AGUARDANDO_CLIENTE"] },
          },
          include: { cliente: true, servico: true, mensagens: AVISO_COM_BOTOES_ENVIADO },
        })
      : [];

    colunas = diasDaSemana.map((diaYMD) => {
      const { inicio: inicioDia, fimExclusivo: fimDia } = limitesDoDia(diaYMD, fuso);
      return {
        chave: diaYMD,
        titulo: paraDDMM(diaYMD),
        subtitulo: diaYMD === hojeYMD ? "hoje" : NOMES_DIA_CURTO[diaDaSemana(diaYMD)],
        destaque: diaYMD === hojeYMD,
        eventos: agendamentos.filter((a) => a.inicio >= inicioDia && a.inicio < fimDia).map(paraEvento),
      };
    });

    navegacaoAnterior = `/painel/agenda?data=${somarDias(dataRef, -7)}`;
    navegacaoProxima = `/painel/agenda?data=${somarDias(dataRef, 7)}`;
    rotuloPeriodo = rotuloDaSemana(segundaYMD);
    relacaoPeriodo = relacaoDaSemana(segundaYMD, hojeYMD);
    estaNoPresente = segundaYMD === segundaDaSemana(hojeYMD);
    prefillPadrao = { profissionalId: profissional?.id, data: dataRef };
  }

  return (
    <AgendaClient
      colunas={colunas}
      detalhes={Object.fromEntries(detalhes)}
      profissionais={profissionaisParaModal}
      clientes={clientes}
      fuso={fuso}
      navegacaoAnterior={navegacaoAnterior}
      navegacaoProxima={navegacaoProxima}
      navegacaoHoje="/painel/agenda"
      rotuloPeriodo={rotuloPeriodo}
      relacaoPeriodo={relacaoPeriodo}
      estaNoPresente={estaNoPresente}
      porDia={ehVisaoEquipe}
      diasDaFaixa={diasDaFaixa}
      dataAbertaYMD={dataRef}
      hojeYMD={hojeYMD}
      prefillPadrao={prefillPadrao}
    />
  );
}

function paraDetalhe(a: AgendamentoDaGrade, fuso: string, agora: Date): AgendamentoDetalhe {
  const resposta = situacaoResposta(a, agora);
  return {
    id: a.id,
    clienteNome: a.cliente.nome,
    clienteTelefone: a.cliente.telefone,
    servicoNome: a.servico.nome,
    precoCentavos: a.servico.precoCentavos,
    status: a.status,
    observacao: a.observacao,
    horarioFormatado: `${formatInTimeZone(a.inicio, fuso, "HH:mm")}–${formatInTimeZone(a.fim, fuso, "HH:mm")}`,
    resposta,
    linkChamarCliente:
      resposta === "semResposta"
        ? linkWhatsApp(
            a.cliente.telefone,
            textoParaConfirmarHorario({ nomeCliente: a.cliente.nome, servico: a.servico.nome, inicio: a.inicio, fuso }, agora),
          )
        : null,
  };
}
