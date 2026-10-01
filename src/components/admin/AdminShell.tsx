"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, SquareKanban } from "lucide-react";
import { sairDoAdmin } from "@/lib/acoes/adminAcesso";
import { AlternadorTema } from "@/components/ui/AlternadorTema";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", rotulo: "Visão geral", Icone: LayoutDashboard },
  { href: "/admin/funil", rotulo: "Funil", Icone: SquareKanban },
];

export function AdminShell({ nome, children }: { nome: string; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-veylo-navy-950 text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:gap-6">
          <Link href="/admin" className="flex shrink-0 items-center gap-2">
            <Image src="/veylo-logo.png" alt="" width={28} height={28} />
            <span className="hidden font-heading text-base font-extrabold sm:inline">
              Veylo <span className="text-veylo-teal">Admin</span>
            </span>
          </Link>
          <nav className="flex gap-1">
            {NAV.map(({ href, rotulo, Icone }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                  pathname === href ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/8 hover:text-white",
                )}
              >
                <Icone size={16} aria-hidden />
                {rotulo}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <span className="hidden text-sm text-white/60 md:inline">{nome}</span>
            <AlternadorTema className="flex h-10 w-10 items-center justify-center rounded-full text-white/65 hover:bg-white/8 hover:text-white" />
            <form action={sairDoAdmin}>
              <button
                type="submit"
                aria-label="Sair"
                className="flex h-10 items-center gap-2 rounded-xl px-2.5 text-sm font-semibold text-white/65 hover:bg-white/8 hover:text-white"
              >
                <LogOut size={16} aria-hidden />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
