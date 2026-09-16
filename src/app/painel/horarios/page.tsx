import type { Metadata } from "next";
import { exigirSessao } from "@/lib/auth";
import { db } from "@/lib/db";
import type { DiaHorarioInput } from "@/lib/acoes/horarios";
import { HorariosClient } from "./HorariosClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Horários" };

export default async function PaginaHorarios() {
  const usuario = await exigirSessao();

  const profissionais = await db.profissional.findMany({
    where: {
      estabelecimentoId: usuario.estabelecimentoId,
      ativo: true,
      ...(usuario.papel === "PROFISSIONAL" ? { id: usuario.profissionalId ?? "" } : {}),
    },
    include: { horarios: true },
    orderBy: { nome: "asc" },
  });

  const comHorarios = profissionais.map((p) => {
    const porDia = new Map(p.horarios.map((h) => [h.diaSemana, h]));
    const horarios: DiaHorarioInput[] = Array.from({ length: 7 }, (_, diaSemana) => {
      const existente = porDia.get(diaSemana);
      return {
        diaSemana,
        fechado: existente?.fechado ?? true,
        abre: existente?.abre ?? "09:00",
        fecha: existente?.fecha ?? "18:00",
        almocoInicio: existente?.almocoInicio ?? "",
        almocoFim: existente?.almocoFim ?? "",
      };
    });
    return { id: p.id, nome: p.nome, horarios };
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-text">Horários</h1>
        <p className="text-sm text-text-muted">Defina os dias e horários de atendimento de cada profissional.</p>
      </header>
      <HorariosClient profissionais={comHorarios} />
    </div>
  );
}
