"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Copy, ExternalLink, PartyPopper } from "lucide-react";
import { esconderGuia, marcarPassoGuia } from "@/lib/acoes/guia";
import type { EstadoAcao } from "@/lib/acoes/agendamentos";
import { PASSOS_GUIA, type DestinoPassoGuia, type IdPassoGuia } from "@/lib/guia/passos";
import { Button, LinkButton } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

interface Props {
  primeiroNome: string;
  feitos: IdPassoGuia[];
  /** Telefone do estabelecimento já com máscara, mostrado no passo do WhatsApp. */
  telefone: string;
  linkPublico: string;
}

/** Quadro "Comece por aqui" no topo da tela Hoje (só para a dona). Os passos feitos vêm do
 * servidor (src/lib/guia); aqui fica só a interação. */
export function GuiaComecePorAqui({ primeiroNome, feitos, telefone, linkPublico }: Props) {
  const router = useRouter();
  const [abertoAMao, setAbertoAMao] = useState<IdPassoGuia | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [pendente, iniciar] = useTransition();

  const feitosSet = new Set(feitos);
  const total = PASSOS_GUIA.length;
  const quantosFeitos = PASSOS_GUIA.filter((passo) => feitosSet.has(passo.id)).length;
  const proximo = PASSOS_GUIA.find((passo) => !feitosSet.has(passo.id))?.id ?? null;
  // O passo aberto à mão vale até ser feito; aí o guia abre sozinho o próximo pendente.
  const aberto = abertoAMao && !feitosSet.has(abertoAMao) ? abertoAMao : proximo;
  const testePendente = !feitosSet.has("teste");

  // O agendamento de teste acontece em outra aba (o link público): ao voltar para esta,
  // atualiza a tela para o passo aparecer como feito.
  useEffect(() => {
    if (!testePendente) return;
    function aoVoltarParaAba() {
      if (document.visibilityState === "visible") router.refresh();
    }
    document.addEventListener("visibilitychange", aoVoltarParaAba);
    return () => document.removeEventListener("visibilitychange", aoVoltarParaAba);
  }, [testePendente, router]);

  function executar(acao: () => Promise<EstadoAcao>) {
    setErro(null);
    iniciar(async () => {
      const resultado = await acao();
      if (resultado.erro) setErro(resultado.erro);
    });
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(linkPublico);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard indisponível: o link aparece escrito logo acima do botão.
    }
  }

  function botaoDestino(destino: DestinoPassoGuia) {
    if (destino.tipo === "tela") {
      return (
        <LinkButton href={destino.href} size="sm">
          {destino.rotulo}
        </LinkButton>
      );
    }
    if (destino.tipo === "link-publico") {
      return (
        <LinkButton href={linkPublico} size="sm" target="_blank" rel="noopener noreferrer" prefetch={false}>
          <ExternalLink size={14} />
          {destino.rotulo}
        </LinkButton>
      );
    }
    return (
      <Button type="button" size="sm" onClick={copiarLink}>
        {copiado ? <Check size={14} /> : <Copy size={14} />}
        {copiado ? "Copiado" : destino.rotulo}
      </Button>
    );
  }

  if (quantosFeitos === total) {
    return (
      <section className="mb-6 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-start gap-3">
          <PartyPopper size={22} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-lg font-bold text-text">Tudo pronto!</h2>
            <p className="text-sm text-text-muted">
              Sua agenda está no ar. Cada agendamento novo aparece aqui na tela Hoje.
            </p>
          </div>
        </div>
        {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}
        <Button type="button" size="sm" className="mt-3" disabled={pendente} onClick={() => executar(esconderGuia)}>
          Fechar guia
        </Button>
      </section>
    );
  }

  return (
    <section aria-labelledby="guia-titulo" className="mb-6 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="guia-titulo" className="font-heading text-lg font-bold text-text">
            Comece por aqui
          </h2>
          <p className="text-sm text-text-muted">
            {primeiroNome ? `${primeiroNome}, siga` : "Siga"} estes passos para deixar sua agenda pronta.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-mr-2 -mt-1"
          disabled={pendente}
          onClick={() => executar(esconderGuia)}
        >
          Esconder
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label="Passos feitos"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={quantosFeitos}
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${(quantosFeitos / total) * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-semibold text-text-muted">
          {quantosFeitos} de {total}
        </span>
      </div>

      <ol className="mt-4 space-y-1">
        {PASSOS_GUIA.map((passo, indice) => {
          const feito = feitosSet.has(passo.id);
          const expandido = passo.id === aberto;

          const marcador = (
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                feito && "bg-success text-white",
                !feito && expandido && "bg-accent text-accent-foreground",
                !feito && !expandido && "border border-border-strong text-text-muted",
              )}
              aria-hidden
            >
              {feito ? <Check size={14} strokeWidth={3} /> : indice + 1}
            </span>
          );

          if (feito) {
            return (
              <li key={passo.id} className="flex items-center gap-3 px-2 py-2">
                {marcador}
                <span className="text-sm text-text-muted">{passo.titulo}</span>
                <span className="sr-only">(feito)</span>
              </li>
            );
          }

          if (!expandido) {
            return (
              <li key={passo.id}>
                <button
                  type="button"
                  onClick={() => setAbertoAMao(passo.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-2"
                >
                  {marcador}
                  <span className="flex-1 text-sm font-medium text-text">{passo.titulo}</span>
                  <ChevronDown size={16} className="shrink-0 text-text-faint" aria-hidden />
                </button>
              </li>
            );
          }

          return (
            <li key={passo.id} className="rounded-xl bg-surface-2 px-2 py-3" aria-current="step">
              <div className="flex items-center gap-3">
                {marcador}
                <span className="text-sm font-semibold text-text">{passo.titulo}</span>
              </div>
              <div className="mt-1.5 pl-9 pr-1">
                <p className="text-sm text-text-muted">{passo.descricao}</p>
                {passo.id === "whatsapp" && (
                  <p className="mt-2 text-sm text-text">
                    Número atual: <strong>{telefone}</strong>
                  </p>
                )}
                {passo.id === "divulgar" && (
                  <p className="mt-2 break-all rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text">
                    {linkPublico}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {botaoDestino(passo.destino)}
                  {passo.marcarComo && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={pendente}
                      onClick={() => executar(() => marcarPassoGuia(passo.id))}
                    >
                      {passo.marcarComo}
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}
      <p className="mt-3 text-xs text-text-faint">Se esconder o guia, dá para ver de novo em Configurações.</p>
    </section>
  );
}
