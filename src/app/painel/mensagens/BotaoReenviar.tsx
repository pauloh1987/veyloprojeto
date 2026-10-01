"use client";

import { useState, useTransition } from "react";
import { RotateCw } from "lucide-react";
import { tentarReenviarMensagem } from "@/lib/acoes/mensagens";
import { Button } from "@/components/ui/Button";

export function BotaoReenviar({ mensagemId }: { mensagemId: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function reenviar() {
    setErro(null);
    iniciar(async () => {
      const resultado = await tentarReenviarMensagem(mensagemId);
      if (resultado.erro) setErro(resultado.erro);
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" size="sm" variant="secondary" disabled={pendente} onClick={reenviar}>
        <RotateCw size={14} aria-hidden />
        {pendente ? "Enviando..." : "Tentar de novo"}
      </Button>
      {erro && <p className="text-xs text-danger">{erro}</p>}
    </div>
  );
}
