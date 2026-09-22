import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { obterSessaoAtual } from "@/lib/auth";
import { CadastroForm } from "./CadastroForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Criar conta" };

export default async function PaginaCadastro() {
  const usuario = await obterSessaoAtual();
  if (usuario) redirect("/painel");

  return (
    <main className="veylo-hero-bg flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image src="/veylo-logo.png" alt="" width={56} height={64} priority />
          <div>
            <p className="font-heading text-xl font-extrabold text-white">Veylo Agenda</p>
            <p className="text-sm text-white/60">Crie sua agenda online em 1 minuto</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm sm:p-8">
          <CadastroForm />
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-white/70 underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
