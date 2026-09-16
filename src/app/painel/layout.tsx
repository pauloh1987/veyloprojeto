import { exigirSessao } from "@/lib/auth";
import { PainelShell } from "@/components/painel/PainelShell";

export const dynamic = "force-dynamic";

export default async function PainelLayout({ children }: LayoutProps<"/painel">) {
  const usuario = await exigirSessao();

  return <PainelShell usuario={usuario}>{children}</PainelShell>;
}
