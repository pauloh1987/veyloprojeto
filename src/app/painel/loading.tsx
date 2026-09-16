import { PainelCarregando } from "@/components/ui/Carregando";

export default function CarregandoPainel() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <PainelCarregando linhas={5} />
    </div>
  );
}
