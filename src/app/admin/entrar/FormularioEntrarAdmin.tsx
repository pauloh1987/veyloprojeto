"use client";

import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { pedirLinkAdmin } from "@/lib/acoes/adminAcesso";
import type { EstadoAcao } from "@/lib/acoes/agendamentos";
import { Button } from "@/components/ui/Button";
import { Input, Rotulo } from "@/components/ui/Campo";

const ESTADO_INICIAL: EstadoAcao = {};

export function FormularioEntrarAdmin() {
  const [estado, acao, pendente] = useActionState(pedirLinkAdmin, ESTADO_INICIAL);

  if (estado.sucesso) {
    return (
      <div className="text-center" role="status">
        <MailCheck className="mx-auto text-veylo-teal" size={36} aria-hidden />
        <p className="mt-3 font-heading text-lg font-bold text-white">Confira seu e-mail</p>
        <p className="mt-1 text-sm text-white/70">
          Se esse e-mail for da equipe, o link de acesso chega em instantes. Ele vale por 15 minutos. Se não aparecer,
          veja o spam.
        </p>
      </div>
    );
  }

  return (
    <form action={acao} className="space-y-4" noValidate>
      <div>
        <Rotulo htmlFor="email" className="text-white/85">
          Seu e-mail
        </Rotulo>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" required />
      </div>
      {estado.erro && (
        <p role="alert" className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
          {estado.erro}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pendente}>
        {pendente ? "Enviando..." : "Receber link de acesso"}
      </Button>
      <p className="text-center text-xs text-white/45">Sem senha: você recebe um link de entrada no e-mail.</p>
    </form>
  );
}
