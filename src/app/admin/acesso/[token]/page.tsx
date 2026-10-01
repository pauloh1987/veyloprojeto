import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { linkAcessoValido } from "@/lib/admin/auth";
import { BotaoEntrarAdmin } from "./BotaoEntrarAdmin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Entrar" };

/** Destino do link do e-mail. Não entra sozinha: mostra um botão, porque alguns leitores de
 * e-mail abrem os links por conta própria e gastariam o acesso (que é de uso único). */
export default async function PaginaAcessoAdmin({ params }: PageProps<"/admin/acesso/[token]">) {
  const { token } = await params;
  const valido = await linkAcessoValido(token);

  return (
    <main className="veylo-hero-bg flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <Image src="/veylo-logo.png" alt="" width={56} height={56} priority className="mx-auto" />
        <p className="mt-3 font-heading text-xl font-extrabold text-white">
          Veylo <span className="text-veylo-teal">Admin</span>
        </p>
        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm sm:p-8">
          {valido ? (
            <BotaoEntrarAdmin token={token} />
          ) : (
            <>
              <p className="font-heading text-lg font-bold text-white">Link expirado</p>
              <p className="mt-1 text-sm text-white/70">Este link já foi usado ou passou dos 15 minutos.</p>
              <Link
                href="/admin/entrar"
                className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground"
              >
                Pedir um novo link
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
