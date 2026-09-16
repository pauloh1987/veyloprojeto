import { cn } from "@/lib/cn";

type TomBadge = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

const CLASSES_TOM: Record<TomBadge, string> = {
  neutral: "bg-surface-2 text-text-muted",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  accent: "bg-accent text-accent-foreground",
};

export function Badge({
  tom = "neutral",
  className,
  children,
}: {
  tom?: TomBadge;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        CLASSES_TOM[tom],
        className,
      )}
    >
      {children}
    </span>
  );
}
