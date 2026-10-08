import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MessageCircle, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { exigirDono } from "@/lib/auth";
import { calcularRelatorio, primeiroMesDoNegocio } from "@/lib/relatorio";
import { DIAS_PARA_SUMIR } from "@/lib/relatorio/desempenho";
import {
  escolherMesRelatorio,
  lerParametroMes,
  mesDoInstante,
  nomeDoMes,
  parametroMes,
  somarMeses,
  type MesAno,
} from "@/lib/mesRelatorio";
import { formatarCentavos } from "@/lib/formatadores";
import { linkWhatsApp, urlBaseSite } from "@/lib/mensagens/textos";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Relatório" };

const CLASSE_BOTAO_MES =
  "inline-flex h-9 items-center gap-1 rounded-full border border-border px-3 text-sm font-medium " +
  "text-text-muted hover:bg-surface-2 hover:text-text";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** O mês atual fica sem `?mes=` na URL. */
function hrefMes(mes: MesAno, atual: MesAno): string {
  const ehAtual = mes.ano === atual.ano && mes.mes === atual.mes;
  return ehAtual ? "/painel/relatorio" : `/painel/relatorio?mes=${parametroMes(mes)}`;
}

function porcentagem(valor: number | null): string {
  return valor === null ? "—" : `${Math.round(valor)}%`;
}

/** Desempenho do salão no mês: atendimentos, clientes, profissionais, serviços e horários. O dinheiro
 * que entrou, o fiado e as comissões ficam na tela Financeiro. */
