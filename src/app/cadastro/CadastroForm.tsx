"use client";

import { useActionState, useState } from "react";
import { cadastrarEstabelecimento, type EstadoCadastro } from "@/lib/acoes/cadastro";
import { Button } from "@/components/ui/Button";
import { Campo, Input } from "@/components/ui/Campo";
import { aplicarMascaraTelefone } from "@/lib/formatadores";
import { cn } from "@/lib/cn";

const ESTADO_INICIAL: EstadoCadastro = {};

function paraSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function CadastroForm() {
  const [estado, acao, pendente] = useActionState(cadastrarEstabelecimento, ESTADO_INICIAL);
  const [nomeEstabelecimento, setNomeEstabelecimento] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEditadoManualmente, setSlugEditadoManualmente] = useState(false);
  const [plano, setPlano] = useState<"SOLO" | "EQUIPE">("SOLO");
  const [telefone, setTelefone] = useState("");

  function aoMudarNome(valor: string) {
    setNomeEstabelecimento(valor);
    if (!slugEditadoManualmente) setSlug(paraSlug(valor));
  }

  return (
    <form action={acao} className="space-y-5">
      <Campo rotulo="Nome do seu negócio" htmlFor="nomeEstabelecimento">
        <Input
          id="nomeEstabelecimento"
          name="nomeEstabelecimento"
          required
          placeholder="Ex: Studio da Camila"
          value={nomeEstabelecimento}
          onChange={(e) => aoMudarNome(e.target.value)}
        />
      </Campo>

      <Campo rotulo="Endereço do seu link público" htmlFor="slug">
        <div className="flex items-center gap-1.5 rounded-xl border border-border-strong bg-surface px-3.5 focus-within:outline-2 focus-within:outline-focus-ring">
          <span className="shrink-0 text-sm text-text-faint">veyloagenda.com/</span>
          <input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugEditadoManualmente(true);
              setSlug(paraSlug(e.target.value));
            }}
            placeholder="studio-da-camila"
            className="min-h-11 flex-1 border-0 bg-transparent p-0 text-[15px] text-text outline-none"
          />
        </div>
      </Campo>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-text">Plano</span>
        <div className="grid grid-cols-2 gap-2.5">
          {(
            [
              { valor: "SOLO" as const, titulo: "Solo", desc: "Você atende sozinha." },
              { valor: "EQUIPE" as const, titulo: "Equipe", desc: "Você e outras profissionais." },
            ]
          ).map((op) => (
            <button
              key={op.valor}
              type="button"
              onClick={() => setPlano(op.valor)}
              className={cn(
                "rounded-xl border p-3.5 text-left transition-colors",
                plano === op.valor ? "border-accent bg-surface-2" : "border-border-strong bg-surface",
              )}
            >
              <p className="font-semibold text-text">{op.titulo}</p>
              <p className="text-xs text-text-muted">{op.desc}</p>
            </button>
          ))}
        </div>
        <input type="hidden" name="plano" value={plano} />
      </div>

      <div className="h-px bg-border" />

      <Campo rotulo="Seu nome completo" htmlFor="nomeDono">
        <Input id="nomeDono" name="nomeDono" required placeholder="Como você quer aparecer na agenda" />
      </Campo>
      <Campo rotulo="Seu e-mail" htmlFor="email">
        <Input id="email" name="email" type="email" required placeholder="voce@exemplo.com" />
      </Campo>
      <Campo rotulo="Crie uma senha" htmlFor="senha">
        <Input id="senha" name="senha" type="password" required minLength={6} placeholder="mínimo 6 caracteres" />
      </Campo>
      <Campo rotulo="Telefone" htmlFor="telefone">
        <Input
          id="telefone"
          name="telefone"
          required
          value={telefone}
          onChange={(e) => setTelefone(aplicarMascaraTelefone(e.target.value))}
          placeholder="(81) 91234-5678"
        />
      </Campo>
      <Campo rotulo="Endereço do seu negócio" htmlFor="endereco">
        <Input id="endereco" name="endereco" required placeholder="Rua, número, bairro, cidade" />
      </Campo>

      {estado?.erro && (
        <p role="alert" className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
          {estado.erro}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pendente}>
        {pendente ? "Criando sua conta..." : "Criar minha conta grátis"}
      </Button>
    </form>
  );
}
