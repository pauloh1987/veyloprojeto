import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { Check, ChevronDown, Info, Send } from "lucide-react";
import type { DadosFinanceiro } from "@/lib/financeiro/dadosFinanceiro";
import { rotuloPercentuais, textoResumoComissao, type ComissaoDaProfissional } from "@/lib/financeiro/comissoes";
import { formatarCentavos } from "@/lib/formatadores";
import { linkCompartilharWhatsApp } from "@/lib/mensagens/textos";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { BotaoDesfazerPagamentoComissao, BotaoPagarComissao } from "./FinanceiroClient";
import { CabecalhoSecao } from "./CabecalhoSecao";

const CLASSE_LINK_DISCRETO = "font-semibold text-text-muted underline underline-offset-2 hover:text-text";

/** Comissão de cada profissional no mês, quanto já foi pago (acertos e vales) e quanto falta. */
export function SecaoComissoes({
  comissoes,
  nomeMes,
  rotuloMes,
  mesReferencia,
  fuso,
  hojeYMD,
}: {
  comissoes: DadosFinanceiro["comissoes"];
  /** "outubro" */
  nomeMes: string;
  /** "outubro de 2026" */
  rotuloMes: string;
  /** "2026-10" */
  mesReferencia: string;
  fuso: string;
  hojeYMD: string;
}) {
  const comissionadas = comissoes.porProfissional.filter((c) => c.temComissao);
  const semComissao = comissoes.porProfissional.filter((c) => !c.temComissao);

  return (
    <section id="comissoes" aria-labelledby="titulo-comissoes" className="scroll-mt-6">
      <CabecalhoSecao
        id="titulo-comissoes"
        titulo={`Comissões de ${nomeMes}`}
        descricao="Sobre o valor cobrado (serviço e adicionais) nos atendimentos finalizados no mês."
        total={comissionadas.length > 0 ? formatarCentavos(comissoes.totais.comissaoCentavos) : null}
      />

      {comissionadas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-5 py-6 text-sm text-text-muted">
          <p className="font-heading text-base font-bold text-text">Nenhuma profissional com comissão</p>
          <p className="mt-1">
            Se a sua equipe ganha por comissão, defina a porcentagem de cada uma em{" "}
            <Link href="/painel/profissionais" className={CLASSE_LINK_DISCRETO}>
              Profissionais
            </Link>
            . O valor aparece aqui já calculado, e você registra os pagamentos e os vales.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {comissionadas.map((comissao) => (
            <CartaoComissao
              key={comissao.profissionalId}
              comissao={comissao}
              rotuloMes={rotuloMes}
              mesReferencia={mesReferencia}
              fuso={fuso}
              hojeYMD={hojeYMD}
            />
          ))}
        </ul>
      )}

      {comissionadas.length > 0 && semComissao.length > 0 && (
        <p className="mt-3 flex gap-1.5 text-xs text-text-faint">
          <Info size={13} className="mt-px shrink-0" aria-hidden />
          <span>
            Sem comissão:{" "}
            {semComissao.map((c) => `${c.nome} (${formatarCentavos(c.baseCentavos)} faturados)`).join(", ")}. Esse valor fica
            todo com o salão.{" "}
            <Link href="/painel/profissionais" className={CLASSE_LINK_DISCRETO}>
              Definir comissão
            </Link>
          </span>
        </p>
      )}
    </section>
  );
}

