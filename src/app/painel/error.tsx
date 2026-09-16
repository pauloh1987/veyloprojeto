"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ErroPainel({
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
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <AlertTriangle className="text-danger" size={32} />
      <p className="font-heading text-lg font-bold text-text">Não foi possível carregar esta tela</p>
      <p className="max-w-sm text-sm text-text-muted">Tente novamente. Se o problema continuar, recarregue a página.</p>
      <Button onClick={() => reset()}>Tentar novamente</Button>
    </div>
  );
}
