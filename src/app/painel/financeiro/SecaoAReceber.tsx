import Link from "next/link";
import { Clock, MessageCircle, Wallet } from "lucide-react";
import type { DadosFinanceiro } from "@/lib/financeiro/dadosFinanceiro";
import { textoCobrancaFiado, type FiadoDoCliente } from "@/lib/financeiro/resumoFinanceiro";
import { formatarCentavos } from "@/lib/formatadores";
import { linkWhatsApp } from "@/lib/mensagens/textos";
import { paraDataYMD } from "@/lib/tz";
import { Badge } from "@/components/ui/Badge";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { BotaoReceberFiado, BotaoReceberTudo } from "./FinanceiroClient";
import { CabecalhoSecao } from "./CabecalhoSecao";
import { diaEMes, diasAte, haQuantoTempo } from "./formatos";

const CLASSE_BOTAO_WHATSAPP =
  "inline-flex h-9 items-center gap-1.5 rounded-xl border border-border-strong px-3 text-sm font-semibold text-text hover:bg-surface-2";

/** Fiado em aberto de todos os meses, por cliente: receber (tudo ou um atendimento) e cobrar. */
export function SecaoAReceber({
  aReceber,
  fuso,
  hojeYMD,
  temEquipe,
}: {
  aReceber: DadosFinanceiro["aReceber"];
  fuso: string;
  hojeYMD: string;
  temEquipe: boolean;
}) {
  return (
    <section id="a-receber" aria-labelledby="titulo-a-receber" className="scroll-mt-6">
      <CabecalhoSecao
        id="titulo-a-receber"
        titulo="A receber"
        descricao="Atendimentos marcados como Pagar depois, de todos os meses. Quem deve há mais tempo aparece primeiro."
        total={aReceber.totalCentavos > 0 ? formatarCentavos(aReceber.totalCentavos) : null}
      />
      {aReceber.porCliente.length === 0 ? (
        <EstadoVazio
          icone={<Wallet className="mx-auto" />}
          titulo="Nada a receber"
          descricao="Quando um atendimento for finalizado como Pagar depois, o valor aparece aqui até você marcar como pago."
        />
      ) : (
        <ul className="space-y-3">
          {aReceber.porCliente.map((fiado) => (
            <CartaoFiado key={fiado.clienteId} fiado={fiado} fuso={fuso} hojeYMD={hojeYMD} temEquipe={temEquipe} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Há quanto tempo a cliente deve: depois de 15 dias em amarelo e depois de 30 em vermelho, sempre
 * com o texto (a cor não fala sozinha). */
function IdadeDoFiado({ dias }: { dias: number }) {
  // Atendimento com data futura (finalizado adiantado): ainda não há idade para mostrar.
  if (dias < 0) return null;
  const texto = haQuantoTempo(dias);
  if (dias <= 15) return <span>{texto}</span>;
  return (
    <Badge tom={dias > 30 ? "danger" : "warning"} className="px-2 py-0.5">
      <Clock size={11} aria-hidden /> {texto}
    </Badge>
  );
}

function CartaoFiado({ fiado, fuso, hojeYMD, temEquipe }: { fiado: FiadoDoCliente; fuso: string; hojeYMD: string; temEquipe: boolean }) {
  const varios = fiado.itens.length > 1;
  const [primeiro] = fiado.itens;
  const dataDoItem = (inicio: Date) => diaEMes(paraDataYMD(inicio, fuso));

  return (
    <li id={`cliente-${fiado.clienteId}`} className="scroll-mt-6 rounded-2xl border border-border bg-surface target:ring-2 target:ring-grafico-1">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <Link href={`/painel/clientes/${fiado.clienteId}`} className="font-semibold text-text hover:underline">
            {fiado.nome}
          </Link>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
            <span>
              {varios
                ? `${fiado.itens.length} atendimentos, desde ${dataDoItem(fiado.desde)}`
                : `${primeiro.servicoNome} · ${dataDoItem(primeiro.inicio)}${temEquipe ? ` · ${primeiro.profissionalNome}` : ""}`}
            </span>
            <IdadeDoFiado dias={diasAte(fiado.desde, hojeYMD, fuso)} />
          </p>
        </div>
        <p className="shrink-0 font-heading text-lg font-bold text-text">{formatarCentavos(fiado.totalCentavos)}</p>
      </div>

      {varios && (
        <ul className="divide-y divide-border border-t border-border">
          {fiado.itens.map((item) => (
            <li key={item.pagamentoId} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm text-text">{item.servicoNome}</p>
                <p className="text-xs text-text-faint">
                  {dataDoItem(item.inicio)}
                  {temEquipe && ` · ${item.profissionalNome}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-semibold text-text tabular-nums">{formatarCentavos(item.valorCentavos)}</span>
                <BotaoReceberFiado pagamentoId={item.pagamentoId} valorCentavos={item.valorCentavos} clienteNome={fiado.nome} discreto />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
        {varios ? (
          <BotaoReceberTudo
            pagamentoIds={fiado.itens.map((item) => item.pagamentoId)}
            totalCentavos={fiado.totalCentavos}
            clienteNome={fiado.nome}
          />
        ) : (
          <BotaoReceberFiado pagamentoId={primeiro.pagamentoId} valorCentavos={primeiro.valorCentavos} clienteNome={fiado.nome} />
        )}
        <a href={linkWhatsApp(fiado.telefone, textoCobrancaFiado(fiado, fuso))} target="_blank" rel="noopener noreferrer" className={CLASSE_BOTAO_WHATSAPP}>
          <MessageCircle size={15} /> Cobrar no WhatsApp
        </a>
      </div>
    </li>
  );
}
