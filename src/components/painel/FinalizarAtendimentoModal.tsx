"use client";

import { useState, useTransition } from "react";
import type { FormaPagamento } from "@prisma/client";
import { X } from "lucide-react";
import { finalizarAtendimento } from "@/lib/acoes/financeiro";
import { FORMAS_PAGAMENTO, problemaNoPagamento, type LinhaPagamento } from "@/lib/financeiro/fechamento";
import type { FechamentoAgendamento, ServicoDoCatalogo } from "@/lib/financeiro/dadosFechamento";
import { centavosParaCampo, formatarCentavos, reaisParaCentavos } from "@/lib/formatadores";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Campo";
import { cn } from "@/lib/cn";

interface LinhaAdicional {
  chave: number;
  descricao: string;
  valor: string;
}

interface LinhaForma {
  chave: number;
  forma: FormaPagamento | null;
  valor: string;
}

const MAXIMO_FORMAS = 3;

// Chave de cada linha da lista (adicionais e formas), só para o React saber qual é qual.
let ultimaChave = 0;
const novaChave = () => ++ultimaChave;

/** Formas já gravadas, com o fiado dividido em partes (recebimento parcial) somado de volta. */
function formasIniciais(fechamento: FechamentoAgendamento): Omit<LinhaForma, "chave">[] {
  const porForma = new Map<FormaPagamento, number>();
  for (const p of fechamento.pagamentos) porForma.set(p.forma, (porForma.get(p.forma) ?? 0) + p.valorCentavos);
  if (porForma.size === 0) return [{ forma: null, valor: "" }];
  return [...porForma].map(([forma, valor]) => ({ forma, valor: centavosParaCampo(valor) }));
}

/** Janela "Finalizar atendimento": valor do serviço (com desconto, se houver), adicionais e como foi
 * pago. Abre também para corrigir um pagamento já registrado. */
