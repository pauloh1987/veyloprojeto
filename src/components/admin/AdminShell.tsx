"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, SquareKanban, Store, Wallet } from "lucide-react";
import { sairDoAdmin } from "@/lib/acoes/adminAcesso";
import { AlternadorTema } from "@/components/ui/AlternadorTema";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", rotulo: "Visão geral", rotuloCurto: "Geral", Icone: LayoutDashboard },
  { href: "/admin/saloes", rotulo: "Salões", Icone: Store },
  { href: "/admin/funil", rotulo: "Funil", Icone: SquareKanban },
  { href: "/admin/financeiro", rotulo: "Financeiro", Icone: Wallet },
];

/** No celular a barra fica numa segunda linha, sem ícones, para as 4 abas caberem. */
function Navegacao({ className, compacta = false }: { className?: string; compacta?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={cn("flex gap-1", className)}>
      {NAV.map(({ href, rotulo, rotuloCurto, Icone }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition-colors",
            compacta ? "flex-1 whitespace-nowrap px-2 text-[13px]" : "shrink-0 px-3",
            pathname === href ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/8 hover:text-white",
          )}
        >
          {!compacta && <Icone size={16} aria-hidden />}
          {compacta ? (rotuloCurto ?? rotulo) : rotulo}
        </Link>
      ))}
    </nav>
  );
}

export function AdminShell({ nome, children }: { nome: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-veylo-navy-950 text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 lg:gap-6">
          <Link href="/admin" className="flex shrink-0 items-center gap-2">
            <Image src="/veylo-logo.png" alt="" width={28} height={28} />
            <span className="font-heading text-base font-extrabold">
              Veylo <span className="text-veylo-teal">Admin</span>
            </span>
          </Link>
          <Navegacao className="hidden md:flex" />
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <span className="hidden text-sm text-white/60 lg:inline">{nome}</span>
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
        <Navegacao compacta className="overflow-x-auto px-2 pb-2 md:hidden" />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
