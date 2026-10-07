"use client";

import { useState, useTransition } from "react";
import type { FormaPagamento } from "@prisma/client";
import { Check, HandCoins } from "lucide-react";
import {
  desfazerPagamentoComissao,
  desfazerRecebimento,
  receberFiados,
  registrarPagamentoComissao,
  registrarRecebimento,
} from "@/lib/acoes/financeiro";
import type { EstadoAcao } from "@/lib/acoes/agendamentos";
import { FORMAS_DE_RECEBIMENTO } from "@/lib/financeiro/fechamento";
import { centavosParaCampo, formatarCentavos, reaisParaCentavos } from "@/lib/formatadores";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Campo";
import { cn } from "@/lib/cn";

type FormaRecebimento = Exclude<FormaPagamento, "FIADO">;

function EscolherForma({ forma, aoEscolher }: { forma: FormaRecebimento | null; aoEscolher: (forma: FormaRecebimento) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-text">Como foi pago?</p>
      <div className="flex flex-wrap gap-1.5">
        {FORMAS_DE_RECEBIMENTO.map((f) => (
          <button
            key={f.forma}
            type="button"
            aria-pressed={forma === f.forma}
            onClick={() => aoEscolher(f.forma as FormaRecebimento)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
              forma === f.forma ? "border-accent bg-accent text-accent-foreground" : "border-border-strong text-text hover:bg-surface-2",
            )}
          >
            {f.rotulo}
          </button>
        ))}
      </div>
    </div>
  );
}

function CampoReais({ id, valor, aoMudar }: { id: string; valor: string; aoMudar: (valor: string) => void }) {
  return (
    <div className="relative w-40">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-text-faint">R$</span>
      <Input
        id={id}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        inputMode="decimal"
        placeholder="0,00"
        className="pl-9 text-right tabular-nums"
      />
    </div>
  );
}

function BotoesDaJanela({ pendente, aoCancelar, aoConfirmar, rotulo }: { pendente: boolean; aoCancelar: () => void; aoConfirmar: () => void; rotulo: string }) {
  return (
    <div className="flex justify-end gap-2 border-t border-border pt-4">
      <Button variant="ghost" onClick={aoCancelar} disabled={pendente}>
        Cancelar
      </Button>
      <Button onClick={aoConfirmar} disabled={pendente}>
        {pendente ? "Salvando..." : rotulo}
      </Button>
    </div>
  );
}

