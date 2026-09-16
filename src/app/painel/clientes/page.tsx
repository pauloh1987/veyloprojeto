import type { Metadata } from "next";
import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { db } from "@/lib/db";
import { Avatar } from "@/components/ui/Avatar";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { BuscaClientes } from "./BuscaClientes";
import { FormularioClienteModal } from "./FormularioClienteModal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Clientes" };

export default async function PaginaClientes({
  searchParams,
}: PageProps<"/painel/clientes">) {
  const usuario = await exigirSessao();
  const { q } = await searchParams;
  const busca = typeof q === "string" ? q.trim() : "";

  const clientes = await db.cliente.findMany({
    where: {
      estabelecimentoId: usuario.estabelecimentoId,
      ...(busca
        ? { OR: [{ nome: { contains: busca } }, { telefone: { contains: busca } }] }
        : {}),
    },
    orderBy: { nome: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold text-text">Clientes</h1>
        <FormularioClienteModal />
      </header>

      <div className="mb-5">
        <BuscaClientes valorInicial={busca} />
      </div>

      {clientes.length === 0 ? (
        <EstadoVazio
          icone={<Users className="mx-auto" />}
          titulo={busca ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
          descricao={busca ? "Tente buscar por outro nome ou telefone." : "Clientes aparecem aqui automaticamente quando agendam pelo link público."}
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {clientes.map((cliente) => (
            <li key={cliente.id}>
              <Link
                href={`/painel/clientes/${cliente.id}`}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2"
              >
                <Avatar nome={cliente.nome} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-text">{cliente.nome}</p>
                  <p className="text-sm text-text-muted">{cliente.telefone}</p>
                </div>
                <ChevronRight size={18} className="shrink-0 text-text-faint" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
