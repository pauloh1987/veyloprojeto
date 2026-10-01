import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { obterAdminAtual } from "@/lib/admin/auth";
import { FormularioEntrarAdmin } from "./FormularioEntrarAdmin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaEntrarAdmin() {
  if (await obterAdminAtual()) redirect("/admin");

  return (
    <main className="veylo-hero-bg flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image src="/veylo-logo.png" alt="" width={56} height={56} priority />
          <div>
            <p className="font-heading text-xl font-extrabold text-white">
              Veylo <span className="text-veylo-teal">Admin</span>
            </p>
            <p className="text-sm text-white/60">Área interna da equipe</p>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm sm:p-8">
          <FormularioEntrarAdmin />
        </div>
      </div>
    </main>
  );
}
