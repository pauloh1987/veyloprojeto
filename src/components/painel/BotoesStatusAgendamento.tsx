"use client";

import { useState, useTransition } from "react";
import type { StatusAgendamento } from "@prisma/client";
import { atualizarStatusAgendamento } from "@/lib/acoes/agendamentos";
import { Button } from "@/components/ui/Button";

export function BotoesStatusAgendamento({
  agendamentoId,
  status,
  compacto = false,
}: {
  agendamentoId: string;
  status: StatusAgendamento;
  compacto?: boolean;
}) {
  const [pendente, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function mudar(novoStatus: StatusAgendamento) {
    setErro(null);
    iniciarTransicao(async () => {
      const resultado = await atualizarStatusAgendamento(agendamentoId, novoStatus);
      if (resultado.erro) setErro(resultado.erro);
    });
  }

  if (status === "CANCELADO" || status === "ATENDIDO" || status === "FALTOU") {
    return null;
  }

  return (
    <div>
      <div className={compacto ? "flex flex-wrap gap-1.5" : "flex flex-wrap gap-2"}>
        {status === "PENDENTE" && (
          <Button size="sm" variant="secondary" disabled={pendente} onClick={() => mudar("CONFIRMADO")}>
            Confirmar
          </Button>
        )}
        <Button size="sm" variant="secondary" disabled={pendente} onClick={() => mudar("ATENDIDO")}>
          Atendido
        </Button>
        <Button size="sm" variant="outline" disabled={pendente} onClick={() => mudar("FALTOU")}>
          Faltou
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-danger hover:bg-danger-bg"
          disabled={pendente}
          onClick={() => mudar("CANCELADO")}
        >
          Cancelar
        </Button>
      </div>
      {erro && <p className="mt-1.5 text-xs text-danger">{erro}</p>}
    </div>
  );
}
