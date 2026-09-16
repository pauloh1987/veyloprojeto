"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { cancelarAgendamentoPublico } from "@/lib/acoes/agendamentoPublico";
import { Button } from "@/components/ui/Button";

export function BotaoCancelar({ token }: { token: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  function cancelar() {
    setErro(null);
    iniciar(async () => {
      const resultado = await cancelarAgendamentoPublico(token);
      if (resultado.erro) setErro(resultado.erro);
      else router.refresh();
    });
  }

  if (!confirmando) {
    return (
      <Button variant="outline" className="w-full text-danger" onClick={() => setConfirmando(true)}>
        <XCircle size={16} /> Cancelar agendamento
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border border-danger/30 bg-danger-bg p-4">
      <p className="mb-3 text-sm text-text">Tem certeza que deseja cancelar este agendamento?</p>
      <div className="flex gap-2">
        <Button variant="danger" disabled={pendente} onClick={cancelar} className="flex-1">
          {pendente ? "Cancelando..." : "Sim, cancelar"}
        </Button>
        <Button variant="secondary" disabled={pendente} onClick={() => setConfirmando(false)} className="flex-1">
          Voltar
        </Button>
      </div>
      {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
    </div>
  );
}