function CartaoComissao({
  comissao,
  rotuloMes,
  mesReferencia,
  fuso,
  hojeYMD,
}: {
  comissao: ComissaoDaProfissional;
  rotuloMes: string;
  mesReferencia: string;
  fuso: string;
  hojeYMD: string;
}) {
  const quantidade = comissao.atendimentos.length;
  const percentual =
    comissao.percentuais.length > 0
      ? rotuloPercentuais(comissao.percentuais)
      : comissao.percentualAtual !== null
        ? `${comissao.percentualAtual}%`
        : null;
  const temDetalhes = quantidade > 0 || comissao.pagamentos.length > 0;

  return (
    <li className="rounded-2xl border border-border bg-surface">
      <div className="flex items-start gap-3 p-4">
        <Avatar nome={comissao.nome} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-text">{comissao.nome}</p>
              <p className="text-xs text-text-muted">
                {quantidade === 0
                  ? `${percentual ? `${percentual} · ` : ""}nenhum atendimento finalizado no mês`
                  : `${percentual ? `${percentual} de ` : ""}${formatarCentavos(comissao.baseCentavos)} · ${quantidade} ${quantidade === 1 ? "atendimento" : "atendimentos"}`}
              </p>
            </div>
            <p className="shrink-0 font-heading text-lg font-bold text-text">{formatarCentavos(comissao.comissaoCentavos)}</p>
          </div>
          <SituacaoDoPagamento comissao={comissao} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
        <BotaoPagarComissao
          profissionalId={comissao.profissionalId}
          profissionalNome={comissao.nome}
          mesReferencia={mesReferencia}
          rotuloMes={rotuloMes}
          comissaoCentavos={comissao.comissaoCentavos}
          pagoCentavos={comissao.pagoCentavos}
          faltaCentavos={comissao.faltaCentavos}
          hojeYMD={hojeYMD}
        />
        {temDetalhes && (
          <a
            href={linkCompartilharWhatsApp(textoResumoComissao(comissao, rotuloMes, fuso))}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-text-muted hover:bg-surface-2 hover:text-text"
          >
            <Send size={14} /> Enviar resumo
          </a>
        )}
      </div>

      {temDetalhes && (
        <details className="group border-t border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text [&::-webkit-details-marker]:hidden">
            Ver atendimentos e pagamentos
            <ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="space-y-4 px-4 pb-4">
            {comissao.pagamentos.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-text-faint">Pagamentos de {rotuloMes}</p>
                <ul className="divide-y divide-border">
                  {comissao.pagamentos.map((pagamento) => (
                    <li key={pagamento.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="min-w-0 text-text">
                        {formatInTimeZone(pagamento.pagoEm, fuso, "dd/MM")}
                        {pagamento.observacao && <span className="text-text-muted"> · {pagamento.observacao}</span>}
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="font-semibold text-text tabular-nums">{formatarCentavos(pagamento.valorCentavos)}</span>
                        <BotaoDesfazerPagamentoComissao pagamentoComissaoId={pagamento.id} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {quantidade > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-text-faint">Atendimentos finalizados</p>
                <ul className="divide-y divide-border">
                  {comissao.atendimentos.map((atendimento) => (
                    <li key={atendimento.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate text-text">{atendimento.clienteNome}</span>
                        <span className="block truncate text-xs text-text-faint">
                          {formatInTimeZone(atendimento.inicio, fuso, "dd/MM")} · {atendimento.servicoNome} ·{" "}
                          {formatarCentavos(atendimento.valorCentavos)}
                          {atendimento.percentual !== null && comissao.percentuais.length > 1 && ` · ${atendimento.percentual}%`}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold text-text tabular-nums">{formatarCentavos(atendimento.comissaoCentavos)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}
    </li>
  );
}

/** Barra do que já foi pago da comissão, com o que falta (ou o selo de pago, sempre com texto). */
function SituacaoDoPagamento({ comissao }: { comissao: ComissaoDaProfissional }) {
  const { comissaoCentavos, pagoCentavos, faltaCentavos, pagoAMaisCentavos } = comissao;
  if (comissaoCentavos === 0 && pagoCentavos === 0) return null;
  const proporcao = comissaoCentavos === 0 ? 1 : Math.min(1, pagoCentavos / comissaoCentavos);

  return (
    <div className="mt-3">
      <div
        role="meter"
        aria-label="Comissão já paga"
        aria-valuemin={0}
        aria-valuemax={comissaoCentavos}
        aria-valuenow={Math.min(pagoCentavos, comissaoCentavos)}
        aria-valuetext={`${formatarCentavos(pagoCentavos)} pagos de ${formatarCentavos(comissaoCentavos)}`}
        className="h-2 overflow-hidden rounded-full bg-grafico-1-trilho"
      >
        <div className="h-full rounded-full bg-grafico-1" style={{ width: `${proporcao * 100}%` }} />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-text-muted">
        <span>Pago {formatarCentavos(pagoCentavos)}</span>
        {pagoAMaisCentavos > 0 ? (
          <Badge tom="info" className="px-2 py-0.5">
            Pago a mais {formatarCentavos(pagoAMaisCentavos)}
          </Badge>
        ) : faltaCentavos > 0 ? (
          <span>
            Falta <strong className="font-semibold text-text">{formatarCentavos(faltaCentavos)}</strong>
          </span>
        ) : (
          <Badge tom="success" className="px-2 py-0.5">
            <Check size={11} aria-hidden /> Pago
          </Badge>
        )}
      </div>
    </div>
  );
}
