"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { excluirCusto, salvarCusto } from "@/lib/acoes/admin";
import type { CustoAdmin } from "@/lib/admin/dados";
import { CATEGORIAS_CUSTO, FREQUENCIAS_CUSTO, formatarReais, type MoedaCusto } from "@/lib/admin/financeiro";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Campo, Input, Select, Textarea } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";

function formatarMoeda(valor: number, moeda: MoedaCusto): string {
  const casas = valor > 0 && valor < 1 ? 3 : 2;
  return valor.toLocaleString("pt-BR", { style: "currency", currency: moeda, minimumFractionDigits: casas, maximumFractionDigits: casas });
}

const SUFIXO_FREQUENCIA = { MENSAL: "por mês", ANUAL: "por ano", POR_MENSAGEM: "por mensagem" } as const;

export function CustosClient({
  custos,
  custoMensal,
  mensagensWhatsApp30d,
}: {
  custos: CustoAdmin[];
  custoMensal: number;
  mensagensWhatsApp30d: number;
}) {
  const [editando, setEditando] = useState<CustoAdmin | "novo" | null>(null);

  return (
    <section aria-labelledby="titulo-custos" className="rounded-2xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:px-5">
        <div>
          <h2 id="titulo-custos" className="font-heading text-lg font-bold text-text">
            Custos
          </h2>
          <p className="text-xs text-text-muted">
            Total por mês: <strong className="text-text">{formatarReais(custoMensal)}</strong>. Toque num custo para editar.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setEditando("novo")}>
          <Plus size={16} aria-hidden /> Adicionar custo
        </Button>
      </div>

      {custos.length === 0 ? (
        <p className="p-5 text-sm text-text-muted">Nenhum custo cadastrado.</p>
      ) : (
        <ul className="divide-y divide-border">
          {custos.map((custo) => (
            <li key={custo.id}>
              <button
                type="button"
                onClick={() => setEditando(custo)}
                className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left hover:bg-surface-2 sm:px-5"
              >
                <div className="min-w-0">
                  <p className={cn("text-sm font-semibold", custo.ativo ? "text-text" : "text-text-faint line-through")}>{custo.nome}</p>
                  <p className="text-xs text-text-muted">
                    {formatarMoeda(custo.valor, custo.moeda)} {SUFIXO_FREQUENCIA[custo.frequencia]}
                    {custo.categoria && ` · ${custo.categoria}`}
                    {!custo.ativo && " · desativado"}
                  </p>
                  {custo.frequencia === "POR_MENSAGEM" && custo.ativo && (
                    <p className="text-xs text-text-faint">
                      × {mensagensWhatsApp30d} mensage{mensagensWhatsApp30d === 1 ? "m" : "ns"} nos últimos 30 dias
                    </p>
                  )}
                  {custo.observacao && <p className="mt-0.5 text-xs text-text-faint">{custo.observacao}</p>}
                </div>
                <span className="shrink-0 text-sm font-bold text-text">
                  {formatarReais(custo.mensalEmReais)}
                  <span className="font-normal text-text-faint">/mês</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal aberto={editando !== null} aoFechar={() => setEditando(null)} titulo={editando === "novo" ? "Novo custo" : "Editar custo"}>
        {editando !== null && (
          <FormularioCusto
            key={editando === "novo" ? "novo" : editando.id}
            custo={editando === "novo" ? null : editando}
            aoTerminar={() => setEditando(null)}
          />
        )}
      </Modal>
    </section>
  );
}

function FormularioCusto({ custo, aoTerminar }: { custo: CustoAdmin | null; aoTerminar: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const categorias = custo?.categoria && !CATEGORIAS_CUSTO.includes(custo.categoria) ? [...CATEGORIAS_CUSTO, custo.categoria] : CATEGORIAS_CUSTO;

  // onSubmit (e não <form action>) para o React não limpar o formulário quando o servidor
  // devolve um erro de validação.
  function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formData = new FormData(evento.currentTarget);
    setErro(null);
    iniciar(async () => {
      const resultado = await salvarCusto({}, formData);
      if (resultado.erro) setErro(resultado.erro);
      else aoTerminar();
    });
  }

  function excluir() {
    if (!custo || !window.confirm(`Excluir o custo "${custo.nome}"?`)) return;
    setErro(null);
    iniciar(async () => {
      const resultado = await excluirCusto(custo.id);
      if (resultado.erro) setErro(resultado.erro);
      else aoTerminar();
    });
  }

  return (
    <form onSubmit={aoEnviar} className="space-y-3" noValidate>
      <input type="hidden" name="id" value={custo?.id ?? ""} />
      <Campo rotulo="Nome" htmlFor="custo-nome">
        <Input id="custo-nome" name="nome" required placeholder="Ex.: Canva" defaultValue={custo?.nome} />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Valor" htmlFor="custo-valor">
          <Input
            id="custo-valor"
            name="valor"
            inputMode="decimal"
            required
            placeholder="0,00"
            defaultValue={custo ? custo.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : ""}
          />
        </Campo>
        <Campo rotulo="Moeda" htmlFor="custo-moeda">
          <Select id="custo-moeda" name="moeda" defaultValue={custo?.moeda ?? "BRL"}>
            <option value="BRL">Real (R$)</option>
            <option value="USD">Dólar (US$)</option>
          </Select>
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Cobrança" htmlFor="custo-frequencia">
          <Select id="custo-frequencia" name="frequencia" defaultValue={custo?.frequencia ?? "MENSAL"}>
            {FREQUENCIAS_CUSTO.map((frequencia) => (
              <option key={frequencia.id} value={frequencia.id}>
                {frequencia.rotulo}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo rotulo="Categoria" htmlFor="custo-categoria">
          <Select id="custo-categoria" name="categoria" defaultValue={custo?.categoria ?? "Infraestrutura"}>
            {categorias.map((categoria) => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
          </Select>
        </Campo>
      </div>
      <Campo rotulo="Observação" htmlFor="custo-observacao">
        <Textarea id="custo-observacao" name="observacao" rows={2} defaultValue={custo?.observacao} placeholder="Plano, limite grátis, data de renovação..." />
      </Campo>
      <label className="flex items-center gap-2.5 text-sm text-text">
        <input type="checkbox" name="ativo" defaultChecked={custo?.ativo ?? true} className="h-4 w-4 rounded" />
        Conta no total do mês
      </label>
      {erro && (
        <p role="alert" className="text-sm text-danger">
          {erro}
        </p>
      )}
      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variant="ghost" onClick={aoTerminar}>
          Cancelar
        </Button>
        {custo && (
          <Button type="button" variant="ghost" className="ml-auto text-danger hover:text-danger" disabled={pendente} onClick={excluir}>
            Excluir
          </Button>
        )}
      </div>
    </form>
  );
}
