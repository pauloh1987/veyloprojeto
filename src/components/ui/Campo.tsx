import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const CLASSE_CONTROLE =
  "w-full min-h-11 rounded-xl border border-border-strong bg-surface px-3.5 text-[15px] text-text " +
  "placeholder:text-text-faint focus-visible:outline-2 focus-visible:outline-focus-ring " +
  "focus-visible:outline-offset-1 disabled:opacity-50";

export function Rotulo({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-text", className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CLASSE_CONTROLE, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CLASSE_CONTROLE, "min-h-24 py-2.5", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(CLASSE_CONTROLE, "pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function ErroCampo({ children }: { children?: string | null }) {
  if (!children) return null;
  return <p className="mt-1.5 text-sm text-danger">{children}</p>;
}

export function Campo({
  rotulo,
  erro,
  htmlFor,
  children,
  className,
}: {
  rotulo: string;
  erro?: string | null;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Rotulo htmlFor={htmlFor}>{rotulo}</Rotulo>
      {children}
      <ErroCampo>{erro}</ErroCampo>
    </div>
  );
}
