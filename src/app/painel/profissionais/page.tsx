import type { Metadata } from "next";
import { exigirDono } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfissionaisClient } from "./ProfissionaisClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Profissionais" };

export default async function PaginaProfissionais() {
  const usuario = await exigirDono();

  const profissionais = await db.profissional.findMany({
    where: { estabelecimentoId: usuario.estabelecimentoId },
    include: { usuario: { select: { id: true } } },
    orderBy: { nome: "asc" },
  });

  return (
    <ProfissionaisClient
      plano={usuario.estabelecimento.plano}
      profissionais={profissionais.map((p) => ({
        id: p.id,
        nome: p.nome,
        ativo: p.ativo,
        temLogin: !!p.usuario,
      }))}
    />
  );
}
