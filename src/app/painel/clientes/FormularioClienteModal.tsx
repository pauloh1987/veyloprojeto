"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { salvarCliente } from "@/lib/acoes/clientes";
import type { EstadoAcao } from "@/lib/acoes/agendamentos";
import { Button } from "@/components/ui/Button";
import { Campo, Input, Textarea } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";

const ESTADO_INICIAL: EstadoAcao = {};

interface ClienteExistente {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  observacoes: string | null;
}

export function FormularioClienteModal({ cliente }: { cliente?: ClienteExistente }) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao] = useActionState(salvarCliente, ESTADO_INICIAL);

  useEffect(() => {
    if (estado?.sucesso) setAberto(false);
  }, [estado]);

  return (
    <>
      {cliente ? (
        <Button size="sm" variant="secondary" onClick={() => setAberto(true)}>
          <Pencil size={14} /> Editar
        </Button>
      ) : (
        <Button size="sm" onClick={() => setAberto(true)}>
          <Plus size={16} /> Novo cliente
        </Button>
      )}

      <Modal aberto={aberto} aoFechar={() => setAberto(false)} titulo={cliente ? "Editar cliente" : "Novo cliente"}>
        <form action={acao} className="space-y-4">
          {cliente && <input type="hidden" name="id" value={cliente.id} />}
          <Campo rotulo="Nome" htmlFor="nome">
            <Input id="nome" name="nome" required defaultValue={cliente?.nome} placeholder="Nome completo" />
          </Campo>
          <Campo rotulo="Telefone" htmlFor="telefone">
            <Input id="telefone" name="telefone" required defaultValue={cliente?.telefone} placeholder="(81) 91234-5678" />
          </Campo>
          <Campo rotulo="E-mail (opcional)" htmlFor="email">
            <Input id="email" name="email" type="email" defaultValue={cliente?.email ?? ""} />
          </Campo>
          <Campo rotulo="Observações (opcional)" htmlFor="observacoes">
            <Textarea id="observacoes" name="observacoes" defaultValue={cliente?.observacoes ?? ""} />
          </Campo>

          {estado?.erro && <p className="text-sm text-danger">{estado.erro}</p>}

          <Button type="submit" className="w-full">
            Salvar
          </Button>
        </form>
      </Modal>
    </>
  );
}
