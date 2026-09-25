"use client";

import { useActionState } from "react";
import { solicitarRedefinicaoSenha, type EstadoRedefinicaoSenha } from "@/lib/acoes/senha";
import { Button } from "@/components/ui/Button";
import { Campo, Input } from "@/components/ui/Campo";

const ESTADO_INICIAL: EstadoRedefinicaoSenha = {};

export function FormularioEsqueciSenha() {
  const [estado, acao, pendente] = useActionState(solicitarRedefinicaoSenha, ESTADO_INICIAL);

  if (estado?.mensagem) {
    return <p className="rounded-xl bg-success-bg px-3.5 py-3 text-sm text-success">{estado.mensagem}</p>;
  }

  return (
    <form action={acao} className="space-y-4" noValidate>
      <Campo rotulo="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" required />
      </Campo>

      {estado?.erro && (
        <p role="alert" className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
          {estado.erro}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pendente}>
        {pendente ? "Enviando..." : "Enviar link de redefinição"}
      </Button>
    </form>
  );
}
