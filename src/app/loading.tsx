import { Spinner } from "@/components/ui/Carregando";

export default function CarregandoRaiz() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg" role="status" aria-label="Carregando">
      <Spinner className="h-8 w-8 text-text-faint" />
    </main>
  );
}
