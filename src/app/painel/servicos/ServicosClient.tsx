"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Plus, Scissors, Archive, ArchiveRestore, Pencil, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { salvarServico, alternarArquivadoServico } from "@/lib/acoes/servicos";
import {
  criarCategoriaServico,
  renomearCategoriaServico,
  excluirCategoriaServico,
  moverCategoriaServico,
} from "@/lib/acoes/categoriasServico";
import type { EstadoAcao } from "@/lib/acoes/agendamentos";
import { Button } from "@/components/ui/Button";
import { Campo, Input, Textarea, Rotulo } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { formatarCentavos, formatarDuracao } from "@/lib/formatadores";

interface ServicoLinha {
  id: string;
  nome: string;
  descricao: string;
  duracaoMin: number;
  precoCentavos: number;
  cor: string;
  ativo: boolean;
  categoriaId: string | null;
  profissionais: { profissionalId: string }[];
}
interface ProfissionalOpcao {
  id: string;
  nome: string;
}
interface CategoriaOpcao {
  id: string;
  nome: string;
  ordem: number;
}

const ESTADO_INICIAL: EstadoAcao = {};

export function ServicosClient({
  servicos,
  profissionais,
  categorias,
}: {
  servicos: ServicoLinha[];
  profissionais: ProfissionalOpcao[];
  categorias: CategoriaOpcao[];
}) {
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<ServicoLinha | null>(null);
  const [estado, acao] = useActionState(salvarServico, ESTADO_INICIAL);

  useEffect(() => {
    if (estado?.sucesso) setModalAberto(false);
  }, [estado]);

  function abrirNovo() {
    setEditando(null);
    setModalAberto(true);
  }
  function abrirEdicao(servico: ServicoLinha) {
    setEditando(servico);
    setModalAberto(true);
  }

  const semCategoria = servicos.filter((s) => !s.categoriaId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-extrabold text-text">Serviços</h1>
        <Button size="sm" onClick={abrirNovo}>
          <Plus size={16} /> Novo
        </Button>
      </header>

      <GerenciarCategorias categorias={categorias} />

      {servicos.length === 0 ? (
        <EstadoVazio
          icone={<Scissors className="mx-auto" />}
          titulo="Nenhum serviço cadastrado"
          descricao="Cadastre os serviços que sua equipe oferece para começar a receber agendamentos."
          acao={<Button onClick={abrirNovo}>Cadastrar primeiro serviço</Button>}
        />
      ) : categorias.length === 0 ? (
        <ul className="space-y-3">
          {servicos.map((servico) => (
            <CartaoServico key={servico.id} servico={servico} aoEditar={abrirEdicao} />
          ))}
        </ul>
      ) : (
        <div className="space-y-5">
          {categorias.map((cat) => {
            const doGrupo = servicos.filter((s) => s.categoriaId === cat.id);
            if (doGrupo.length === 0) return null;
            return (
              <div key={cat.id}>
                <p className="mb-2 text-xs font-semibold tracking-wide text-text-faint uppercase">{cat.nome}</p>
                <ul className="space-y-3">
                  {doGrupo.map((servico) => (
                    <CartaoServico key={servico.id} servico={servico} aoEditar={abrirEdicao} />
                  ))}
                </ul>
              </div>
            );
          })}
          {semCategoria.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-text-faint uppercase">Sem categoria</p>
              <ul className="space-y-3">
                {semCategoria.map((servico) => (
                  <CartaoServico key={servico.id} servico={servico} aoEditar={abrirEdicao} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <Modal aberto={modalAberto} aoFechar={() => setModalAberto(false)} titulo={editando ? "Editar serviço" : "Novo serviço"}>
        <form key={editando?.id ?? "novo"} action={acao} className="space-y-4">
          {editando && <input type="hidden" name="id" value={editando.id} />}
          <Campo rotulo="Nome" htmlFor="nome">
            <Input id="nome" name="nome" required defaultValue={editando?.nome} placeholder="Ex: Corte masculino" />
          </Campo>
          <Campo rotulo="Descrição" htmlFor="descricao">
            <Textarea id="descricao" name="descricao" defaultValue={editando?.descricao} placeholder="Opcional" />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Duração (min)" htmlFor="duracaoMin">
              <Input id="duracaoMin" name="duracaoMin" type="number" min={5} step={5} required defaultValue={editando?.duracaoMin ?? 30} />
            </Campo>
            <Campo rotulo="Preço (R$)" htmlFor="precoReais">
              <Input
                id="precoReais"
                name="precoReais"
                type="number"
                min={0}
                step={0.01}
                required
                defaultValue={editando ? (editando.precoCentavos / 100).toFixed(2) : "0.00"}
              />
            </Campo>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <Rotulo htmlFor="cor">Cor</Rotulo>
              <input
                id="cor"
                name="cor"
                type="color"
                defaultValue={editando?.cor ?? "#3366F0"}
                className="h-11 w-16 rounded-lg border border-border-strong bg-surface"
              />
            </div>
            <label className="flex items-center gap-2 pt-6 text-sm text-text">
              <input type="checkbox" name="ativo" defaultChecked={editando?.ativo ?? true} className="h-4 w-4 rounded" />
              Ativo (visível no link público)
            </label>
          </div>
          {categorias.length > 0 && (
            <Campo rotulo="Categoria" htmlFor="categoriaId">
              <select
                id="categoriaId"
                name="categoriaId"
                defaultValue={editando?.categoriaId ?? ""}
                className="min-h-11 w-full rounded-xl border border-border-strong bg-surface px-3.5 text-[15px] text-text"
              >
                <option value="">Sem categoria</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </Campo>
          )}

          <div>
            <Rotulo>Quem executa este serviço</Rotulo>
            <div className="space-y-1.5">
              {profissionais.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    name="profissionaisIds"
                    value={p.id}
                    defaultChecked={editando ? editando.profissionais.some((sp) => sp.profissionalId === p.id) : true}
                    className="h-4 w-4 rounded"
                  />
                  {p.nome}
                </label>
              ))}
            </div>
          </div>

          {estado?.erro && <p className="text-sm text-danger">{estado.erro}</p>}

          <Button type="submit" className="w-full">
            Salvar
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function CartaoServico({ servico, aoEditar }: { servico: ServicoLinha; aoEditar: (s: ServicoLinha) => void }) {
  return (
    <li className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: servico.cor }} aria-hidden />
          <div className="min-w-0">
            <p className="font-semibold text-text">{servico.nome}</p>
            <p className="text-sm text-text-muted">
              {formatarDuracao(servico.duracaoMin)} · {formatarCentavos(servico.precoCentavos)}
            </p>
            {servico.descricao && <p className="mt-1 text-sm text-text-faint">{servico.descricao}</p>}
            {!servico.ativo && (
              <Badge tom="neutral" className="mt-2">
                Arquivado
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2 border-t border-border pt-3">
        <Button size="sm" variant="secondary" onClick={() => aoEditar(servico)}>
          <Pencil size={14} /> Editar
        </Button>
        <BotaoArquivar servicoId={servico.id} ativo={servico.ativo} />
      </div>
    </li>
  );
}

/** Sem nenhuma categoria criada, essa seção só mostra o campo de "nova categoria" — a lista
 * de serviços continua uma lista simples (nada muda visualmente pra quem não usa isso). */
function GerenciarCategorias({ categorias }: { categorias: CategoriaOpcao[] }) {
  const [novoNome, setNovoNome] = useState("");
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function adicionar() {
    const nome = novoNome.trim();
    if (!nome) return;
    setErro(null);
    iniciar(async () => {
      try {
        await criarCategoriaServico(nome);
        setNovoNome("");
      } catch {
        setErro("Não foi possível criar a categoria.");
      }
    });
  }

  return (
    <div className="mb-4 rounded-2xl border border-border bg-surface p-4">
      <p className="mb-3 text-sm font-medium text-text">
        Categorias <span className="font-normal text-text-faint">(opcional — agrupa os serviços, ex: Aplicação, Manutenção)</span>
      </p>
      {categorias.length > 0 && (
        <ul className="mb-3 space-y-2">
          {categorias.map((cat, i) => (
            <LinhaCategoria key={cat.id} categoria={cat} primeira={i === 0} ultima={i === categorias.length - 1} />
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionar();
            }
          }}
          placeholder="Nova categoria"
          className="min-h-10 flex-1 rounded-xl border border-border-strong bg-surface-2 px-3 text-sm text-text"
        />
        <Button type="button" size="sm" variant="secondary" disabled={pendente || !novoNome.trim()} onClick={adicionar}>
          <Plus size={14} /> Adicionar
        </Button>
      </div>
      {erro && <p className="mt-2 text-xs text-danger">{erro}</p>}
    </div>
  );
}

function LinhaCategoria({
  categoria,
  primeira,
  ultima,
}: {
  categoria: CategoriaOpcao;
  primeira: boolean;
  ultima: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(categoria.nome);
  const [pendente, iniciar] = useTransition();

  function salvarNome() {
    setEditando(false);
    const novo = nome.trim();
    if (!novo || novo === categoria.nome) {
      setNome(categoria.nome);
      return;
    }
    iniciar(() => renomearCategoriaServico(categoria.id, novo));
  }

  return (
    <li className="flex items-center gap-1.5">
      <div className="flex shrink-0 flex-col">
        <button
          type="button"
          disabled={primeira || pendente}
          onClick={() => iniciar(() => moverCategoriaServico(categoria.id, "cima"))}
          className="text-text-faint hover:text-text disabled:opacity-25"
          aria-label="Mover para cima"
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          disabled={ultima || pendente}
          onClick={() => iniciar(() => moverCategoriaServico(categoria.id, "baixo"))}
          className="text-text-faint hover:text-text disabled:opacity-25"
          aria-label="Mover para baixo"
        >
          <ChevronDown size={14} />
        </button>
      </div>
      {editando ? (
        <input
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onBlur={salvarNome}
          onKeyDown={(e) => e.key === "Enter" && salvarNome()}
          className="min-h-9 flex-1 rounded-lg border border-border-strong bg-surface-2 px-2 text-sm text-text"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="min-h-9 flex-1 truncate rounded-lg px-2 text-left text-sm font-medium text-text hover:bg-surface-2"
        >
          {categoria.nome}
        </button>
      )}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pendente}
        onClick={() => iniciar(() => excluirCategoriaServico(categoria.id))}
        aria-label={`Excluir categoria ${categoria.nome}`}
      >
        <Trash2 size={14} />
      </Button>
    </li>
  );
}

function BotaoArquivar({ servicoId, ativo }: { servicoId: string; ativo: boolean }) {
  const [pendente, iniciar] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pendente}
      onClick={() => iniciar(() => alternarArquivadoServico(servicoId, !ativo))}
    >
      {ativo ? <Archive size={14} /> : <ArchiveRestore size={14} />}
      {ativo ? "Arquivar" : "Reativar"}
    </Button>
  );
}
