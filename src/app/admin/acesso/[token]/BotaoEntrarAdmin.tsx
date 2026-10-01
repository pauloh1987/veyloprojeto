"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { entrarNoAdmin } from "@/lib/acoes/adminAcesso";
import { Button } from "@/components/ui/Button";

export function BotaoEntrarAdmin({ token }: { token: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function entrar() {
    setErro(null);
    iniciar(async () => {
      const resultado = await entrarNoAdmin(token);
      if (resultado?.erro) setErro(resultado.erro);
    });
  }

  return (
    <div>
      <p className="font-heading text-lg font-bold text-white">Tudo certo</p>
      <p className="mt-1 text-sm text-white/70">Toque no botão para entrar no admin.</p>
      <Button type="button" size="lg" className="mt-5 w-full" disabled={pendente} onClick={entrar}>
        {pendente ? "Entrando..." : "Entrar no admin"}
      </Button>
      {erro && (
        <div className="mt-4" role="alert">
          <p className="text-sm text-danger">{erro}</p>
          <Link href="/admin/entrar" className="mt-2 inline-block text-sm font-medium text-white/80 underline">
            Pedir um novo link
          </Link>
        </div>
      )}
    </div>
  );
}
