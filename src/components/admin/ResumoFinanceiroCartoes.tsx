import type { DadosFinanceiros } from "@/lib/admin/dados";
import { formatarReais } from "@/lib/admin/financeiro";
import { cn } from "@/lib/cn";

/** Os 4 números do mês: receita, custo, resultado e quantos assinantes faltam para empatar. */
export function ResumoFinanceiroCartoes({ financeiro }: { financeiro: DadosFinanceiros }) {
  const { resumo, assinantes, emTeste, cotacao, precoMensal, custos } = financeiro;
  const custosAtivos = custos.filter((custo) => custo.ativo).length;
  const positivo = resumo.resultado >= 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
        <Kpi
          rotulo="Receita mensal"
          valor={formatarReais(resumo.receitaMensal)}
          detalhe={`${assinantes.length} assinante${assinantes.length === 1 ? "" : "s"} × ${formatarReais(precoMensal)}`}
        />
        <Kpi rotulo="Custo mensal" valor={formatarReais(resumo.custoMensal)} detalhe={`${custosAtivos} custos ativos`} />
        <Kpi
          rotulo="Resultado"
          valor={formatarReais(resumo.resultado)}
          detalhe={positivo ? "lucro no mês" : "prejuízo no mês"}
          tom={positivo ? "text-success" : "text-danger"}
        />
        <Kpi
          rotulo="Para empatar"
          valor={
            resumo.faltamParaEquilibrio === 0
              ? "Já cobre"
              : `Falta${resumo.faltamParaEquilibrio > 1 ? "m" : ""} ${resumo.faltamParaEquilibrio}`
          }
          detalhe={
            resumo.faltamParaEquilibrio === 0
              ? "a receita cobre os custos"
              : `precisa de ${resumo.assinantesParaEquilibrio} assinante${resumo.assinantesParaEquilibrio === 1 ? "" : "s"}`
          }
          tom={resumo.faltamParaEquilibrio === 0 ? "text-success" : undefined}
        />
      </div>
      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-border bg-surface px-4 py-3 text-xs text-text-muted sm:px-5">
        <span>
          {emTeste === 0 ? (
            "Nenhum salão em teste agora."
          ) : (
            <>
              {emTeste === 1 ? "Se o salão em teste assinar" : `Se os ${emTeste} salões em teste assinarem`}:{" "}
              <strong className="text-text">{formatarReais(resumo.receitaPotencial)}/mês</strong>
            </>
          )}
        </span>
        <span>
          Dólar a {formatarReais(cotacao.valor)} {cotacao.reserva ? "(valor de reserva, sem cotação do dia)" : "(cotação do dia)"}
        </span>
      </div>
    </div>
  );
}

function Kpi({ rotulo, valor, detalhe, tom }: { rotulo: string; valor: string; detalhe: string; tom?: string }) {
  return (
    <div className="bg-surface p-4 sm:p-5">
      <p className="text-xs font-medium text-text-faint">{rotulo}</p>
      <p className={cn("mt-1 whitespace-nowrap font-heading text-xl font-extrabold sm:text-2xl", tom ?? "text-text")}>{valor}</p>
      <p className="text-xs text-text-muted">{detalhe}</p>
    </div>
  );
}
