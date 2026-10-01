import type { Metadata } from "next";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { ArrowRight, CircleCheck, TriangleAlert } from "lucide-react";
import { exigirAdmin } from "@/lib/admin/auth";
import { carregarVisaoGeral, type SalaoAdmin } from "@/lib/admin/dados";
import { explicarErroEnvio } from "@/lib/mensagens/erros";
import { cn } from "@/lib/cn";
import { FUSO_PADRAO } from "@/lib/tz";
import { GraficoBarras } from "@/components/admin/GraficoBarras";
import { ResumoFinanceiroCartoes } from "@/components/admin/ResumoFinanceiroCartoes";

export const dynamic = "force-dynamic";

const ROTULO_TIPO_MENSAGEM: Record<string, string> = {
  CONFIRMACAO: "Confirmação",
  LEMBRETE: "Lembrete",
  CONVITE_RETORNO: "Convite de retorno",
};
export const metadata: Metadata = { title: "Visão geral" };

export default async function PaginaVisaoGeral() {
  await exigirAdmin();
  const agora = new Date();
  const { resumo, financeiro, cadastrosPorMes, agendamentosPorSemana, atencao, funil } = await carregarVisaoGeral(agora);
  const percentualLink =
    resumo.agendamentos30d === 0 ? 0 : Math.round((resumo.agendamentosPeloLink30d / resumo.agendamentos30d) * 100);

  const pendencias = [
    atencao.vencendo.length > 0 && {
      tom: "warning" as const,
      texto: `Teste vencendo em até 3 dias`,
      saloes: atencao.vencendo,
      dica: "Hora de oferecer a assinatura.",
    },
    atencao.vencidos.length > 0 && {
      tom: "danger" as const,
      texto: "Teste vencido sem assinatura",
      saloes: atencao.vencidos,
      dica: "Assinar, estender o teste ou marcar como parceira.",
    },
    atencao.semConfigurar.length > 0 && {
      tom: "warning" as const,
      texto: "Cadastrou e não configurou",
      saloes: atencao.semConfigurar,
      dica: "Ainda sem nenhum serviço: vale um contato do Biel.",
    },
    atencao.parados.length > 0 && {
      tom: "warning" as const,
      texto: "Parado há mais de 14 dias",
      saloes: atencao.parados,
      dica: "Configurado, mas sem agendamento novo.",
    },
    atencao.pareceTeste.length > 0 && {
      tom: "info" as const,
      texto: "Parece conta de teste",
      saloes: atencao.pareceTeste,
      dica: "Se for, marque como teste para sair dos números.",
    },
  ].filter((item) => item !== false);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-text">Visão geral</h1>
          <p className="text-sm text-text-muted first-letter:uppercase">
            {formatInTimeZone(agora, FUSO_PADRAO, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        {resumo.contasDeTeste > 0 && (
          <p className="text-xs text-text-faint">
            {resumo.contasDeTeste} conta{resumo.contasDeTeste > 1 ? "s" : ""} de teste fora dos números
          </p>
        )}
      </header>

      <section aria-labelledby="titulo-financeiro">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="titulo-financeiro" className="font-heading text-lg font-bold text-text">
            Financeiro do mês
          </h2>
          <Link href="/admin/financeiro" className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
            Detalhes <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
        <ResumoFinanceiroCartoes financeiro={financeiro} />
      </section>

      <section className="grid gap-3 md:grid-cols-3" aria-label="Resumo">
        <CartaoResumo titulo="Salões" valor={resumo.total} legenda={`+${resumo.novos30d} nos últimos 30 dias`} href="/admin/saloes">
          <LinhaResumo rotulo="Em teste" valor={resumo.emTeste} destaque={resumo.vencendoEm3Dias > 0 ? `${resumo.vencendoEm3Dias} vencendo` : undefined} />
          <LinhaResumo rotulo="Teste vencido" valor={resumo.testeVencido} alerta={resumo.testeVencido > 0} />
          <LinhaResumo rotulo="Assinantes" valor={resumo.assinantes} />
          <LinhaResumo rotulo="Parceiras" valor={resumo.parceiras} />
        </CartaoResumo>
        <CartaoResumo titulo="Uso nos últimos 30 dias" valor={resumo.agendamentos30d} legenda="agendamentos">
          <LinhaResumo rotulo="Feitos pelo link" valor={`${percentualLink}%`} />
          <LinhaResumo rotulo="Salões ativos na semana" valor={resumo.ativos7d} />
          <LinhaResumo rotulo="WhatsApp no mês" valor={resumo.mensagensMes} />
          <LinhaResumo rotulo="Mensagens com erro (7 dias)" valor={atencao.mensagensComErro7d} alerta={atencao.mensagensComErro7d > 0} />
        </CartaoResumo>
        <CartaoResumo titulo="Funil" valor={funil.emNegociacao} legenda="em negociação" href="/admin/funil">
          <LinhaResumo rotulo="Para hoje ou atrasados" valor={funil.paraHoje} alerta={funil.paraHoje > 0} />
          <LinhaResumo rotulo="Em teste" valor={funil.porEtapa.EM_TESTE} />
          <LinhaResumo rotulo="Fechados (30 dias)" valor={funil.fechados30d} />
          <LinhaResumo rotulo="Perdidos" valor={funil.porEtapa.PERDIDO} />
        </CartaoResumo>
      </section>

      <section className="grid gap-3 md:grid-cols-2" aria-label="Gráficos">
        <div className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-bold text-text">Novos salões por mês</h2>
          <GraficoBarras
            descricao="Novos salões cadastrados nos últimos 6 meses"
            colunas={cadastrosPorMes.map((mes) => ({ rotulo: mes.rotulo, partes: [{ valor: mes.total, classe: "bg-veylo-teal" }] }))}
          />
        </div>
        <div className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-bold text-text">Agendamentos por semana</h2>
          <GraficoBarras
            descricao="Agendamentos criados por semana nas últimas 8 semanas, pelo link e pelo painel"
            colunas={agendamentosPorSemana.map((semana) => ({
              rotulo: semana.rotulo,
              partes: [
                { valor: semana.link, classe: "bg-veylo-teal" },
                { valor: semana.manual, classe: "bg-veylo-blue" },
              ],
            }))}
            legenda={[
              { nome: "Pelo link", classe: "bg-veylo-teal" },
              { nome: "Pelo painel", classe: "bg-veylo-blue" },
            ]}
          />
        </div>
      </section>

      <section aria-labelledby="titulo-atencao" className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <h2 id="titulo-atencao" className="mb-3 flex items-center gap-2 font-heading text-lg font-bold text-text">
          Precisa de atenção
        </h2>
        {pendencias.length === 0 && funil.paraHoje === 0 && atencao.mensagensComErro7d === 0 ? (
          <p className="flex items-center gap-2 text-sm text-text-muted">
            <CircleCheck size={16} className="text-success" aria-hidden /> Nada pendente agora.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {funil.paraHoje > 0 && (
              <ItemAtencao tom="warning" texto={`${funil.paraHoje} contato${funil.paraHoje > 1 ? "s" : ""} do funil para hoje ou atrasado${funil.paraHoje > 1 ? "s" : ""}`}>
                <Link href="/admin/funil" className="font-semibold text-accent">
                  Abrir o funil
                </Link>
              </ItemAtencao>
            )}
            {atencao.mensagensComErro7d > 0 && (
              <ItemAtencao
                tom="danger"
                texto={`${atencao.mensagensComErro7d} mensage${atencao.mensagensComErro7d > 1 ? "ns" : "m"} de WhatsApp com erro nos últimos 7 dias`}
              >
                <span className="block text-text-muted">As mais recentes (detalhes também em Monitor › Logs, na Twilio):</span>
                <span className="mt-1.5 block space-y-1.5">
                  {atencao.errosRecentes.map((erro) => (
                    <span key={erro.id} className="block rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs">
                      <span className="font-semibold text-text">
                        {erro.salao}
                        {erro.contaDeTeste && " (teste)"}
                      </span>
                      <span className="text-text-faint">
                        {" "}
                        · {ROTULO_TIPO_MENSAGEM[erro.tipo] ?? erro.tipo} ·{" "}
                        {formatInTimeZone(erro.quando, FUSO_PADRAO, "dd/MM HH:mm")}
                      </span>
                      <span className="block text-text">
                        {erro.erro ? explicarErroEnvio(erro.erro) : "Motivo não registrado (falha anterior a 01/10, quando o sistema ainda não guardava o motivo)."}
                      </span>
                      {erro.erro && <span className="block break-all font-mono text-[11px] text-text-faint">{erro.erro}</span>}
                    </span>
                  ))}
                </span>
              </ItemAtencao>
            )}
            {pendencias.map((item) => (
              <ItemAtencao key={item.texto} tom={item.tom} texto={`${item.texto} (${item.saloes.length})`}>
                <span className="text-text-muted">{item.dica} </span>
                <ListaNomes saloes={item.saloes} />
              </ItemAtencao>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CartaoResumo({
  titulo,
  valor,
  legenda,
  href,
  children,
}: {
  titulo: string;
  valor: number;
  legenda: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-text">{titulo}</h2>
        {href && (
          <Link href={href} className="text-xs font-semibold text-accent" aria-label={`Abrir ${titulo}`}>
            Abrir
          </Link>
        )}
      </div>
      <p className="mt-2 font-heading text-3xl font-extrabold text-text">{valor}</p>
      <p className="text-xs text-text-muted">{legenda}</p>
      <dl className="mt-4 space-y-2 border-t border-border pt-3">{children}</dl>
    </div>
  );
}

function LinhaResumo({ rotulo, valor, alerta, destaque }: { rotulo: string; valor: number | string; alerta?: boolean; destaque?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <dt className="text-text-muted">
        {rotulo}
        {destaque && <span className="ml-1.5 text-xs font-semibold text-warning">{destaque}</span>}
      </dt>
      <dd className={cn("font-semibold", alerta ? "text-danger" : "text-text")}>{valor}</dd>
    </div>
  );
}

function ItemAtencao({ tom, texto, children }: { tom: "warning" | "danger" | "info"; texto: string; children: React.ReactNode }) {
  const cor = tom === "danger" ? "text-danger" : tom === "warning" ? "text-warning" : "text-info";
  return (
    <li className="flex gap-3 py-3 text-sm first:pt-0 last:pb-0">
      <TriangleAlert size={16} className={cn("mt-0.5 shrink-0", cor)} aria-hidden />
      <div className="min-w-0">
        <p className="font-semibold text-text">{texto}</p>
        <p className="mt-0.5">{children}</p>
      </div>
    </li>
  );
}

function ListaNomes({ saloes }: { saloes: SalaoAdmin[] }) {
  return (
    <>
      {saloes.map((salao, indice) => (
        <span key={salao.id}>
          {indice > 0 && ", "}
          <Link href={`/admin/saloes#salao-${salao.id}`} className="font-semibold text-accent">
            {salao.nome}
          </Link>
        </span>
      ))}
    </>
  );
}
