import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { obterEstabelecimentoPorSlug } from "@/lib/estabelecimentoPublico";
import { db } from "@/lib/db";
import { iniciais } from "@/lib/formatadores";
import { cn } from "@/lib/cn";
import { AgendamentoPublicoFlow } from "./AgendamentoPublicoFlow";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const estabelecimento = await obterEstabelecimentoPorSlug(slug);
  return { title: estabelecimento ? `Agendar · ${estabelecimento.nome}` : "Não encontrado" };
}

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

  return (
    <main
      className="min-h-screen bg-bg pb-16"
      style={{ ["--accent" as string]: estabelecimento.corDestaque }}
    >
      <div
        className={cn("px-4 pb-8 pt-10 text-center", estabelecimento.foto ? "bg-surface" : "text-white")}
        style={
          estabelecimento.foto
            ? undefined
            : { background: `linear-gradient(160deg, ${estabelecimento.corDestaque}, color-mix(in oklab, ${estabelecimento.corDestaque} 60%, black))` }
        }
      >
        {estabelecimento.foto ? (
          // Fundo do cartão é escolhido pela dona em Configurações (padrão branco, já que a
          // maioria das logos é desenhada para fundo branco puro) — sem essa moldura, uma
          // logo clara se perde dentro do próprio fundo do cabeçalho por falta de contorno.
          <div
            className="mx-auto flex w-fit rounded-2xl border border-border p-3 shadow-sm"
            style={{ backgroundColor: estabelecimento.logoFundo }}
          >
            <img
              src={estabelecimento.foto}
              alt={estabelecimento.nome}
              className="max-h-28 max-w-[300px] object-contain"
            />
          </div>
        ) : (
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 font-heading text-xl font-extrabold backdrop-blur">
            {iniciais(estabelecimento.nome)}
          </div>
        )}
        <h1 className={cn("mt-3 font-heading text-2xl font-extrabold", estabelecimento.foto && "text-text")}>
          {estabelecimento.nome}
        </h1>
        <p className={cn("mt-1 flex items-center justify-center gap-1.5 text-sm", estabelecimento.foto ? "text-text-muted" : "text-white/80")}>
          <MapPin size={14} /> {estabelecimento.endereco}
        </p>
      </div>

      <div className="mx-auto -mt-4 max-w-md rounded-t-3xl bg-bg px-4 pt-6">
        <AgendamentoPublicoFlow
          estabelecimento={{ id: estabelecimento.id, nome: estabelecimento.nome, slug: estabelecimento.slug, fuso: estabelecimento.fuso }}
          servicos={servicos.map((s) => ({
            id: s.id,
            nome: s.nome,
            descricao: s.descricao,
            duracaoMin: s.duracaoMin,
            precoCentavos: s.precoCentavos,
            cor: s.cor,
            categoriaId: s.categoriaId,
            profissionaisIds: s.profissionais.map((sp) => sp.profissionalId),
          }))}
          profissionais={profissionais.map((p) => ({ id: p.id, nome: p.nome, foto: p.foto }))}
          categorias={categorias.map((c) => ({ id: c.id, nome: c.nome }))}
        />
        <p className="pb-4 pt-8 text-center text-xs text-text-faint">
          <Link href="/privacidade" className="hover:text-text-muted">
            Política de Privacidade
          </Link>
        </p>
      </div>
    </main>
  );
}
