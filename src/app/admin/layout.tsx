import type { Metadata } from "next";

/** Área interna da equipe Veylo. Não tem link em nenhum lugar do site e fica fora dos
 * buscadores; o acesso é conferido em cada página e ação (src/lib/admin/auth.ts). */
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin Veylo" },
  robots: { index: false, follow: false },
};

export default function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  return children;
}
