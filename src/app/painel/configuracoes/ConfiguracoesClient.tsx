"use client";

import { useActionState, useState } from "react";
import { Check, Copy } from "lucide-react";
import { salvarConfiguracoes } from "@/lib/acoes/configuracoes";
import type { EstadoAcao } from "@/lib/acoes/agendamentos";
import { Button } from "@/components/ui/Button";
import { Campo, Input, Rotulo } from "@/components/ui/Campo";

const ESTADO_INICIAL: EstadoAcao = {};

export function ConfiguracoesClient({
  estabelecimento,
  linkPublico,
}: {
  estabelecimento: {
    nome: string;
    telefone: string;
    endereco: string;
    corDestaque: string;
    antecedenciaMinMin: number;
    plano: string;
  };
  linkPublico: string;
}) {
  const [estado, acao] = useActionState(salvarConfiguracoes, ESTADO_INICIAL);
  const [copiado, setCopiado] = useState(false);

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(linkPublico);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard indisponível — o link já está selecionável no campo.
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-text">Configurações</h1>
        <p className="text-sm text-text-muted">Plano atual: {estabelecimento.plano === "EQUIPE" ? "Equipe" : "Solo"}</p>
      </header>

      <div className="mb-6 rounded-2xl border border-border bg-surface p-4">
        <Rotulo htmlFor="link-publico">Link público de agendamento</Rotulo>
        <div className="flex gap-2">
          <input
            id="link-publico"
            readOnly
            value={linkPublico}
            className="min-h-11 flex-1 rounded-xl border border-border-strong bg-surface-2 px-3.5 text-sm text-text"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button type="button" variant="secondary" onClick={copiarLink}>
            {copiado ? <Check size={16} /> : <Copy size={16} />}
            {copiado ? "Copiado" : "Copiar"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-text-faint">Compartilhe esse link no Instagram, WhatsApp ou onde preferir.</p>
      </div>

      <form action={acao} className="space-y-4 rounded-2xl border border-border bg-surface p-4">
        <Campo rotulo="Nome do estabelecimento" htmlFor="nome">
          <Input id="nome" name="nome" required defaultValue={estabelecimento.nome} />
        </Campo>
        <Campo rotulo="Telefone" htmlFor="telefone">
          <Input id="telefone" name="telefone" required defaultValue={estabelecimento.telefone} />
        </Campo>
        <Campo rotulo="Endereço" htmlFor="endereco">
          <Input id="endereco" name="endereco" required defaultValue={estabelecimento.endereco} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Rotulo htmlFor="corDestaque">Cor de destaque</Rotulo>
            <input
              id="corDestaque"
              name="corDestaque"
              type="color"
              defaultValue={estabelecimento.corDestaque}
              className="h-11 w-full rounded-lg border border-border-strong bg-surface"
            />
          </div>
          <Campo rotulo="Antecedência mínima (min)" htmlFor="antecedenciaMinMin">
            <Input
              id="antecedenciaMinMin"
              name="antecedenciaMinMin"
              type="number"
              min={0}
              step={15}
              required
              defaultValue={estabelecimento.antecedenciaMinMin}
            />
          </Campo>
        </div>

        {estado?.erro && <p className="text-sm text-danger">{estado.erro}</p>}
        {estado?.sucesso && <p className="text-sm text-success">Configurações salvas.</p>}

        <Button type="submit">Salvar alterações</Button>
      </form>
    </div>
  );
}