/** "Recebi": marca um fiado como pago (tudo ou uma parte), na forma em que o dinheiro entrou. */
export function BotaoReceberFiado({
  pagamentoId,
  valorCentavos,
  clienteNome,
  discreto = false,
}: {
  pagamentoId: string;
  valorCentavos: number;
  clienteNome: string;
  /** Botão de contorno, para listas com vários "Recebi". */
  discreto?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [forma, setForma] = useState<FormaRecebimento | null>(null);
  const [valor, setValor] = useState(centavosParaCampo(valorCentavos));
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const valorDigitado = reaisParaCentavos(valor);
  const parcial = valorDigitado !== null && valorDigitado < valorCentavos;

  function abrir() {
    setForma(null);
    setValor(centavosParaCampo(valorCentavos));
    setErro(null);
    setAberto(true);
  }

  function confirmar() {
    if (!forma) return setErro("Escolha como foi pago.");
    if (valorDigitado === null || valorDigitado <= 0) return setErro("Confira o valor recebido.");
    if (valorDigitado > valorCentavos) return setErro(`O valor a receber é ${formatarCentavos(valorCentavos)}.`);
    setErro(null);
    iniciar(async () => {
      const resultado = await registrarRecebimento({ pagamentoId, forma, valorCentavos: valorDigitado });
      if (resultado.erro) setErro(resultado.erro);
      else setAberto(false);
    });
  }

  return (
    <>
      <Button size="sm" variant={discreto ? "outline" : "primary"} onClick={abrir}>
        <Check size={15} /> Recebi
      </Button>
      {aberto && (
        <Modal aberto aoFechar={() => setAberto(false)} titulo="Receber pagamento">
          <div className="space-y-5">
            <p className="text-sm text-text-muted">
              <span className="font-semibold text-text">{clienteNome}</span> devia {formatarCentavos(valorCentavos)}.
            </p>
            <EscolherForma forma={forma} aoEscolher={setForma} />
            <div>
              <label htmlFor="valorRecebido" className="mb-1.5 block text-sm font-medium text-text">
                Valor recebido
              </label>
              <CampoReais id="valorRecebido" valor={valor} aoMudar={setValor} />
              {parcial && valorDigitado !== null && (
                <p className="mt-1.5 text-xs text-text-muted">
                  Pagou uma parte: continuam {formatarCentavos(valorCentavos - valorDigitado)} a receber.
                </p>
              )}
            </div>
            {erro && <p className="text-sm text-danger">{erro}</p>}
            <BotoesDaJanela pendente={pendente} aoCancelar={() => setAberto(false)} aoConfirmar={confirmar} rotulo="Confirmar recebimento" />
          </div>
        </Modal>
      )}
    </>
  );
}

/** "Recebi tudo": a cliente pagou de uma vez todos os fiados dela, numa forma só. */
export function BotaoReceberTudo({
  pagamentoIds,
  totalCentavos,
  clienteNome,
}: {
  pagamentoIds: string[];
  totalCentavos: number;
  clienteNome: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [forma, setForma] = useState<FormaRecebimento | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function abrir() {
    setForma(null);
    setErro(null);
    setAberto(true);
  }

  function confirmar() {
    if (!forma) return setErro("Escolha como foi pago.");
    setErro(null);
    iniciar(async () => {
      const resultado = await receberFiados({ pagamentoIds, forma });
      if (resultado.erro) setErro(resultado.erro);
      else setAberto(false);
    });
  }

  return (
    <>
      <Button size="sm" onClick={abrir}>
        <Check size={15} /> Recebi tudo
      </Button>
      {aberto && (
        <Modal aberto aoFechar={() => setAberto(false)} titulo="Receber tudo">
          <div className="space-y-5">
            <p className="text-sm text-text-muted">
              <span className="font-semibold text-text">{clienteNome}</span> devia {formatarCentavos(totalCentavos)} de{" "}
              {pagamentoIds.length} atendimentos. O valor entra hoje no caixa.
            </p>
            <EscolherForma forma={forma} aoEscolher={setForma} />
            <p className="text-xs text-text-faint">Pagou só uma parte? Use o &quot;Recebi&quot; do atendimento.</p>
            {erro && <p className="text-sm text-danger">{erro}</p>}
            <BotoesDaJanela pendente={pendente} aoCancelar={() => setAberto(false)} aoConfirmar={confirmar} rotulo="Confirmar recebimento" />
          </div>
        </Modal>
      )}
    </>
  );
}

/** Acerto de comissão: registra quanto a dona pagou a uma profissional (tudo ou uma parte, como um vale). */
export function BotaoPagarComissao({
  profissionalId,
  profissionalNome,
  mesReferencia,
  rotuloMes,
  comissaoCentavos,
  pagoCentavos,
  faltaCentavos,
  hojeYMD,
}: {
  profissionalId: string;
  profissionalNome: string;
  /** "2026-10" */
  mesReferencia: string;
  /** "outubro de 2026" */
  rotuloMes: string;
  comissaoCentavos: number;
  pagoCentavos: number;
  faltaCentavos: number;
  hojeYMD: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeYMD);
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const valorDigitado = reaisParaCentavos(valor);
  const aMais = valorDigitado !== null ? valorDigitado - faltaCentavos : 0;

  function abrir() {
    setValor(faltaCentavos > 0 ? centavosParaCampo(faltaCentavos) : "");
    setData(hojeYMD);
    setObservacao("");
    setErro(null);
    setAberto(true);
  }

  function confirmar() {
    if (valorDigitado === null || valorDigitado <= 0) return setErro("Confira o valor pago (use, por exemplo, 150,00).");
    if (!data) return setErro("Escolha o dia do pagamento.");
    setErro(null);
    iniciar(async () => {
      const resultado = await registrarPagamentoComissao({
        profissionalId,
        mesReferencia,
        valorCentavos: valorDigitado,
        data,
        observacao,
      });
      if (resultado.erro) setErro(resultado.erro);
      else setAberto(false);
    });
  }

  return (
    <>
      <Button size="sm" variant={faltaCentavos > 0 ? "primary" : "outline"} onClick={abrir}>
        <HandCoins size={15} /> Registrar pagamento
      </Button>
      {aberto && (
        <Modal aberto aoFechar={() => setAberto(false)} titulo="Pagar comissão">
          <div className="space-y-5">
            <p className="text-sm text-text-muted">
              <span className="font-semibold text-text">{profissionalNome}</span> · comissão de {rotuloMes}
            </p>
            <dl className="grid grid-cols-3 gap-2 rounded-xl bg-surface-2 p-3 text-center">
              <div>
                <dt className="text-xs text-text-faint">Comissão</dt>
                <dd className="text-sm font-semibold text-text">{formatarCentavos(comissaoCentavos)}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-faint">Já pago</dt>
                <dd className="text-sm font-semibold text-text">{formatarCentavos(pagoCentavos)}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-faint">Falta</dt>
                <dd className="text-sm font-semibold text-text">{formatarCentavos(faltaCentavos)}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-4">
              <div>
                <label htmlFor="valorComissao" className="mb-1.5 block text-sm font-medium text-text">
                  Valor pago
                </label>
                <CampoReais id="valorComissao" valor={valor} aoMudar={setValor} />
              </div>
              <div>
                <label htmlFor="dataComissao" className="mb-1.5 block text-sm font-medium text-text">
                  Dia do pagamento
                </label>
                <Input id="dataComissao" type="date" value={data} max={hojeYMD} onChange={(e) => setData(e.target.value)} className="w-44" />
              </div>
            </div>
            {valorDigitado !== null && aMais > 0 && (
              <p className="-mt-2 text-xs text-text-muted">
                Fica {formatarCentavos(aMais)} pago a mais (como um vale adiantado).
              </p>
            )}
            <div>
              <label htmlFor="obsComissao" className="mb-1.5 block text-sm font-medium text-text">
                Anotação <span className="font-normal text-text-faint">(opcional)</span>
              </label>
              <Input
                id="obsComissao"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                maxLength={60}
                placeholder="Ex.: vale, Pix, dinheiro"
              />
            </div>
            {erro && <p className="text-sm text-danger">{erro}</p>}
            <BotoesDaJanela pendente={pendente} aoCancelar={() => setAberto(false)} aoConfirmar={confirmar} rotulo="Registrar pagamento" />
          </div>
        </Modal>
      )}
    </>
  );
}

function BotaoDesfazer({ acao }: { acao: () => Promise<EstadoAcao> }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <span className="flex flex-col items-end">
      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const resultado = await acao();
            setErro(resultado.erro ?? null);
          })
        }
        className="text-xs font-semibold text-text-muted hover:text-text disabled:opacity-50"
      >
        {pendente ? "Desfazendo..." : "Desfazer"}
      </button>
      {erro && <span className="text-xs text-danger">{erro}</span>}
    </span>
  );
}

/** Marcou como recebido por engano: o valor volta para "A receber". */
export function BotaoDesfazerRecebimento({ pagamentoId }: { pagamentoId: string }) {
  return <BotaoDesfazer acao={() => desfazerRecebimento(pagamentoId)} />;
}

/** Registrou o pagamento de comissão por engano: o valor volta para "falta pagar". */
export function BotaoDesfazerPagamentoComissao({ pagamentoComissaoId }: { pagamentoComissaoId: string }) {
  return <BotaoDesfazer acao={() => desfazerPagamentoComissao(pagamentoComissaoId)} />;
}
