import { Skeleton } from "@/components/ui/Carregando";

export default function CarregandoPaginaPublica() {
  return (
    <main className="min-h-screen bg-bg pb-16" role="status" aria-label="Carregando">
      <div className="px-4 pb-8 pt-10 text-center">
        <Skeleton className="mx-auto h-16 w-16 rounded-full" />
        <Skeleton className="mx-auto mt-3 h-6 w-40" />
        <Skeleton className="mx-auto mt-2 h-4 w-56" />
      </div>
      <div className="mx-auto max-w-md space-y-2.5 px-4 pt-6">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    </main>
  );
}
