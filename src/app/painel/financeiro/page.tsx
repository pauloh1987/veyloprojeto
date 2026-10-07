import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { exigirDono } from "@/lib/auth";
import { paraDataYMD } from "@/lib/tz";
import { primeiroMesDoNegocio } from "@/lib/relatorio";
import {
  escolherMesRelatorio,
  lerParametroMes,
  mesDoInstante,
  nomeDoMes,
  parametroMes,
  somarMeses,
  type MesAno,
} from "@/lib/mesRelatorio";
import { carregarFinanceiro } from "@/lib/financeiro/dadosFinanceiro";
import { ResumoDoMes } from "./ResumoDoMes";
import { SecaoAReceber } from "./SecaoAReceber";
import { SecaoComissoes } from "./SecaoComissoes";
import { SecaoEntradasPorDia, SecaoFormas } from "./SecaoEntradas";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Financeiro" };

const CLASSE_SETA = "flex h-8 w-8 items-center justify-center rounded-full";

/** O mês atual fica sem `?mes=` na URL. */
function hrefMes(mes: MesAno, atual: MesAno): string {
  const ehAtual = mes.ano === atual.ano && mes.mes === atual.mes;
  return ehAtual ? "/painel/financeiro" : `/painel/financeiro?mes=${parametroMes(mes)}`;
}

/** Financeiro do salão: o dinheiro que entrou no mês (por dia e por forma de pagamento), o fiado
 * a receber, as comissões da equipe com o que já foi pago, e o que fica com o salão. O fechamento
 * de cada atendimento é feito na janela "Finalizar atendimento". */
export default async function PaginaFinanceiro({ searchParams }: PageProps<"/painel/financeiro">) {
  const usuario = await exigirDono();
  const fuso = usuario.estabelecimento.fuso;
  const { mes: mesPedido } = await searchParams;
  const agora = new Date();
  const atual = mesDoInstante(agora, fuso);
  const { mes, anterior, proximo } = escolherMesRelatorio(
    lerParametroMes(mesPedido),
    atual,
    await primeiroMesDoNegocio(usuario.estabelecimento, fuso),
  );
  const dados = await carregarFinanceiro(usuario.estabelecimentoId, fuso, mes, agora);
  const hojeYMD = paraDataYMD(agora, fuso);
  const nomeMes = nomeDoMes(mes).toLowerCase();
  const rotuloMes = `${nomeMes} de ${mes.ano}`;

  return (
    <div className="@container mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-extrabold text-text">Financeiro</h1>
          <p className="text-sm text-text-muted">O dinheiro que entrou, o que falta receber e as comissões da equipe.</p>
        </div>
        <nav aria-label="Escolher o mês" className="flex items-center gap-1 rounded-full border border-border bg-surface p-1">
          {anterior ? (
            <Link href={hrefMes(anterior, atual)} aria-label={`Ver ${nomeDoMes(anterior)}`} className={`${CLASSE_SETA} text-text-muted hover:bg-surface-2 hover:text-text`}>
              <ChevronLeft size={16} aria-hidden />
            </Link>
          ) : (
            <span aria-hidden className={`${CLASSE_SETA} text-text-faint opacity-40`}>
              <ChevronLeft size={16} />
            </span>
          )}
          <span className="min-w-36 px-1 text-center text-sm font-semibold text-text">
            {nomeDoMes(mes)} de {mes.ano}
          </span>
          {proximo ? (
            <Link href={hrefMes(proximo, atual)} aria-label={`Ver ${nomeDoMes(proximo)}`} className={`${CLASSE_SETA} text-text-muted hover:bg-surface-2 hover:text-text`}>
              <ChevronRight size={16} aria-hidden />
            </Link>
          ) : (
            <span aria-hidden className={`${CLASSE_SETA} text-text-faint opacity-40`}>
              <ChevronRight size={16} />
            </span>
          )}
        </nav>
      </header>

      <ResumoDoMes dados={dados} nomeMes={nomeMes} nomeMesAnterior={nomeDoMes(somarMeses(mes, -1)).toLowerCase()} hojeYMD={hojeYMD} />

      <div className="mt-8 grid items-start gap-8 @4xl:grid-cols-2">
        <div className="space-y-8">
          <SecaoAReceber aReceber={dados.aReceber} fuso={fuso} hojeYMD={hojeYMD} temEquipe={dados.temEquipe} />
          <SecaoComissoes
            comissoes={dados.comissoes}
            nomeMes={nomeMes}
            rotuloMes={rotuloMes}
            mesReferencia={parametroMes(mes)}
            fuso={fuso}
            hojeYMD={hojeYMD}
          />
        </div>
        <div className="space-y-8">
          <SecaoFormas recebido={dados.recebido} nomeMes={nomeMes} />
          <SecaoEntradasPorDia recebido={dados.recebido} nomeMes={nomeMes} fuso={fuso} hojeYMD={hojeYMD} temEquipe={dados.temEquipe} />
        </div>
      </div>
    </div>
  );
}
