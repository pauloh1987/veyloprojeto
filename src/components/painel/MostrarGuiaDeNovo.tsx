"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mostrarGuiaDeNovo } from "@/lib/acoes/guia";
import { Button } from "@/components/ui/Button";

/** Em Configurações, quando a dona escondeu o guia "Comece por aqui": traz o guia de volta
 * para a tela Hoje e leva até lá. */
export function MostrarGuiaDeNovo() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function mostrar() {
    setErro(null);
    iniciar(async () => {
      const resultado = await mostrarGuiaDeNovo();
      if (resultado.erro) setErro(resultado.erro);
      else router.push("/painel/hoje");
    });
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-text">Guia &quot;Comece por aqui&quot;</h2>
      <p className="mt-1 text-sm text-text-muted">
        O passo a passo para configurar a agenda, com o que já foi feito marcado.
      </p>
      {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
      <Button type="button" variant="secondary" size="sm" className="mt-3" disabled={pendente} onClick={mostrar}>
        Mostrar o guia de novo
      </Button>
    </div>
  );
}
