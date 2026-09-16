import type { Metadata } from "next";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { exigirSessao } from "@/lib/auth";
import { db } from "@/lib/db";
import { diaDaSemana, limitesDoDia, paraDataYMD, somarDias } from "@/lib/tz";
import type { ColunaGrade, EventoGrade } from "@/components/painel/GradeAgenda";
import { AgendaClient, type AgendamentoDetalhe } from "./AgendaClient";

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

export default async function PaginaAgenda({ searchParams }: PageProps<"/painel/agenda">) {
  const usuario = await exigirSessao();
  const { data } = await searchParams;
  const fuso = usuario.estabelecimento.fuso;
  const hojeYMD = paraDataYMD(new Date(), fuso);
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
    where: { estabelecimentoId: usuario.estabelecimentoId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, telefone: true },
  });

  const profissionaisParaModal = todosProfissionais.map((p) => ({
    id: p.id,
    nome: p.nome,
    servicos: p.servicos.map((sp) => ({ id: sp.servico.id, nome: sp.servico.nome, duracaoMin: sp.servico.duracaoMin })),
  }));

  const detalhes = new Map<string, AgendamentoDetalhe>();
  let colunas: ColunaGrade[] = [];
  let navegacaoAnterior: string;
  let navegacaoProxima: string;
  let rotuloPeriodo: string;
  let prefillPadrao: { profissionalId?: string; data: string };

  if (ehVisaoEquipe) {
    const { inicio, fimExclusivo } = limitesDoDia(dataRef, fuso);
    const agendamentos = await db.agendamento.findMany({
      where: {
        estabelecimentoId: usuario.estabelecimentoId,
        inicio: { gte: inicio, lt: fimExclusivo },
        status: { not: "CANCELADO" },
      },
      include: { cliente: true, servico: true },
    });

    colunas = todosProfissionais.map((prof) => {
      const eventos: EventoGrade[] = agendamentos
        .filter((a) => a.profissionalId === prof.id)
        .map((a) => {
          detalhes.set(a.id, paraDetalhe(a, fuso));
          return {
            id: a.id,
            inicioMin: minutosDoDia(a.inicio, fuso),
            fimMin: minutosDoDia(a.fim, fuso),
            titulo: a.cliente.nome,
            subtitulo: a.servico.nome,
            cor: a.servico.cor,
            status: a.status,
          };
        });
      return { chave: prof.id, titulo: prof.nome, eventos };
    });

    navegacaoAnterior = `/painel/agenda?data=${somarDias(dataRef, -1)}`;
    navegacaoProxima = `/painel/agenda?data=${somarDias(dataRef, 1)}`;
    rotuloPeriodo = formatInTimeZone(inicio, fuso, "EEEE, d 'de' MMMM", { locale: ptBR });
    prefillPadrao = { data: dataRef };
  } else {
    const profissional = todosProfissionais[0];
    const diaSemanaRef = diaDaSemana(dataRef);
    const offsetSegunda = diaSemanaRef === 0 ? -6 : 1 - diaSemanaRef;
    const segundaYMD = somarDias(dataRef, offsetSegunda);
    const diasDaSemana = Array.from({ length: 7 }, (_, i) => somarDias(segundaYMD, i));

    const { inicio: inicioSemana } = limitesDoDia(diasDaSemana[0], fuso);
    const { fimExclusivo: fimSemana } = limitesDoDia(diasDaSemana[6], fuso);

    const agendamentos = profissional
      ? await db.agendamento.findMany({
          where: {
            profissionalId: profissional.id,
            inicio: { gte: inicioSemana, lt: fimSemana },
            status: { not: "CANCELADO" },
          },
          include: { cliente: true, servico: true },
        })
      : [];

    colunas = diasDaSemana.map((diaYMD) => {
      const { inicio: inicioDia, fimExclusivo: fimDia } = limitesDoDia(diaYMD, fuso);
      const eventos: EventoGrade[] = agendamentos
        .filter((a) => a.inicio >= inicioDia && a.inicio < fimDia)
        .map((a) => {
          detalhes.set(a.id, paraDetalhe(a, fuso));
          return {
            id: a.id,
            inicioMin: minutosDoDia(a.inicio, fuso),
            fimMin: minutosDoDia(a.fim, fuso),
            titulo: a.cliente.nome,
            subtitulo: a.servico.nome,
            cor: a.servico.cor,
            status: a.status,
          };
        });
      return {
        chave: diaYMD,
        titulo: paraDDMM(diaYMD),
        subtitulo: NOMES_DIA_CURTO[diaDaSemana(diaYMD)],
        eventos,
      };
    });

    navegacaoAnterior = `/painel/agenda?data=${somarDias(dataRef, -7)}`;
    navegacaoProxima = `/painel/agenda?data=${somarDias(dataRef, 7)}`;
    rotuloPeriodo = `${paraDDMM(diasDaSemana[0])} – ${paraDDMM(diasDaSemana[6])}`;
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
      prefillPadrao={prefillPadrao}
    />
  );
}

function paraDetalhe(
  a: { id: string; inicio: Date; fim: Date; status: string; observacao: string | null; cliente: { nome: string; telefone: string }; servico: { nome: string; precoCentavos: number } },
  fuso: string,
): AgendamentoDetalhe {
  return {
    id: a.id,
    clienteNome: a.cliente.nome,
    clienteTelefone: a.cliente.telefone,
    servicoNome: a.servico.nome,
    precoCentavos: a.servico.precoCentavos,
    status: a.status as AgendamentoDetalhe["status"],
    observacao: a.observacao,
    horarioFormatado: `${formatInTimeZone(a.inicio, fuso, "HH:mm")}–${formatInTimeZone(a.fim, fuso, "HH:mm")}`,
  };
}
