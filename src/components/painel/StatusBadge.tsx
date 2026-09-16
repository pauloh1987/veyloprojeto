import type { StatusAgendamento } from "@prisma/client";
import { Badge } from "@/components/ui/Badge";

const CONFIG: Record<StatusAgendamento, { rotulo: string; tom: "warning" | "info" | "success" | "danger" | "neutral" }> = {
  PENDENTE: { rotulo: "Pendente", tom: "warning" },
  CONFIRMADO: { rotulo: "Confirmado", tom: "info" },
  ATENDIDO: { rotulo: "Atendido", tom: "success" },
  FALTOU: { rotulo: "Faltou", tom: "danger" },
  CANCELADO: { rotulo: "Cancelado", tom: "neutral" },
};

export function StatusBadge({ status }: { status: StatusAgendamento }) {
  const config = CONFIG[status];
  return <Badge tom={config.tom}>{config.rotulo}</Badge>;
}
