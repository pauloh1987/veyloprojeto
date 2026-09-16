"use client";

import { useActionState } from "react";
import { entrar, type EstadoLogin } from "@/lib/acoes/auth";
import { Button } from "@/components/ui/Button";
import { Campo, Input } from "@/components/ui/Campo";

const ESTADO_INICIAL: EstadoLogin = {};

export function FormularioLogin() {
  const [estado, acao, pendente] = useActionState(entrar, ESTADO_INICIAL);

  return (
    <form action={acao} className="space-y-4" noValidate>
      <Campo rotulo="E-mail" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          required
        />
      </Campo>
      <Campo rotulo="Senha" htmlFor="senha">
        <Input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          placeholder="••••••"
          required
        />
      </Campo>

      {estado?.erro && (
        <p role="alert" className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
          {estado.erro}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pendente}>
        {pendente ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
