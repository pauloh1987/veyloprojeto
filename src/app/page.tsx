import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { LinkButton } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function PaginaInicial() {
  const estabelecimentos = await db.estabelecimento.findMany({
    orderBy: { nome: "asc" },
    select: { slug: true, nome: true, plano: true },
  });

  return (
    <main className="veylo-hero-bg flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center">
      <Image src="/veylo-logo.png" alt="" width={72} height={83} priority />
      <h1 className="mt-5 font-heading text-3xl font-extrabold text-white sm:text-4xl">
        Veylo <span className="veylo-gradient-text">Agenda</span>
      </h1>
      <p className="mt-3 max-w-md text-white/70">
        Agendamento online para manicures, barbeiros e profissionais de beleza. Sua cliente marca em segundos, você
        organiza o dia num só lugar.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <LinkButton href="/login" size="lg">
          Entrar no painel
        </LinkButton>
      </div>

      {estabelecimentos.length > 0 && (
        <div className="mt-12 w-full max-w-sm">
          <p className="mb-3 text-xs uppercase tracking-wide text-white/40">Páginas públicas de demonstração</p>
          <div className="space-y-2">
            {estabelecimentos.map((e) => (
              <Link
                key={e.slug}
                href={`/${e.slug}`}
                className="block w-full rounded-xl border border-white/20 px-4 py-3 text-sm font-medium text-white hover:bg-white/10"
              >
                {e.nome}
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
