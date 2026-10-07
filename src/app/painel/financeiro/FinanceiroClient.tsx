"use client";

import { useState, useTransition } from "react";
import type { FormaPagamento } from "@prisma/client";
import { Check } from "lucide-react";
import { desfazerRecebimento, registrarRecebimento } from "@/lib/acoes/financeiro";
import { FORMAS_DE_RECEBIMENTO } from "@/lib/financeiro/fechamento";
import { centavosParaCampo, formatarCentavos, reaisParaCentavos } from "@/lib/formatadores";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Campo";
import { cn } from "@/lib/cn";

type FormaRecebimento = Exclude<FormaPagamento, "FIADO">;

/** "Recebi": marca o fiado como pago (tudo ou uma parte), na forma em que o dinheiro entrou. */
export function BotaoReceberFiado({
  pagamentoId,
  valorCentavos,
  clienteNome,
}: {
  pagamentoId: string;
  valorCentavos: number;
  clienteNome: string;
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
    if (!forma) return setErro("Escolha como ela pagou.");
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
      <Button size="sm" onClick={abrir}>
        <Check size={15} /> Recebi
      </Button>
      {aberto && (
        <Modal aberto aoFechar={() => setAberto(false)} titulo="Receber fiado">
          <div className="space-y-5">
            <p className="text-sm text-text-muted">
              <span className="font-semibold text-text">{clienteNome}</span> devia {formatarCentavos(valorCentavos)}.
            </p>
            <div>
              <p className="mb-2 text-sm font-medium text-text">Como ela pagou?</p>
              <div className="flex flex-wrap gap-1.5">
                {FORMAS_DE_RECEBIMENTO.map((f) => (
                  <button
                    key={f.forma}
                    type="button"
                    onClick={() => setForma(f.forma as FormaRecebimento)}
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
            <div>
              <label htmlFor="valorRecebido" className="mb-1.5 block text-sm font-medium text-text">
                Valor recebido
              </label>
              <div className="relative w-40">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-text-faint">R$</span>
                <Input
                  id="valorRecebido"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  inputMode="decimal"
                  className="pl-9 text-right tabular-nums"
                />
              </div>
              {parcial && valorDigitado !== null && (
                <p className="mt-1.5 text-xs text-text-muted">
                  Pagou uma parte: continuam {formatarCentavos(valorCentavos - valorDigitado)} a receber.
                </p>
              )}
            </div>
            {erro && <p className="text-sm text-danger">{erro}</p>}
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button variant="ghost" onClick={() => setAberto(false)} disabled={pendente}>
                Cancelar
              </Button>
              <Button onClick={confirmar} disabled={pendente}>
                {pendente ? "Salvando..." : "Confirmar recebimento"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

/** Marcou como recebido por engano: o valor volta para "A receber". */
export function BotaoDesfazerRecebimento({ pagamentoId }: { pagamentoId: string }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <span className="flex flex-col items-end">
      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const resultado = await desfazerRecebimento(pagamentoId);
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
