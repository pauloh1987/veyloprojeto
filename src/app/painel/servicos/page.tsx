import type { Metadata } from "next";
import { exigirDono } from "@/lib/auth";
import { db } from "@/lib/db";
import { ServicosClient } from "./ServicosClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Serviços" };

export default async function PaginaServicos() {
  const usuario = await exigirDono();

  const [servicos, profissionais] = await Promise.all([
    db.servico.findMany({
      where: { estabelecimentoId: usuario.estabelecimentoId },
      include: { profissionais: { select: { profissionalId: true } } },
      orderBy: { nome: "asc" },
    }),
    db.profissional.findMany({
      where: { estabelecimentoId: usuario.estabelecimentoId, ativo: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  return <ServicosClient servicos={servicos} profissionais={profissionais} />;
}
