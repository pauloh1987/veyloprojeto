import type { Metadata } from "next";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { exigirDono } from "@/lib/auth";
import { calcularRelatorio } from "@/lib/relatorio";
import { formatarCentavos } from "@/lib/formatadores";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { GraficoFaturamento } from "@/components/painel/GraficoFaturamento";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Relatório" };

const NOMES_MES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export default async function PaginaRelatorio() {
  const usuario = await exigirDono();
  const relatorio = await calcularRelatorio(usuario.estabelecimentoId, usuario.estabelecimento.fuso);
  const [, mesStr] = relatorio.mesReferencia.split("-");
  const nomeMes = NOMES_MES[Number(mesStr) - 1];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-text">Relatório</h1>
        <p className="text-sm text-text-muted capitalize">{nomeMes}</p>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card>
          <CardBody>
            <p className="text-xs text-text-faint">Faturamento do mês</p>
            <p className="font-heading text-xl font-bold text-text">{formatarCentavos(relatorio.faturamentoMesAtualCentavos)}</p>
            <VariacaoIndicador variacaoPercentual={relatorio.variacaoPercentual} />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs text-text-faint">Taxa de falta</p>
            <p className="font-heading text-xl font-bold text-text">
              {relatorio.taxaFalta === null ? "—" : `${relatorio.taxaFalta.toFixed(0)}%`}
            </p>
            <p className="text-xs text-text-faint">dos atendimentos concluídos</p>
          </CardBody>
        </Card>
      </div>

      <Card className="mb-4">
        <CardBody>
          <p className="mb-3 text-xs text-text-faint">Faturamento por dia</p>
          <GraficoFaturamento valoresCentavos={relatorio.faturamentoPorDiaCentavos} />
        </CardBody>
      </Card>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardBody>
            <p className="mb-1 text-xs text-text-faint">Serviço mais vendido</p>
            {relatorio.servicoMaisVendido ? (
              <p className="font-semibold text-text">
                {relatorio.servicoMaisVendido.nome}{" "}
                <span className="font-normal text-text-muted">({relatorio.servicoMaisVendido.qtd}x)</span>
              </p>
            ) : (
              <p className="text-sm text-text-muted">Sem dados suficientes ainda.</p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="mb-1 text-xs text-text-faint">Horários mais procurados</p>
            {relatorio.horariosMaisProcurados.length === 0 ? (
              <p className="text-sm text-text-muted">Sem dados suficientes ainda.</p>
            ) : (
              <p className="font-semibold text-text">
                {relatorio.horariosMaisProcurados.map((h) => `${String(h.hora).padStart(2, "0")}h`).join(", ")}
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      {relatorio.comissoesPorProfissional.length > 0 && (
        <Card className="mb-4">
          <CardBody>
            <p className="mb-3 text-xs text-text-faint">Comissões do mês (por atendimentos concluídos)</p>
            <ul className="space-y-3">
              {relatorio.comissoesPorProfissional.map((c) => (
                <li key={c.profissionalId} className="flex items-center gap-3">
                  <Avatar nome={c.nome} tamanho="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">{c.nome}</p>
                    <p className="text-xs text-text-faint">{formatarCentavos(c.faturamentoCentavos)} em serviços</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {c.comissao === null ? (
                      <p className="text-xs text-text-faint">Sem comissão definida</p>
                    ) : (
                      <>
                        <p className="font-heading text-sm font-bold text-text">{formatarCentavos(c.comissao.centavos)}</p>
                        <p className="text-xs text-text-faint">{c.comissao.percentual}%</p>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function VariacaoIndicador({ variacaoPercentual }: { variacaoPercentual: number | null }) {
  if (variacaoPercentual === null) {
    return <p className="text-xs text-text-faint">Sem comparação (mês anterior sem dados)</p>;
  }
  const positivo = variacaoPercentual > 0.5;
  const negativo = variacaoPercentual < -0.5;
  const Icone = positivo ? TrendingUp : negativo ? TrendingDown : Minus;
  const cor = positivo ? "text-success" : negativo ? "text-danger" : "text-text-faint";
  return (
    <p className={`flex items-center gap-1 text-xs ${cor}`}>
      <Icone size={13} />
      {variacaoPercentual > 0 ? "+" : ""}
      {variacaoPercentual.toFixed(0)}% vs. mês anterior
    </p>
  );
}
