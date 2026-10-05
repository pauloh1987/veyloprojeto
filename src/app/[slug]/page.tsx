import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Bell, CalendarCheck, MapPin, MessageCircle } from "lucide-react";
import { obterEstabelecimentoPorSlug } from "@/lib/estabelecimentoPublico";
import { db } from "@/lib/db";
import { iniciais } from "@/lib/formatadores";
import { variaveisDaMarca } from "@/lib/cores";
import { linkWhatsApp } from "@/lib/mensagens/textos";
import { cn } from "@/lib/cn";
import { AgendamentoPublicoFlow } from "./AgendamentoPublicoFlow";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const estabelecimento = await obterEstabelecimentoPorSlug(slug);
  if (!estabelecimento) return { title: "Não encontrado" };
  const descricao =
    estabelecimento.apresentacao || `Agende seu horário com ${estabelecimento.nome} pelo celular, em poucos toques.`;
  return {
    title: `Agendar · ${estabelecimento.nome}`,
    description: descricao,
    openGraph: {
      title: `Agende com ${estabelecimento.nome}`,
      description: descricao,
      siteName: "Veylo Agenda",
      locale: "pt_BR",
      type: "website",
    },
  };
}

/** Capa do topo na cor do salão: degradê com brilhos suaves e uma trama de pontos. */
function fundoCapa(cor: string): string {
  return [
    "radial-gradient(rgb(255 255 255 / 0.16) 1px, transparent 1.5px) 0 0 / 14px 14px",
    "radial-gradient(160px 160px at 88% 0%, rgb(255 255 255 / 0.28), transparent 70%)",
    "radial-gradient(140px 140px at 8% 100%, rgb(0 0 0 / 0.14), transparent 70%)",
    `linear-gradient(135deg, color-mix(in oklab, ${cor} 72%, white), ${cor} 55%, color-mix(in oklab, ${cor} 82%, black))`,
  ].join(", ");
}

const SOMBRA_CARTAO = "shadow-[0_12px_32px_-16px_rgb(16_21_31/0.22)]";

