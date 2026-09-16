import type { Metadata } from "next";
import { exigirSessao } from "@/lib/auth";
import { db } from "@/lib/db";
import { BloqueiosClient } from "./BloqueiosClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bloqueios" };

export default async function PaginaBloqueios() {
  const usuario = await exigirSessao();
  const escopoProfissional = usuario.papel === "PROFISSIONAL" ? usuario.profissionalId ?? "" : undefined;

  const [bloqueios, profissionais] = await Promise.all([
    db.bloqueio.findMany({
      where: {
        profissional: { estabelecimentoId: usuario.estabelecimentoId },
        ...(escopoProfissional ? { profissionalId: escopoProfissional } : {}),
      },
      include: { profissional: { select: { id: true, nome: true } } },
      orderBy: { inicio: "asc" },
    }),
    db.profissional.findMany({
      where: { estabelecimentoId: usuario.estabelecimentoId, ativo: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  return (
    <BloqueiosClient
      bloqueios={bloqueios.map((b) => ({
        id: b.id,
        inicio: b.inicio.toISOString(),
        fim: b.fim.toISOString(),
        motivo: b.motivo,
        profissional: b.profissional,
      }))}
      profissionais={
        escopoProfissional ? profissionais.filter((p) => p.id === escopoProfissional) : profissionais
      }
      fuso={usuario.estabelecimento.fuso}
      mostrarSeletorProfissional={usuario.estabelecimento.plano === "EQUIPE" && usuario.papel === "DONO"}
    />
  );
}
