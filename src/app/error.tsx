"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ErroGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <AlertTriangle className="text-danger" size={36} />
      <p className="font-heading text-xl font-bold text-text">Algo deu errado</p>
      <p className="max-w-sm text-sm text-text-muted">
        Não foi possível carregar esta página. Tente novamente em alguns instantes.
      </p>
      <Button onClick={() => reset()}>Tentar novamente</Button>
    </main>
  );
}
