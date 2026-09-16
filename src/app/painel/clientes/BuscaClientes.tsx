"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function BuscaClientes({ valorInicial }: { valorInicial: string }) {
  const router = useRouter();
  const [valor, setValor] = useState(valorInicial);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      const params = new URLSearchParams();
      if (valor.trim()) params.set("q", valor.trim());
      const query = params.toString();
      router.push(`/painel/clientes${query ? `?${query}` : ""}`);
    }, 300);
    return () => clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  return (
    <div className="relative">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint" />
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="Buscar por nome ou telefone"
        aria-label="Buscar clientes"
        className="min-h-11 w-full rounded-xl border border-border-strong bg-surface pl-10 pr-3.5 text-[15px] text-text placeholder:text-text-faint focus-visible:outline-2 focus-visible:outline-focus-ring"
      />
    </div>
  );
}