export default async function PaginaRelatorio({ searchParams }: PageProps<"/painel/relatorio">) {
  const usuario = await exigirDono();
  const { estabelecimento } = usuario;
  const fuso = estabelecimento.fuso;
  const { mes: mesPedido } = await searchParams;
  const atual = mesDoInstante(new Date(), fuso);
  const { mes, anterior, proximo } = escolherMesRelatorio(
    lerParametroMes(mesPedido),
    atual,
    await primeiroMesDoNegocio(estabelecimento, fuso),
  );
  const ehMesAtual = mes.ano === atual.ano && mes.mes === atual.mes;
  const relatorio = await calcularRelatorio(usuario.estabelecimentoId, fuso, mes);
  const d = relatorio.desempenho;
  const nomeMesAnterior = nomeDoMes(somarMeses(mes, -1)).toLowerCase();
  const maiorServico = Math.max(1, ...d.servicos.map((s) => s.qtd));
  const maiorHorario = Math.max(1, ...d.horarios.map((h) => h.qtd));
  const maiorDia = Math.max(1, ...d.diasDaSemana.map((dia) => dia.qtd));
  const linkAgendar = `${urlBaseSite()}/${estabelecimento.slug}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-4">
        <h1 className="font-heading text-2xl font-extrabold text-text">Relatório</h1>
        <p className="text-sm text-text-muted">
          Como o salão foi em {nomeDoMes(mes).toLowerCase()} de {mes.ano}
        </p>
      </header>

      {(anterior || proximo) && (
        <nav aria-label="Escolher o mês do relatório" className="mb-6 flex items-center justify-between gap-2">
          {anterior ? (
            <Link href={hrefMes(anterior, atual)} className={CLASSE_BOTAO_MES}>
              <ChevronLeft size={16} aria-hidden />
              {nomeDoMes(anterior)}
            </Link>
          ) : (
            <span />
          )}
          {proximo && (
            <Link href={hrefMes(proximo, atual)} className={CLASSE_BOTAO_MES}>
              {nomeDoMes(proximo)}
              <ChevronRight size={16} aria-hidden />
            </Link>
          )}
        </nav>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3">
        <Indicador rotulo="Atendimentos" valor={String(d.atendimentos)}>
          <Variacao
            percentual={relatorio.variacaoAtendimentos}
            texto={relatorio.comparaMesmoPeriodo ? `mesmo período de ${nomeMesAnterior}` : nomeMesAnterior}
          />
        </Indicador>
        <Indicador rotulo="Ticket médio" valor={d.ticketMedioCentavos === null ? "—" : formatarCentavos(d.ticketMedioCentavos)}>
          <p className="text-xs text-text-faint">{formatarCentavos(d.valorCentavos)} em atendimentos</p>
        </Indicador>
        <Indicador rotulo="Faltas" valor={porcentagem(d.taxaFalta)}>
          <p className="text-xs text-text-faint">
            {d.faltas === 1 ? "1 falta" : `${d.faltas} faltas`} nos atendimentos concluídos
          </p>
        </Indicador>
        <Indicador rotulo="Marcados pelo link" valor={porcentagem(d.pelaLinkPercentual)}>
          <p className="text-xs text-text-faint">o resto foi marcado no painel</p>
        </Indicador>
      </div>

      <Secao titulo="Clientes">
        <Card>
          <CardBody>
            <p className="font-heading text-xl font-bold text-text">
              {d.clientesAtendidas} {d.clientesAtendidas === 1 ? "cliente no mês" : "clientes no mês"}
            </p>
            {d.clientesAtendidas > 0 && (
              <>
                <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full bg-accent" style={{ width: `${(d.clientesNovas / d.clientesAtendidas) * 100}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-xs text-text-muted">
                  <span>
                    <strong className="text-text">{d.clientesNovas}</strong> {d.clientesNovas === 1 ? "veio" : "vieram"} pela primeira vez
                  </span>
                  <span>
                    <strong className="text-text">{d.clientesAtendidas - d.clientesNovas}</strong> já tinham vindo
                  </span>
                </div>
              </>
            )}
            {d.melhoresClientes.length > 0 && (
              <>
                <p className="mt-5 mb-2 text-xs font-semibold tracking-wide text-text-faint uppercase">Melhores do mês</p>
                <ul className="space-y-2.5">
                  {d.melhoresClientes.map((c) => (
                    <li key={c.clienteId}>
                      <Link href={`/painel/clientes/${c.clienteId}`} className="flex items-center gap-3 hover:opacity-80">
                        <Avatar nome={c.nome} tamanho="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-text">{c.nome}</span>
                          <span className="text-xs text-text-faint">
                            {c.atendimentos === 1 ? "1 atendimento" : `${c.atendimentos} atendimentos`}
                          </span>
                        </span>
                        <span className="text-sm font-semibold text-text tabular-nums">{formatarCentavos(c.valorCentavos)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardBody>
        </Card>

        {ehMesAtual && relatorio.sumidas.length > 0 && (
          <Card className="mt-3">
            <CardBody>
              <p className="font-semibold text-text">Para chamar de volta</p>
              <p className="mb-3 text-xs text-text-faint">
                Há mais de {DIAS_PARA_SUMIR} dias sem vir e sem horário marcado.
              </p>
              <ul className="divide-y divide-border">
                {relatorio.sumidas.map((c) => {
                  const primeiroNome = c.nome.trim().split(/\s+/)[0] ?? "";
                  const mensagem = `Oi, ${primeiroNome}! Tudo bem? Faz um tempinho que a gente não se vê. Quer marcar um horário? É só escolher pelo link: ${linkAgendar}`;
                  return (
                    <li key={c.clienteId} className="flex items-center justify-between gap-3 py-2.5">
                      <Link href={`/painel/clientes/${c.clienteId}`} className="min-w-0 hover:opacity-80">
                        <span className="block truncate text-sm font-medium text-text">{c.nome}</span>
                        <span className="text-xs text-text-faint">há {c.dias} dias sem vir</span>
                      </Link>
                      <a
                        href={linkWhatsApp(c.telefone, mensagem)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-border-strong px-3 text-sm font-semibold text-text hover:bg-surface-2"
                      >
                        <MessageCircle size={15} /> Chamar
                      </a>
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>
        )}
      </Secao>

      {d.profissionais.length > 1 && (
        <Secao titulo="Por profissional">
          <Card>
            <CardBody>
              <ul className="divide-y divide-border">
                {d.profissionais.map((p) => (
                  <li key={p.profissionalId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <Avatar nome={p.nome} tamanho="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">{p.nome}</p>
                      <p className="text-xs text-text-faint">
                        {p.atendimentos === 1 ? "1 atendimento" : `${p.atendimentos} atendimentos`}
                        {p.ticketMedioCentavos !== null && ` · ticket ${formatarCentavos(p.ticketMedioCentavos)}`}
                        {` · ${p.faltas === 1 ? "1 falta" : `${p.faltas} faltas`}`}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-text tabular-nums">{formatarCentavos(p.valorCentavos)}</p>
                  </li>
                ))}
              </ul>
              <Link href="/painel/financeiro#comissoes" className="mt-4 inline-block text-xs font-semibold text-text-muted hover:text-text hover:underline">
                Comissões e acertos ficam em Financeiro
              </Link>
            </CardBody>
          </Card>
        </Secao>
      )}

      <Secao titulo="Serviços mais feitos">
        <Card>
          <CardBody>
            {d.servicos.length === 0 ? (
              <p className="text-sm text-text-muted">Nenhum atendimento finalizado neste mês ainda.</p>
            ) : (
              <ul className="space-y-3">
                {d.servicos.map((s) => (
                  <li key={s.nome}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate text-text">
                        {s.nome} <span className="text-text-faint">({s.qtd}x)</span>
                      </span>
                      <span className="shrink-0 font-semibold text-text tabular-nums">{formatarCentavos(s.valorCentavos)}</span>
                    </div>
                    <Barra proporcao={s.qtd / maiorServico} />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </Secao>

      <Secao titulo="Movimento">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardBody>
              <p className="mb-3 text-xs text-text-faint">Horários mais procurados</p>
              {d.horarios.length === 0 ? (
                <p className="text-sm text-text-muted">Sem agendamentos neste mês.</p>
              ) : (
                <ul className="space-y-2">
                  {d.horarios.map((h) => (
                    <li key={h.hora} className="flex items-center gap-3 text-sm">
                      <span className="w-10 shrink-0 font-semibold text-text tabular-nums">{String(h.hora).padStart(2, "0")}h</span>
                      <span className="flex-1">
                        <Barra proporcao={h.qtd / maiorHorario} />
                      </span>
                      <span className="w-6 shrink-0 text-right text-xs text-text-muted tabular-nums">{h.qtd}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="mb-3 text-xs text-text-faint">Dias da semana</p>
              <div className="flex h-28 items-end gap-1.5">
                {d.diasDaSemana.map((dia) => (
                  <div key={dia.dia} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[11px] text-text-muted tabular-nums">{dia.qtd || ""}</span>
                    <div className="w-full rounded-t-md bg-accent" style={{ height: `${Math.max(4, (dia.qtd / maiorDia) * 72)}px`, opacity: dia.qtd ? 1 : 0.2 }} />
                    <span className="text-[11px] text-text-faint">{DIAS[dia.dia]}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </Secao>

      <p className="text-xs text-text-faint">
        Valores pelo que foi cobrado em cada atendimento finalizado. O dinheiro que entrou, o que falta receber e as comissões
        ficam em{" "}
        <Link href="/painel/financeiro" className="font-semibold hover:underline">
          Financeiro
        </Link>
        .
      </p>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 font-heading text-lg font-bold text-text">{titulo}</h2>
      {children}
    </section>
  );
}

function Indicador({ rotulo, valor, children }: { rotulo: string; valor: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs text-text-faint">{rotulo}</p>
        <p className="font-heading text-2xl font-bold text-text">{valor}</p>
        {children}
      </CardBody>
    </Card>
  );
}

function Barra({ proporcao }: { proporcao: number }) {
  return (
    <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(3, proporcao * 100)}%` }} />
    </div>
  );
}

/** Mês fechado: "vs. agosto". Mês em andamento: "vs. mesmo período de setembro". */
function Variacao({ percentual, texto }: { percentual: number | null; texto: string }) {
  if (percentual === null) return <p className="text-xs text-text-faint">Sem comparação com {texto}</p>;
  const positivo = percentual > 0.5;
  const negativo = percentual < -0.5;
  const Icone = positivo ? TrendingUp : negativo ? TrendingDown : Minus;
  const cor = positivo ? "text-success" : negativo ? "text-danger" : "text-text-faint";
  return (
    <p className={`flex items-start gap-1 text-xs ${cor}`}>
      <Icone size={13} className="mt-0.5 shrink-0" aria-hidden />
      {percentual > 0 ? "+" : ""}
      {percentual.toFixed(0)}% vs. {texto}
    </p>
  );
}
