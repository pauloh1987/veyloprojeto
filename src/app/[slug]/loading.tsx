import { Skeleton } from "@/components/ui/Carregando";

export default function CarregandoPaginaPublica() {
  return (
    <main className="tema-claro min-h-screen bg-bg px-3 pt-3 pb-10 sm:pt-8" role="status" aria-label="Carregando">
      <div className="mx-auto max-w-md space-y-3">
        <div className="overflow-hidden rounded-[28px] border border-border bg-surface">
          <Skeleton className="h-28 w-full rounded-none" />
          <div className="-mt-14 px-5 pb-6 text-center">
            <Skeleton className="mx-auto h-28 w-28 rounded-full ring-4 ring-surface" />
            <Skeleton className="mx-auto mt-4 h-3 w-32" />
            <Skeleton className="mx-auto mt-2 h-7 w-48" />
            <div className="mt-5 grid grid-cols-3 gap-2">
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
            </div>
            <Skeleton className="mt-5 h-12 w-full rounded-2xl" />
          </div>
        </div>
        <div className="space-y-3 rounded-[28px] border border-border bg-surface p-4">
          <Skeleton className="mx-auto h-9 w-56 rounded-full" />
          <Skeleton className="h-36 w-full rounded-3xl" />
          <Skeleton className="h-36 w-full rounded-3xl" />
        </div>
      </div>
    </main>
  );
}
