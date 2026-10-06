"use client";

import { useRef, useState, useTransition } from "react";
import { alterarEmailDeAcesso } from "@/lib/acoes/conta";
import type { EstadoAcao } from "@/lib/acoes/agendamentos";
import { Button } from "@/components/ui/Button";
import { Campo, Input } from "@/components/ui/Campo";

export function TrocarEmailForm({ emailAtual }: { emailAtual: string }) {
  const [estado, setEstado] = useState<EstadoAcao>({});
  const [pendente, iniciar] = useTransition();
  const formulario = useRef<HTMLFormElement>(null);

  // onSubmit (e não <form action>) para o React não limpar os campos quando o servidor
  // devolve um erro, como senha incorreta.
  function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    iniciar(async () => {
      const resultado = await alterarEmailDeAcesso({}, dados);
      setEstado(resultado);
      if (resultado.sucesso) formulario.current?.reset();
    });
  }

  return (
    <form ref={formulario} onSubmit={aoEnviar} noValidate className="mt-6 space-y-4 rounded-2xl border border-border bg-surface p-4">
      <div>
        <h2 className="font-heading text-base font-bold text-text">E-mail de acesso</h2>
        <p className="text-sm text-text-muted">
          Hoje: <strong className="break-all text-text">{emailAtual}</strong>. É o e-mail para entrar no painel e o que recebe
          os avisos de agendamento.
        </p>
      </div>
      <Campo rotulo="Novo e-mail" htmlFor="novoEmail">
        <Input id="novoEmail" name="email" type="email" autoComplete="email" inputMode="email" required />
      </Campo>
      <Campo rotulo="Sua senha atual" htmlFor="senhaAtual">
        <Input id="senhaAtual" name="senhaAtual" type="password" autoComplete="current-password" required />
      </Campo>
      {estado.erro && <p className="text-sm text-danger">{estado.erro}</p>}
      {estado.sucesso && (
        <p className="text-sm text-success">E-mail trocado. Mandamos um link de confirmação para o endereço novo.</p>
      )}
      <Button type="submit" variant="secondary" disabled={pendente}>
        {pendente ? "Trocando..." : "Trocar e-mail"}
      </Button>
    </form>
  );
}
