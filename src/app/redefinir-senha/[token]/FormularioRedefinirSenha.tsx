"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { redefinirSenha, type EstadoNovaSenha } from "@/lib/acoes/senha";
import { Button } from "@/components/ui/Button";
import { Campo, Input } from "@/components/ui/Campo";

const ESTADO_INICIAL: EstadoNovaSenha = {};

export function FormularioRedefinirSenha({ token }: { token: string }) {
  const [estado, acao, pendente] = useActionState(redefinirSenha, ESTADO_INICIAL);
  const router = useRouter();

  useEffect(() => {
    if (estado?.sucesso) {
      const timer = setTimeout(() => router.push("/login"), 1800);
      return () => clearTimeout(timer);
    }
  }, [estado, router]);

  if (estado?.sucesso) {
    return (
      <p className="rounded-xl bg-success-bg px-3.5 py-3 text-sm text-success">
        Senha atualizada! Levando você pro login...
      </p>
    );
  }

  return (
    <form action={acao} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <Campo rotulo="Nova senha" htmlFor="senha">
        <Input id="senha" name="senha" type="password" autoComplete="new-password" placeholder="••••••" required />
      </Campo>

      {estado?.erro && (
        <p role="alert" className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
          {estado.erro}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pendente}>
        {pendente ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  );
}
