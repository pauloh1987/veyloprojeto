"use client";

import { useState, useTransition } from "react";
import { definirAssinatura, definirParceria, estenderTesteSalao } from "@/lib/acoes/admin";
import type { EstadoAcao } from "@/lib/acoes/agendamentos";
import type { SituacaoConta } from "@/lib/assinatura";
import { Button } from "@/components/ui/Button";

/** Botões de cada salão na visão geral: estender o teste, marcar como parceira (piloto sem
 * cobrança) ou como assinante (já paga). */
export function AcoesSalao({ salaoId, nome, situacao }: { salaoId: string; nome: string; situacao: SituacaoConta["tipo"] }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function executar(acao: () => Promise<EstadoAcao>, confirmacao?: string) {
    if (confirmacao && !window.confirm(confirmacao)) return;
    setErro(null);
    iniciar(async () => {
      const resultado = await acao();
      if (resultado.erro) setErro(resultado.erro);
    });
  }

  const emTeste = situacao === "teste" || situacao === "testeVencido";

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {emTeste && (
          <Button type="button" size="sm" variant="secondary" disabled={pendente} onClick={() => executar(() => estenderTesteSalao(salaoId))}>
            +7 dias de teste
          </Button>
        )}
        {situacao !== "parceira" && situacao !== "assinante" && (
          <Button type="button" size="sm" variant="secondary" disabled={pendente} onClick={() => executar(() => definirParceria(salaoId, true))}>
            Marcar como parceira
          </Button>
        )}
        {situacao !== "assinante" && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pendente}
            onClick={() => executar(() => definirAssinatura(salaoId, true), `Confirmar que ${nome} já está pagando?`)}
          >
            Marcar como assinante
          </Button>
        )}
        {situacao === "parceira" && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pendente}
            onClick={() => executar(() => definirParceria(salaoId, false), `Tirar ${nome} das parceiras? O teste grátis volta a contar.`)}
          >
            Tirar de parceira
          </Button>
        )}
        {situacao === "assinante" && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pendente}
            onClick={() => executar(() => definirAssinatura(salaoId, false), `Cancelar a assinatura de ${nome}?`)}
          >
            Cancelar assinatura
          </Button>
        )}
      </div>
      {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
    </div>
  );
}