export default async function PaginaPublicaEstabelecimento({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const estabelecimento = await obterEstabelecimentoPorSlug(slug);
  if (!estabelecimento) notFound();

  const [servicos, profissionais, categorias] = await Promise.all([
    db.servico.findMany({
      where: { estabelecimentoId: estabelecimento.id, ativo: true },
      include: { profissionais: { select: { profissionalId: true } } },
      orderBy: { nome: "asc" },
    }),
    db.profissional.findMany({
      where: { estabelecimentoId: estabelecimento.id, ativo: true },
      orderBy: { nome: "asc" },
    }),
    db.categoriaServico.findMany({
      where: { estabelecimentoId: estabelecimento.id },
      orderBy: { ordem: "asc" },
    }),
  ]);

  const linkMapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(estabelecimento.endereco)}`;
  const linkInstagram = estabelecimento.instagram ? `https://instagram.com/${estabelecimento.instagram}` : null;

  return (
    <main
      className="tema-claro min-h-screen bg-[color:color-mix(in_oklab,var(--accent)_7%,var(--bg))] px-3 pt-3 pb-10 sm:pt-8"
      style={variaveisDaMarca(estabelecimento.corDestaque)}
    >
      <div className="mx-auto max-w-md space-y-3">
        <section className={cn("overflow-hidden rounded-[28px] border border-border bg-surface", SOMBRA_CARTAO)}>
          <div className="h-28" style={{ background: fundoCapa(estabelecimento.corDestaque) }} aria-hidden />
          <div className="-mt-14 px-5 pb-6 text-center">
            {estabelecimento.foto ? (
              // Fundo do cartão é escolhido pela dona em Configurações (padrão branco, já que a
              // maioria das logos é desenhada para fundo branco puro).
              <div
                className="mx-auto flex h-28 w-fit max-w-[260px] min-w-28 items-center justify-center rounded-[26px] p-3 shadow-lg ring-4 ring-surface"
                style={{ backgroundColor: estabelecimento.logoFundo }}
              >
                <img src={estabelecimento.foto} alt={estabelecimento.nome} className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-accent font-heading text-3xl font-extrabold text-accent-foreground shadow-lg ring-4 ring-surface">
                {iniciais(estabelecimento.nome)}
              </div>
            )}

            <p className="mt-4 text-[11px] font-bold tracking-[0.28em] text-[color:var(--destaque-texto)] uppercase">
              Agendamento online
            </p>
            <h1 className="mt-1 font-heading text-[26px] leading-tight font-extrabold text-balance text-text">
              {estabelecimento.nome}
            </h1>
            {estabelecimento.apresentacao && (
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-pretty text-text-muted">
                {estabelecimento.apresentacao}
              </p>
            )}

            <div className={cn("mt-5 grid gap-2", linkInstagram ? "grid-cols-3" : "grid-cols-2")}>
              <AtalhoTopo href={linkWhatsApp(estabelecimento.telefone)} rotulo="WhatsApp">
                <MessageCircle size={19} />
              </AtalhoTopo>
              {linkInstagram && (
                <AtalhoTopo href={linkInstagram} rotulo="Instagram">
                  <IconeInstagram />
                </AtalhoTopo>
              )}
              <AtalhoTopo href={linkMapa} rotulo="Como chegar">
                <MapPin size={19} />
              </AtalhoTopo>
            </div>
            <p className="mt-3 text-xs text-text-faint">{estabelecimento.endereco}</p>

            {estabelecimento.avisoAgendamento && (
              <div className="mt-5 flex gap-3 rounded-2xl border border-[color:color-mix(in_oklab,var(--accent)_25%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_7%,var(--surface))] p-4 text-left">
                <Bell size={16} className="mt-0.5 shrink-0 text-[color:var(--destaque-texto)]" aria-hidden />
                <p className="text-[13px] leading-relaxed whitespace-pre-line text-text-muted">
                  {estabelecimento.avisoAgendamento}
                </p>
              </div>
            )}

            <a
              href="#agendar"
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent font-semibold text-accent-foreground shadow-sm transition hover:brightness-105 active:scale-[0.99]"
            >
              <CalendarCheck size={18} aria-hidden /> Agendar horário
            </a>
          </div>
        </section>

        <section id="agendar" className={cn("scroll-mt-3 rounded-[28px] border border-border bg-surface p-4 sm:p-5", SOMBRA_CARTAO)}>
          <AgendamentoPublicoFlow
            estabelecimento={{ id: estabelecimento.id, nome: estabelecimento.nome, slug: estabelecimento.slug, fuso: estabelecimento.fuso }}
            servicos={servicos.map((s) => ({
              id: s.id,
              nome: s.nome,
              descricao: s.descricao,
              duracaoMin: s.duracaoMin,
              precoCentavos: s.precoCentavos,
              cor: s.cor,
              foto: s.foto,
              categoriaId: s.categoriaId,
              profissionaisIds: s.profissionais.map((sp) => sp.profissionalId),
            }))}
            profissionais={profissionais.map((p) => ({ id: p.id, nome: p.nome, foto: p.foto }))}
            categorias={categorias.map((c) => ({ id: c.id, nome: c.nome }))}
          />
        </section>

        <p className="pt-3 text-center text-xs text-text-faint">
          <Link href="/privacidade" className="hover:text-text-muted">
            Política de Privacidade
          </Link>
          <span aria-hidden> · </span>
          <Link href="/" className="hover:text-text-muted">
            Agendamento por Veylo Agenda
          </Link>
        </p>
      </div>
    </main>
  );
}

function AtalhoTopo({ href, rotulo, children }: { href: string; rotulo: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-surface px-1 py-2.5 text-xs font-semibold whitespace-nowrap text-text transition hover:border-[color:color-mix(in_oklab,var(--accent)_45%,var(--border))] hover:bg-[color:color-mix(in_oklab,var(--accent)_6%,var(--surface))] active:scale-[0.98]"
    >
      <span className="text-[color:var(--destaque-texto)]" aria-hidden>
        {children}
      </span>
      {rotulo}
    </a>
  );
}

/** Ícone do Instagram (o pacote de ícones não traz marcas). */
function IconeInstagram() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
