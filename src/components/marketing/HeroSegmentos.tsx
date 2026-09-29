"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Celular, NotificacaoWhatsApp, SEGMENTOS_DEMO, TelaLinkPublico } from "./Mockups";

const INTERVALO_MS = 4500;

/** Celular do hero com o link público de exemplo, alternando entre tipos de negócio
 * (barbearia, esmalteria, salão, sobrancelhas) para quem chega no site ver o seu caso logo de
 * cara. Roda sozinho até a pessoa escolher um tipo; com "reduzir movimento" ligado no
 * sistema, não alterna sozinho. */
export function HeroSegmentos() {
  const [indice, setIndice] = useState(0);
  const [automatico, setAutomatico] = useState(true);
  // O primeiro exemplo aparece pronto, sem animação: se o navegador pausar animações (aba em
  // segundo plano, economia de bateria), ele não pode ficar preso no quadro inicial, invisível.
  const [animar, setAnimar] = useState(false);

  useEffect(() => {
    if (!automatico) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setAnimar(true);
      setIndice((i) => (i + 1) % SEGMENTOS_DEMO.length);
    }, INTERVALO_MS);
    return () => window.clearInterval(id);
  }, [automatico]);

  const segmento = SEGMENTOS_DEMO[indice];

  return (
    <div className="relative mx-auto w-full max-w-sm lg:max-w-md">
      <div role="tablist" aria-label="Exemplos por tipo de negócio" className="mb-5 flex flex-wrap justify-center gap-1.5">
        {SEGMENTOS_DEMO.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            id={`aba-${s.id}`}
            aria-selected={i === indice}
            aria-controls="exemplo-link"
            onClick={() => {
              setAnimar(true);
              setIndice(i);
              setAutomatico(false);
            }}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
              i === indice
                ? "border-white bg-white text-veylo-navy-950"
                : "border-white/15 bg-white/5 text-white/70 hover:text-white",
            )}
          >
            {s.rotulo}
          </button>
        ))}
      </div>
      <div id="exemplo-link" role="tabpanel" aria-labelledby={`aba-${segmento.id}`} className="relative pb-10">
        <Celular>
          <div key={segmento.id} className={animar ? "veylo-fade-in" : undefined}>
            <TelaLinkPublico segmento={segmento} />
          </div>
        </Celular>
        <div
          key={`whatsapp-${segmento.id}`}
          className={cn("absolute -right-2 bottom-0 sm:-right-8", animar && "veylo-fade-in")}
        >
          <NotificacaoWhatsApp segmento={segmento} />
        </div>
      </div>
    </div>
  );
}
