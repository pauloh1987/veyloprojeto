import type { Metadata } from "next";
import Image from "next/image";
import { CheckCircle2, XCircle } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { confirmarEmail } from "@/lib/acoes/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Confirmar e-mail" };

export default async function PaginaConfirmarEmail({ params }: PageProps<"/confirmar-email/[token]">) {
  const { token } = await params;
  const sucesso = await confirmarEmail(token);

  return (
    <main className="veylo-hero-bg flex min-h-screen items-center justify-center px-4 py-12 text-center">
      <div className="w-full max-w-sm">
        <Image src="/veylo-logo.png" alt="" width={56} height={64} className="mx-auto" priority />

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm sm:p-8">
          {sucesso ? (
            <>
              <CheckCircle2 className="mx-auto text-success" size={36} />
              <p className="mt-3 font-heading text-lg font-bold text-white">E-mail confirmado!</p>
              <p className="mt-1.5 text-sm text-white/60">Sua conta já está prontinha pra usar.</p>
            </>
          ) : (
            <>
              <XCircle className="mx-auto text-danger" size={36} />
              <p className="mt-3 font-heading text-lg font-bold text-white">Link inválido ou expirado</p>
              <p className="mt-1.5 text-sm text-white/60">
                Isso não impede você de usar sua conta normalmente — só entre no painel de novo.
              </p>
            </>
          )}
          <LinkButton href="/login" className="mt-6 w-full">
            Ir para o login
          </LinkButton>
        </div>
      </div>
    </main>
  );
}
