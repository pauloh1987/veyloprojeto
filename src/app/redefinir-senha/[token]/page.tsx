import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { obterSessaoAtual } from "@/lib/auth";
import { FormularioRedefinirSenha } from "./FormularioRedefinirSenha";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Redefinir senha" };

export default async function PaginaRedefinirSenha({ params }: PageProps<"/redefinir-senha/[token]">) {
  const usuario = await obterSessaoAtual();
  if (usuario) redirect("/painel");

  const { token } = await params;

  return (
    <main className="veylo-hero-bg flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image src="/veylo-logo.png" alt="" width={56} height={64} priority />
          <div>
            <p className="font-heading text-xl font-extrabold text-white">Veylo Agenda</p>
            <p className="text-sm text-white/60">Escolha sua nova senha</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm sm:p-8">
          <FormularioRedefinirSenha token={token} />
        </div>
      </div>
    </main>
  );
}
