import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { obterSessaoAtual } from "@/lib/auth";
import { FormularioLogin } from "./FormularioLogin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin() {
  const usuario = await obterSessaoAtual();
  if (usuario) redirect("/painel");

  return (
    <main className="veylo-hero-bg flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image src="/veylo-logo.png" alt="" width={56} height={64} priority />
          <div>
            <p className="font-heading text-xl font-extrabold text-white">Veylo Agenda</p>
            <p className="text-sm text-white/60">Entrar no painel</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm sm:p-8">
          <FormularioLogin />
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          Esqueceu a senha? Fale com quem administra o Veylo Agenda do seu negócio.
        </p>
      </div>
    </main>
  );
}
