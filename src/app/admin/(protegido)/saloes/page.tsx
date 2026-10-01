import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/admin/auth";
import { carregarSaloes } from "@/lib/admin/dados";
import { ListaSaloes } from "@/components/admin/ListaSaloes";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Salões" };

export default async function PaginaSaloes() {
  await exigirAdmin();
  const agora = new Date();
  const saloes = await carregarSaloes(agora);
  return <ListaSaloes saloes={saloes} agora={agora} />;
}
