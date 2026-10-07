import type { ReactNode } from "react";
import { Check, Minus, Percent, PiggyBank, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import type { DadosFinanceiro } from "@/lib/financeiro/dadosFinanceiro";
import { formatarCentavos } from "@/lib/formatadores";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { GraficoEntradas } from "./GraficoEntradas";
import { diaEMes } from "./formatos";

/** Topo do Financeiro: o dinheiro que entrou no mês (número principal, comparação e gráfico por
 * dia) e três cartões: fiado a receber, comissões e o que fica com o salão. */
export function ResumoDoMes({
  dados,
  nomeMes,
  nomeMesAnterior,
  hojeYMD,
}: {
  dados: DadosFinanceiro;
  /** "outubro" */
  nomeMes: string;
  nomeMesAnterior: string;
  hojeYMD: string;
}) {
  const { recebido, aReceber, comissoes, atendido } = dados;
  const melhorDia = recebido.dias.reduce<(typeof recebido.dias)[number] | null>(
    (melhor, dia) => (dia.totalCentavos > (melhor?.totalCentavos ?? 0) ? dia : melhor),
    null,
  );
  const temComissionadas = comissoes.porProfissional.some((c) => c.temComissao);
  const { comissaoCentavos, faltaCentavos } = comissoes.totais;
  const clientesDevendo = aReceber.porCliente.length;

  return (
    <section aria-label={`Resumo de ${nomeMes}`}>
      <Card>
        <div className="p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-muted">Entrou em {nomeMes}</p>
              <p className="mt-1 font-heading text-4xl font-extrabold tracking-tight text-text sm:text-5xl">
                {formatarCentavos(recebido.totalCentavos)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <Variacao
                  variacao={recebido.variacaoPercentual}
                  comparado={recebido.comparaMesmoPeriodo ? `mesmo período de ${nomeMesAnterior}` : nomeMesAnterior}
                />
                {recebido.quantidade > 0 && (
                  <span className="text-xs text-text-faint">
                    {recebido.quantidade} {recebido.quantidade === 1 ? "pagamento" : "pagamentos"}
                  </span>
                )}
              </div>
            </div>
            {melhorDia && (
              <div className="rounded-xl bg-surface-2 px-3 py-2">
                <p className="text-xs text-text-faint">Melhor dia</p>
                <p className="text-sm font-semibold text-text">
                  {diaEMes(melhorDia.dataYMD)} · {formatarCentavos(melhorDia.totalCentavos)}
                </p>
              </div>
            )}
          </div>
          {recebido.totalCentavos > 0 ? (
            <GraficoEntradas dias={recebido.dias} hojeYMD={hojeYMD} nomeMes={nomeMes} />
          ) : (
            <p className="mt-5 rounded-xl bg-surface-2 px-4 py-3 text-sm text-text-muted">
              Nenhum pagamento em {nomeMes} ainda. Quando você finaliza um atendimento, o valor entra aqui na forma em que a
              cliente pagou.
            </p>
          )}
        </div>
      </Card>

      <div className="mt-3 grid gap-3 @xl:grid-cols-3">
        <Kpi
          href="#a-receber"
          icone={<Wallet size={16} />}
          rotulo="A receber"
          valor={formatarCentavos(aReceber.totalCentavos)}
          detalhe={
            clientesDevendo === 0
              ? "Nada em aberto"
              : `${clientesDevendo} ${clientesDevendo === 1 ? "cliente" : "clientes"}, de todos os meses`
          }
        />
        <Kpi
          href="#comissoes"
          icone={<Percent size={16} />}
          rotulo={`Comissões de ${nomeMes}`}
          valor={formatarCentavos(comissaoCentavos)}
          detalhe={
            !temComissionadas ? (
              "Nenhuma profissional com comissão"
            ) : faltaCentavos > 0 ? (
              <>
                Falta pagar <strong className="font-semibold text-text">{formatarCentavos(faltaCentavos)}</strong>
              </>
            ) : comissaoCentavos > 0 ? (
              <span className="inline-flex items-center gap-1 font-semibold text-success">
                <Check size={13} aria-hidden /> Tudo pago
              </span>
            ) : (
              "Nada a pagar ainda"
            )
          }
        />
        <Kpi
          icone={<PiggyBank size={16} />}
          rotulo="Fica com o salão"
          valor={formatarCentavos(atendido.totalCentavos - comissaoCentavos)}
          detalhe={
            atendido.quantidade === 0
              ? "Nenhum atendimento finalizado no mês"
              : `${formatarCentavos(atendido.totalCentavos)} faturados${comissaoCentavos > 0 ? " menos as comissões" : ", sem comissões"}`
          }
        />
      </div>
    </section>
  );
}

/** "+12% vs. mesmo período de setembro", com seta. Sem base de comparação, avisa. */
function Variacao({ variacao, comparado }: { variacao: number | null; comparado: string }) {
  if (variacao === null) return <span className="text-xs text-text-faint">Sem entradas em {comparado} para comparar</span>;
  const arredondada = Math.round(variacao);
  const Icone = arredondada > 0 ? TrendingUp : arredondada < 0 ? TrendingDown : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold",
        arredondada > 0 ? "text-success" : arredondada < 0 ? "text-danger" : "text-text-muted",
      )}
    >
      <Icone size={14} aria-hidden />
      {arredondada > 0 ? "+" : ""}
      {arredondada}%<span className="font-normal text-text-muted">vs. {comparado}</span>
    </span>
  );
}

function Kpi({
  href,
  icone,
  rotulo,
  valor,
  detalhe,
}: {
  href?: string;
  icone: ReactNode;
  rotulo: string;
  valor: string;
  detalhe: ReactNode;
}) {
  const conteudo = (
    <>
      <div className="flex items-center gap-2">
        <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-text-muted">
          {icone}
        </span>
        <span className="text-sm font-medium text-text-muted">{rotulo}</span>
      </div>
      <p className="mt-3 font-heading text-xl font-extrabold whitespace-nowrap text-text @4xl:text-2xl">{valor}</p>
      <p className="mt-0.5 text-xs text-text-muted">{detalhe}</p>
    </>
  );
  const classe = "block rounded-2xl border border-border bg-surface p-4 sm:p-5";
  return href ? (
    <a href={href} className={cn(classe, "transition-colors hover:border-border-strong hover:bg-surface-2/40")}>
      {conteudo}
    </a>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}
