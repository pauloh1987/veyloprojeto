import Image from "next/image";
import Link from "next/link";
import { LinkButton } from "@/components/ui/Button";

export default function PaginaInicial() {
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
        <LinkButton href="/cadastro" size="lg">
          Criar minha conta grátis
        </LinkButton>
        <Link
          href="/login"
          className="flex h-14 min-w-14 items-center justify-center rounded-xl border border-white/25 px-6 text-base font-semibold text-white hover:bg-white/10"
        >
          Entrar no painel
        </Link>
      </div>

      <Link href="/privacidade" className="mt-12 text-xs text-white/40 hover:text-white/70">
        Política de Privacidade
      </Link>
    </main>
  );
}
