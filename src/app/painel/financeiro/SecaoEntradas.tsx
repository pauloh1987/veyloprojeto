import { formatInTimeZone } from "date-fns-tz";
import { ChevronDown, ReceiptText } from "lucide-react";
import type { DadosFinanceiro } from "@/lib/financeiro/dadosFinanceiro";
import { formaDoRecebimento, rotuloForma } from "@/lib/financeiro/fechamento";
import { formatarCentavos } from "@/lib/formatadores";
import { paraDataYMD } from "@/lib/tz";
import { Card, CardBody } from "@/components/ui/Card";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { BotaoDesfazerRecebimento } from "./FinanceiroClient";
import { CabecalhoSecao } from "./CabecalhoSecao";
import { diaEMes, rotuloDoDia } from "./formatos";

/** Quanto entrou em cada forma de pagamento no mês, da maior para a menor. */
export function SecaoFormas({ recebido, nomeMes }: { recebido: DadosFinanceiro["recebido"]; nomeMes: string }) {
  const total = recebido.totalCentavos;
  return (
    <section aria-labelledby="titulo-formas">
      <CabecalhoSecao
        id="titulo-formas"
        titulo="Como o dinheiro entrou"
        descricao={`Pix, dinheiro e cartão em ${nomeMes}, para conferir com o banco e a maquininha.`}
      />
      <Card>
        <CardBody>
          {recebido.porForma.length === 0 ? (
            <p className="text-sm text-text-muted">Nada entrou em {nomeMes} ainda.</p>
          ) : (
            <ul className="space-y-4">
              {recebido.porForma.map((f) => {
                const parte = f.valorCentavos / total;
                return (
                  <li key={f.forma}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0">
                        <span className="font-medium text-text">{rotuloForma(f.forma)}</span>
                        <span className="text-xs text-text-faint">
                          {" "}
                          · {f.quantidade} {f.quantidade === 1 ? "pagamento" : "pagamentos"}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums">
                        <span className="font-semibold text-text">{formatarCentavos(f.valorCentavos)}</span>
                        <span className="ml-1.5 inline-block w-9 text-right text-xs text-text-faint">{Math.round(parte * 100)}%</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-grafico-1" style={{ width: `${Math.max(parte * 100, 1)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {recebido.fiadoRecebidoCentavos > 0 && (
            <p className="mt-4 text-xs text-text-faint">
              Inclui {formatarCentavos(recebido.fiadoRecebidoCentavos)} de valores a receber pagos no mês, contados na forma em que foram pagos.
            </p>
          )}
        </CardBody>
      </Card>
    </section>
  );
}

/** O caixa de cada dia do mês (o dia mais recente primeiro), com o total por forma de pagamento e,
 * ao abrir, cada pagamento. É também a versão em tabela do gráfico de entradas. */
export function SecaoEntradasPorDia({
  recebido,
  nomeMes,
  fuso,
  hojeYMD,
  temEquipe,
}: {
  recebido: DadosFinanceiro["recebido"];
  nomeMes: string;
  fuso: string;
  hojeYMD: string;
  temEquipe: boolean;
}) {
  const diasComEntrada = recebido.dias.filter((dia) => dia.totalCentavos > 0).reverse();

  return (
    <section id="entradas" aria-labelledby="titulo-entradas" className="scroll-mt-6">
      <CabecalhoSecao
        id="titulo-entradas"
        titulo="Entradas dia a dia"
        descricao="O caixa de cada dia, para conferir. Toque no dia para ver cada pagamento."
      />
      {diasComEntrada.length === 0 ? (
        <EstadoVazio
          icone={<ReceiptText className="mx-auto" />}
          titulo={`Nenhuma entrada em ${nomeMes}`}
          descricao="Os pagamentos aparecem aqui, dia a dia, conforme você finaliza os atendimentos."
        />
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {diasComEntrada.map((dia) => (
            <details
              key={dia.dataYMD}
              id={`dia-${dia.dataYMD}`}
              open={dia.dataYMD === hojeYMD}
              className="group scroll-mt-6 target:bg-surface-2"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3 hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-text">{rotuloDoDia(dia.dataYMD, hojeYMD)}</span>
                  <span className="mt-0.5 block text-xs text-text-muted">
                    {dia.porForma.map((f) => `${rotuloForma(f.forma)} ${formatarCentavos(f.valorCentavos)}`).join(" · ")}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-bold text-text tabular-nums">{formatarCentavos(dia.totalCentavos)}</span>
                  <ChevronDown size={16} className="text-text-faint transition-transform group-open:rotate-180" aria-hidden />
                </span>
              </summary>
              <ul className="divide-y divide-border border-t border-border bg-bg/50">
                {dia.recebimentos.map((r) => {
                  const fiadoRecebido = r.forma === "FIADO";
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-text">{r.clienteNome}</p>
                        <p className="text-xs text-text-faint">
                          {formatInTimeZone(r.recebidoEm, fuso, "HH:mm")} · {r.servicoNome}
                          {temEquipe && ` · ${r.profissionalNome}`} · {rotuloForma(formaDoRecebimento(r))}
                          {fiadoRecebido && ` (atendimento de ${diaEMes(paraDataYMD(r.atendimentoEm, fuso))})`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm font-semibold text-text tabular-nums">{formatarCentavos(r.valorCentavos)}</span>
                        {fiadoRecebido && <BotaoDesfazerRecebimento pagamentoId={r.id} />}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </details>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-text-faint">
        Pagamento feito na hora entra no dia do atendimento; Pagar depois entra no dia em que foi recebido. Atendimentos finalizados
        antes do registro de pagamento existir não aparecem aqui.
      </p>
    </section>
  );
}