export function FinalizarAtendimentoModal({
  fechamento,
  servicos,
  aoFechar,
}: {
  fechamento: FechamentoAgendamento;
  servicos: ServicoDoCatalogo[];
  aoFechar: () => void;
}) {
  const [valorServico, setValorServico] = useState(centavosParaCampo(fechamento.valorServicoCentavos ?? fechamento.precoCentavos));
  const [adicionais, setAdicionais] = useState<LinhaAdicional[]>(() =>
    fechamento.adicionais.map((a) => ({ chave: novaChave(), descricao: a.descricao, valor: centavosParaCampo(a.valorCentavos) })),
  );
  const [formas, setFormas] = useState<LinhaForma[]>(() => formasIniciais(fechamento).map((f) => ({ ...f, chave: novaChave() })));
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const editando = fechamento.valorTotalCentavos !== null;

  const servicoCentavos = reaisParaCentavos(valorServico);
  const adicionaisCentavos = adicionais.map((a) => reaisParaCentavos(a.valor));
  const valoresOk = servicoCentavos !== null && adicionaisCentavos.every((v) => v !== null);
  const total = valoresOk ? adicionaisCentavos.reduce<number>((soma, v) => soma + (v ?? 0), servicoCentavos) : null;

  // Com uma forma só, ela leva o total. Com mais de uma, a última fica com o que falta.
  const somaDasDigitadas = formas.slice(0, -1).reduce((soma, f) => soma + (reaisParaCentavos(f.valor) ?? 0), 0);
  const pagamentos = formas.map((linha, i) => ({
    forma: linha.forma,
    valorCentavos:
      formas.length === 1 ? (total ?? 0) : i === formas.length - 1 ? (total ?? 0) - somaDasDigitadas : (reaisParaCentavos(linha.valor) ?? 0),
  }));
  const fiadoCentavos = pagamentos.filter((p) => p.forma === "FIADO").reduce((soma, p) => soma + p.valorCentavos, 0);

  function problemaAntesDeEnviar(): string | null {
    if (!valoresOk || total === null) return "Confira os valores digitados (use, por exemplo, 130,00).";
    if (adicionais.some((a) => !a.descricao.trim())) return "Dê um nome a cada adicional.";
    if (total === 0) return null;
    if (pagamentos.some((p) => p.forma === null)) return "Escolha a forma de pagamento.";
    return problemaNoPagamento(total, pagamentos as LinhaPagamento[]);
  }

  function adicionarDoCatalogo(valor: string) {
    if (!valor) return;
    if (valor === "outro") {
      setAdicionais((atual) => [...atual, { chave: novaChave(), descricao: "", valor: "" }]);
      return;
    }
    const servico = servicos.find((s) => s.id === valor);
    if (servico) {
      setAdicionais((atual) => [...atual, { chave: novaChave(), descricao: servico.nome, valor: centavosParaCampo(servico.precoCentavos) }]);
    }
  }

  function mudarAdicional(chaveLinha: number, campo: "descricao" | "valor", valor: string) {
    setAdicionais((atual) => atual.map((a) => (a.chave === chaveLinha ? { ...a, [campo]: valor } : a)));
  }

  function mudarForma(chaveLinha: number, campo: "forma" | "valor", valor: string) {
    setFormas((atual) => atual.map((f) => (f.chave === chaveLinha ? { ...f, [campo]: valor } : f)));
  }

  function dividir() {
    setFormas((atual) => [...atual, { chave: novaChave(), forma: null, valor: "" }]);
  }

  function finalizar() {
    const problema = problemaAntesDeEnviar();
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    iniciar(async () => {
      const resultado = await finalizarAtendimento({
        agendamentoId: fechamento.id,
        valorServicoCentavos: servicoCentavos ?? 0,
        adicionais: adicionais.map((a) => ({ descricao: a.descricao.trim(), valorCentavos: reaisParaCentavos(a.valor) ?? 0 })),
        pagamentos: total === 0 ? [] : (pagamentos as LinhaPagamento[]),
      });
      if (resultado.erro) setErro(resultado.erro);
      else aoFechar();
    });
  }

  return (
    <Modal aberto aoFechar={aoFechar} titulo={editando ? "Pagamento do atendimento" : "Finalizar atendimento"}>
      <div className="space-y-5">
        <p className="text-sm text-text-muted">
          <span className="font-semibold text-text">{fechamento.clienteNome}</span> · {fechamento.servicoNome}
        </p>

        <section className="space-y-2.5">
          <div className="flex items-center gap-3">
            <label htmlFor="valorServico" className="flex-1 text-sm font-medium text-text">
              {fechamento.servicoNome}
              {servicoCentavos !== null && servicoCentavos !== fechamento.precoCentavos && (
                <span className="block text-xs font-normal text-text-faint">Tabela: {formatarCentavos(fechamento.precoCentavos)}</span>
              )}
            </label>
            <CampoValor id="valorServico" valor={valorServico} aoMudar={setValorServico} />
          </div>

          {adicionais.map((a) => (
            <div key={a.chave} className="flex items-center gap-2">
              <Input
                value={a.descricao}
                onChange={(e) => mudarAdicional(a.chave, "descricao", e.target.value)}
                placeholder="Adicional (ex.: decoração)"
                aria-label="Nome do adicional"
                className="min-w-0 flex-1"
              />
              <CampoValor valor={a.valor} aoMudar={(v) => mudarAdicional(a.chave, "valor", v)} rotulo="Valor do adicional" />
              <button
                type="button"
                onClick={() => setAdicionais((atual) => atual.filter((x) => x.chave !== a.chave))}
                aria-label="Tirar adicional"
                className="rounded-full p-1.5 text-text-faint hover:bg-surface-2 hover:text-text"
              >
                <X size={16} />
              </button>
            </div>
          ))}

          <Select value="" onChange={(e) => adicionarDoCatalogo(e.target.value)} aria-label="Adicionar adicional">
            <option value="">+ Adicionar serviço ou adicional</option>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} · {formatarCentavos(s.precoCentavos)}
              </option>
            ))}
            <option value="outro">Outro (digitar nome e valor)</option>
          </Select>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="font-heading text-base font-bold text-text">Total</span>
            <span className="font-heading text-lg font-extrabold text-text">{total === null ? "—" : formatarCentavos(total)}</span>
          </div>
        </section>

        {total !== 0 && (
          <section className="space-y-3">
            <p className="text-sm font-medium text-text">Forma de pagamento</p>
            {formas.map((linha, i) => {
              const usadasEmOutras = formas.filter((f) => f.chave !== linha.chave).map((f) => f.forma);
              const ultima = i === formas.length - 1;
              return (
                <div key={linha.chave} className={cn(formas.length > 1 && "rounded-xl border border-border p-3")}>
                  <div className="flex flex-wrap gap-1.5">
                    {FORMAS_PAGAMENTO.map((f) => {
                      const escolhida = linha.forma === f.forma;
                      const usada = usadasEmOutras.includes(f.forma);
                      return (
                        <button
                          key={f.forma}
                          type="button"
                          disabled={usada}
                          onClick={() => mudarForma(linha.chave, "forma", f.forma)}
                          className={cn(
                            "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors disabled:opacity-35",
                            escolhida ? "border-accent bg-accent text-accent-foreground" : "border-border-strong text-text hover:bg-surface-2",
                          )}
                        >
                          {f.rotulo}
                        </button>
                      );
                    })}
                  </div>
                  {formas.length > 1 && (
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      {ultima ? (
                        <span className={cn("text-sm", pagamentos[i].valorCentavos < 0 ? "text-danger" : "text-text-muted")}>
                          Restante: <strong className="text-text">{formatarCentavos(pagamentos[i].valorCentavos)}</strong>
                        </span>
                      ) : (
                        <CampoValor valor={linha.valor} aoMudar={(v) => mudarForma(linha.chave, "valor", v)} rotulo="Valor nessa forma" />
                      )}
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={() => setFormas((atual) => atual.filter((f) => f.chave !== linha.chave))}
                          className="text-xs font-semibold text-text-muted hover:text-text"
                        >
                          Tirar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {formas.length < MAXIMO_FORMAS && (
              <button type="button" onClick={dividir} className="text-sm font-semibold text-[color:var(--destaque-texto)] hover:underline">
                + Dividir em outra forma
              </button>
            )}
            {fiadoCentavos > 0 && (
              <p className="rounded-xl bg-warning-bg px-3 py-2.5 text-sm text-text">
                {formatarCentavos(fiadoCentavos)} fica em <strong>Financeiro → A receber</strong> até você marcar como pago.
              </p>
            )}
          </section>
        )}

        {erro && <p className="text-sm text-danger">{erro}</p>}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="ghost" onClick={aoFechar} disabled={pendente}>
            Cancelar
          </Button>
          <Button onClick={finalizar} disabled={pendente}>
            {pendente ? "Salvando..." : editando ? "Salvar pagamento" : "Finalizar atendimento"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function CampoValor({
  id,
  valor,
  aoMudar,
  rotulo,
}: {
  id?: string;
  valor: string;
  aoMudar: (valor: string) => void;
  rotulo?: string;
}) {
  return (
    <div className="relative w-32 shrink-0">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-text-faint">R$</span>
      <Input
        id={id}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        inputMode="decimal"
        aria-label={rotulo}
        className="pl-9 text-right tabular-nums"
        placeholder="0,00"
      />
    </div>
  );
}
