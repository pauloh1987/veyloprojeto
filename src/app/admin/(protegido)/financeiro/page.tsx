import type { Metadata } from "next";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { exigirAdmin } from "@/lib/admin/auth";
import { carregarFinanceiro, carregarSaloes } from "@/lib/admin/dados";
import { formatarReais } from "@/lib/admin/financeiro";
import { FUSO_PADRAO } from "@/lib/tz";
import { CustosClient } from "@/components/admin/CustosClient";
import { ResumoFinanceiroCartoes } from "@/components/admin/ResumoFinanceiroCartoes";
import { dataCurta } from "@/components/admin/formatos";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Financeiro" };

export default async function PaginaFinanceiro() {
  await exigirAdmin();
  const agora = new Date();
  const saloes = await carregarSaloes(agora);
  const financeiro = await carregarFinanceiro(
    saloes.filter((salao) => !salao.contaDeTeste),
    agora,
  );
  const { assinantes, parceiras, emTeste, precoMensal, cotacao, resumo } = financeiro;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-heading text-2xl font-extrabold text-text">Financeiro</h1>
        <p className="text-sm text-text-muted">Quanto a Veylo recebe e quanto custa para funcionar, por mês.</p>
      </header>

      <ResumoFinanceiroCartoes financeiro={financeiro} />

      <div className="grid items-start gap-4 lg:grid-cols-5">
        <section aria-labelledby="titulo-receita" className="rounded-2xl border border-border bg-surface lg:col-span-2">
          <div className="border-b border-border p-4 sm:px-5">
            <h2 id="titulo-receita" className="font-heading text-lg font-bold text-text">
              Receita
            </h2>
            <p className="text-xs text-text-muted">
              Assinantes × {formatarReais(precoMensal)}. Marque quem já paga em{" "}
              <Link href="/admin/saloes" className="font-semibold text-accent">
                Salões
              </Link>
              .
            </p>
          </div>
          <div className="space-y-5 p-4 sm:px-5">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-text">Assinantes ({assinantes.length})</h3>
              {assinantes.length === 0 ? (
                <p className="text-sm text-text-muted">Nenhum salão pagando ainda.</p>
              ) : (
                <ul className="space-y-1.5">
                  {assinantes.map((assinante) => (
                    <li key={assinante.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-text">
                        {assinante.nome} <span className="text-xs text-text-faint">desde {dataCurta(assinante.desde)}</span>
                      </span>
                      <span className="shrink-0 font-semibold text-text">{formatarReais(precoMensal)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-text">Parceiras ({parceiras.length})</h3>
              <p className="text-sm text-text-muted">
                {parceiras.length === 0 ? "Nenhuma." : `${parceiras.map((p) => p.nome).join(", ")}. Usam sem cobrança.`}
              </p>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-text">Em teste ({emTeste})</h3>
              <p className="text-sm text-text-muted">
                {emTeste === 0 ? (
                  "Nenhum salão em teste agora."
                ) : (
                  <>
                    Se {emTeste === 1 ? "ele assinar" : "todos assinarem"}, a receita vai para{" "}
                    <strong className="text-text">{formatarReais(resumo.receitaPotencial)}</strong> por mês.
                  </>
                )}
              </p>
            </div>
          </div>
        </section>

        <div className="lg:col-span-3">
          <CustosClient
            custos={financeiro.custos}
            custoMensal={resumo.custoMensal}
            mensagensWhatsApp30d={financeiro.mensagensWhatsApp30d}
          />
        </div>
      </div>

      <div className="space-y-1 text-xs text-text-faint">
        <p>
          Dólar a {formatarReais(cotacao.valor)}
          {cotacao.reserva
            ? ", valor de reserva: não deu para buscar a cotação do dia."
            : cotacao.atualizadaEm
              ? `, cotação de ${formatInTimeZone(cotacao.atualizadaEm, FUSO_PADRAO, "dd/MM 'às' HH:mm")} (AwesomeAPI).`
              : " (AwesomeAPI)."}
        </p>
        <p>
          Custos por mensagem usam as {financeiro.mensagensWhatsApp30d} mensagens de WhatsApp enviadas nos últimos 30 dias, de todas as
          contas (as de teste também são cobradas).
        </p>
      </div>
    </div>
  );
}
