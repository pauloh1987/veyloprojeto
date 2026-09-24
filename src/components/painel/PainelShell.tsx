"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  CalendarDays, ListChecks, Users, MessageSquare, BarChart3, Scissors, Clock, Ban,
  Settings, LogOut, Menu, X, UserRound, AlertTriangle,
} from "lucide-react";
import type { SessaoUsuario } from "@/lib/auth";
import { sair } from "@/lib/acoes/auth";
import { testeGratisExpirado } from "@/lib/assinatura";
import { Avatar } from "@/components/ui/Avatar";
import { AlternadorTema } from "@/components/ui/AlternadorTema";
import { cn } from "@/lib/cn";

const EMAIL_CONTATO = "contato@veyloagenda.com.br";

interface ItemNav {
  href: string;
  rotulo: string;
  Icone: typeof CalendarDays;
}

const NAV_PRINCIPAL: ItemNav[] = [
  { href: "/painel/hoje", rotulo: "Hoje", Icone: ListChecks },
  { href: "/painel/agenda", rotulo: "Agenda", Icone: CalendarDays },
  { href: "/painel/clientes", rotulo: "Clientes", Icone: Users },
  { href: "/painel/mensagens", rotulo: "Mensagens", Icone: MessageSquare },
];

const NAV_DONO_EXTRA: ItemNav[] = [
  { href: "/painel/relatorio", rotulo: "Relatório", Icone: BarChart3 },
  { href: "/painel/profissionais", rotulo: "Profissionais", Icone: UserRound },
  { href: "/painel/servicos", rotulo: "Serviços", Icone: Scissors },
  { href: "/painel/horarios", rotulo: "Horários", Icone: Clock },
  { href: "/painel/bloqueios", rotulo: "Bloqueios", Icone: Ban },
  { href: "/painel/configuracoes", rotulo: "Configurações", Icone: Settings },
];

const NAV_PROFISSIONAL_EXTRA: ItemNav[] = [
  { href: "/painel/bloqueios", rotulo: "Bloqueios", Icone: Ban },
];

export function PainelShell({ usuario, children }: { usuario: SessaoUsuario; children: ReactNode }) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const extra = usuario.papel === "DONO" ? NAV_DONO_EXTRA : NAV_PROFISSIONAL_EXTRA;
  const todosItens = [...NAV_PRINCIPAL, ...extra];
  const itensBottomBar = [...NAV_PRINCIPAL.slice(0, 4)];

  function ativo(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div
      className="flex h-dvh overflow-hidden bg-bg"
      style={{ ["--accent" as string]: usuario.estabelecimento.corDestaque }}
    >
      {/* Sidebar (tablet/desktop) */}
      <aside className="hidden md:flex md:h-dvh md:w-64 md:shrink-0 md:flex-col md:overflow-y-auto md:border-r md:border-border md:bg-surface">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <img src="/veylo-logo.png" alt="" className="h-8 w-8 rounded-lg object-cover" />
          <div className="min-w-0">
            <p className="truncate font-heading text-sm font-bold text-text">{usuario.estabelecimento.nome}</p>
            <p className="text-xs text-text-faint">Veylo Agenda</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {todosItens.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                ativo(item.href) ? "bg-accent text-accent-foreground" : "text-text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              <item.Icone size={18} />
              {item.rotulo}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-between border-t border-border px-3 py-3">
          <div className="flex items-center gap-2 px-2">
            <Avatar nome={usuario.nome} tamanho="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text">{usuario.nome}</p>
              <p className="text-xs text-text-faint">{usuario.papel === "DONO" ? "Dona/Dono" : "Profissional"}</p>
            </div>
          </div>
          <AlternadorTema />
        </div>
        <form action={sair} className="px-3 pb-4">
          <button
            type="button"
            onClick={(e) => e.currentTarget.form?.requestSubmit()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-muted hover:bg-surface-2 hover:text-danger"
          >
            <LogOut size={18} />
            Sair
          </button>
        </form>
      </aside>

      <div className="flex h-dvh flex-1 flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="shrink-0 flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
          <div className="flex items-center gap-2.5">
            <img src="/veylo-logo.png" alt="" className="h-7 w-7 rounded-md object-cover" />
            <p className="truncate font-heading text-sm font-bold text-text">{usuario.estabelecimento.nome}</p>
          </div>
          <div className="flex items-center gap-1">
            <AlternadorTema />
            <button
              type="button"
              aria-label="Abrir menu"
              onClick={() => setMenuAberto(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"
            >
              <Menu size={20} />
            </button>
          </div>
        </header>

        {testeGratisExpirado(usuario.estabelecimento) && <FaixaTesteExpirado />}

        <main className="flex-1 overflow-y-auto">{children}</main>

        {/* Bottom nav (mobile) */}
        <nav className="shrink-0 grid grid-cols-4 border-t border-border bg-surface/95 backdrop-blur md:hidden">
          {itensBottomBar.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium",
                ativo(item.href) ? "text-accent" : "text-text-faint",
              )}
            >
              <item.Icone size={20} />
              {item.rotulo}
            </Link>
          ))}
        </nav>
      </div>

      {/* Menu completo (mobile), acessado pelo botão de menu */}
      {menuAberto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuAberto(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col bg-surface p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar nome={usuario.nome} tamanho="sm" />
                <div>
                  <p className="text-sm font-semibold text-text">{usuario.nome}</p>
                  <p className="text-xs text-text-faint">{usuario.papel === "DONO" ? "Dona/Dono" : "Profissional"}</p>
                </div>
              </div>
              <button
                aria-label="Fechar"
                onClick={() => setMenuAberto(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-surface-2"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {todosItens.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuAberto(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                    ativo(item.href) ? "bg-accent text-accent-foreground" : "text-text-muted hover:bg-surface-2 hover:text-text",
                  )}
                >
                  <item.Icone size={18} />
                  {item.rotulo}
                </Link>
              ))}
            </nav>
            <form action={sair} className="border-t border-border pt-3">
              <button
                type="button"
                onClick={(e) => e.currentTarget.form?.requestSubmit()}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-muted hover:bg-surface-2 hover:text-danger"
              >
                <LogOut size={18} />
                Sair
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FaixaTesteExpirado() {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-warning-bg px-4 py-2.5 text-center text-sm text-warning">
      <AlertTriangle size={16} className="shrink-0" />
      <span>Seu período de teste grátis do Veylo Agenda acabou.</span>
      <a href={`mailto:${EMAIL_CONTATO}`} className="font-semibold underline underline-offset-2">
        Fale com a gente para continuar usando
      </a>
    </div>
  );
}
