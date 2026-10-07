"use client";

import { useState, useTransition } from "react";
import type { FormaPagamento, StatusAgendamento } from "@prisma/client";
import { atualizarStatusAgendamento } from "@/lib/acoes/agendamentos";
import { rotuloForma } from "@/lib/financeiro/fechamento";
import type { FechamentoAgendamento, ServicoDoCatalogo } from "@/lib/financeiro/dadosFechamento";
import { formatarCentavos } from "@/lib/formatadores";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FinalizarAtendimentoModal } from "./FinalizarAtendimentoModal";

export function BotoesStatusAgendamento({
  agendamento,
  servicos,
  compacto = false,
}: {
  agendamento: FechamentoAgendamento;
  servicos: ServicoDoCatalogo[];
  compacto?: boolean;
}) {
  const [pendente, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [janelaAberta, setJanelaAberta] = useState(false);
  const { status } = agendamento;

  function mudar(novoStatus: StatusAgendamento) {
    setErro(null);
    iniciarTransicao(async () => {
      const resultado = await atualizarStatusAgendamento(agendamento.id, novoStatus);
      if (resultado.erro) setErro(resultado.erro);
    });
  }

  const janela = janelaAberta && (
    <FinalizarAtendimentoModal fechamento={agendamento} servicos={servicos} aoFechar={() => setJanelaAberta(false)} />
  );

  if (status === "ATENDIDO") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ResumoPagamento fechamento={agendamento} />
        <Button size="sm" variant="ghost" onClick={() => setJanelaAberta(true)}>
          {agendamento.valorTotalCentavos === null ? "Registrar pagamento" : "Editar pagamento"}
        </Button>
        {janela}
      </div>
    );
  }

  if (status === "CANCELADO" || status === "FALTOU" || status === "AGUARDANDO_CLIENTE") {
    return null;
  }

  return (
    <div>
      <div className={compacto ? "flex flex-wrap gap-1.5" : "flex flex-wrap gap-2"}>
        {status === "PENDENTE" && (
          <Button size="sm" variant="secondary" disabled={pendente} onClick={() => mudar("CONFIRMADO")}>
            Confirmar
          </Button>
        )}
        <Button size="sm" disabled={pendente} onClick={() => setJanelaAberta(true)}>
          Finalizar
        </Button>
        <Button size="sm" variant="outline" disabled={pendente} onClick={() => mudar("FALTOU")}>
          Faltou
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-danger hover:bg-danger-bg"
          disabled={pendente}
          onClick={() => mudar("CANCELADO")}
        >
          Cancelar
        </Button>
      </div>
      {erro && <p className="mt-1.5 text-xs text-danger">{erro}</p>}
      {janela}
    </div>
  );
}

/** Como o atendimento foi pago, em selos: "Pix R$ 60,00", "Fiado: R$ 80,00 a receber". */
export function ResumoPagamento({ fechamento }: { fechamento: Pick<FechamentoAgendamento, "valorTotalCentavos" | "pagamentos"> }) {
  if (fechamento.valorTotalCentavos === null) {
    return <span className="text-xs text-text-faint">Pagamento não registrado</span>;
  }
  if (fechamento.pagamentos.length === 0) {
    return <Badge>Sem cobrança</Badge>;
  }
  const porForma = new Map<FormaPagamento, { total: number; aReceber: number }>();
  for (const p of fechamento.pagamentos) {
    const atual = porForma.get(p.forma) ?? { total: 0, aReceber: 0 };
    atual.total += p.valorCentavos;
    if (!p.recebido) atual.aReceber += p.valorCentavos;
    porForma.set(p.forma, atual);
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {[...porForma].map(([forma, valores]) =>
        forma === "FIADO" ? (
          <Badge key={forma} tom={valores.aReceber > 0 ? "warning" : "success"}>
            {valores.aReceber > 0 ? `Fiado: ${formatarCentavos(valores.aReceber)} a receber` : `Fiado recebido ${formatarCentavos(valores.total)}`}
          </Badge>
        ) : (
          <Badge key={forma} tom="success">
            {rotuloForma(forma)} {formatarCentavos(valores.total)}
          </Badge>
        ),
      )}
    </div>
  );
}
