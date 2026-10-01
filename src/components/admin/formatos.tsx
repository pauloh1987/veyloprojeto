import { formatInTimeZone } from "date-fns-tz";
import { formatDistanceStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { SituacaoConta } from "@/lib/assinatura";
import { FUSO_PADRAO } from "@/lib/tz";
import { Badge } from "@/components/ui/Badge";

export function dataCurta(instante: Date): string {
  return formatInTimeZone(instante, FUSO_PADRAO, "dd/MM/yy");
}

export function tempoDesde(instante: Date | null, agora: Date): string {
  return instante ? formatDistanceStrict(instante, agora, { locale: ptBR, addSuffix: true }) : "sem registro";
}

export function SituacaoBadge({ situacao }: { situacao: SituacaoConta }) {
  switch (situacao.tipo) {
    case "assinante":
      return <Badge tom="success">Assinante desde {dataCurta(situacao.desde)}</Badge>;
    case "parceira":
      return <Badge tom="accent">Parceira</Badge>;
    case "teste":
      return (
        <Badge tom={situacao.diasRestantes <= 3 ? "warning" : "info"}>
          Teste: {situacao.diasRestantes} dia{situacao.diasRestantes > 1 ? "s" : ""}, até {dataCurta(situacao.vence)}
        </Badge>
      );
    case "testeVencido":
      return <Badge tom="danger">Teste vencido em {dataCurta(situacao.venceu)}</Badge>;
  }
}
