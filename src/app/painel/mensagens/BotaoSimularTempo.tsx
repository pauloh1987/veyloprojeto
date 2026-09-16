"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { FastForward } from "lucide-react";
import { acaoSimularPassagemDoTempo } from "@/lib/acoes/mensagens";
import { Button } from "@/components/ui/Button";

export function BotaoSimularTempo({ fuso }: { fuso: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<{ processadas: number; agoraEfetivo: string } | null>(null);

  function simular() {
    iniciar(async () => {
      const r = await acaoSimularPassagemDoTempo();
      setResultado(r);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-dashed border-border-strong bg-surface-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-text">Simular passagem do tempo</p>
          <p className="text-sm text-text-muted">Avança o relógio ~25h e processa lembretes pendentes, sem esperar de verdade.</p>
        </div>
        <Button variant="secondary" onClick={simular} disabled={pendente}>
          <FastForward size={16} />
          {pendente ? "Simulando..." : "Simular"}
        </Button>
      </div>
      {resultado && (
        <p className="mt-3 text-sm text-success">
          {resultado.processadas} mensagem(ns) processada(s). Relógio simulado em{" "}
          {formatInTimeZone(new Date(resultado.agoraEfetivo), fuso, "d 'de' MMMM, HH:mm", { locale: ptBR })}.
        </p>
      )}
    </div>
  );
}
