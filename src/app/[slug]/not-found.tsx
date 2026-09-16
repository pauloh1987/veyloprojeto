import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <SearchX size={40} className="text-text-faint" />
      <h1 className="font-heading text-xl font-bold text-text">Página não encontrada</h1>
      <p className="max-w-sm text-sm text-text-muted">
        Não encontramos esse link de agendamento. Confira se o endereço está correto.
      </p>
      <Link href="/" className="mt-2 text-sm font-medium text-accent underline">
        Voltar ao início
      </Link>
    </main>
  );
}
