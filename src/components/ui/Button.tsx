import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variante = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Tamanho = "sm" | "md" | "lg";

const CLASSE_BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors " +
  "disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none";

const CLASSES_VARIANTE: Record<Variante, string> = {
  primary: "bg-accent text-accent-foreground hover:brightness-110 active:brightness-95",
  secondary: "bg-surface-2 text-text hover:bg-border border border-border",
  ghost: "bg-transparent text-text-muted hover:bg-surface-2 hover:text-text",
  danger: "bg-danger text-white hover:brightness-110",
  outline: "bg-transparent border border-border-strong text-text hover:bg-surface-2",
};

const CLASSES_TAMANHO: Record<Tamanho, string> = {
  sm: "h-9 px-3 text-sm min-w-9",
  md: "h-11 px-4 text-sm min-w-11",
  lg: "h-14 px-6 text-base min-w-14",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variante;
  size?: Tamanho;
  href?: never;
}

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(CLASSE_BASE, CLASSES_VARIANTE[variant], CLASSES_TAMANHO[size], className)}
      {...props}
    />
  );
}

interface LinkButtonProps {
  href: string;
  variant?: Variante;
  size?: Tamanho;
  className?: string;
  children: React.ReactNode;
  prefetch?: boolean;
  target?: string;
  rel?: string;
}

export function LinkButton({ href, variant = "primary", size = "md", className, children, ...props }: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(CLASSE_BASE, CLASSES_VARIANTE[variant], CLASSES_TAMANHO[size], className)}
      {...props}
    >
      {children}
    </Link>
  );
}
