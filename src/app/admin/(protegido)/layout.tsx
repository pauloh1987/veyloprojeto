import { exigirAdmin } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function LayoutAreaAdmin({ children }: { children: React.ReactNode }) {
  const admin = await exigirAdmin();
  return <AdminShell nome={admin.nome}>{children}</AdminShell>;
}
