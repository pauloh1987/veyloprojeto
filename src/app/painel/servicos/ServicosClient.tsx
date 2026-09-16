"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Plus, Scissors, Archive, ArchiveRestore, Pencil } from "lucide-react";
import { salvarServico, alternarArquivadoServico } from "@/lib/acoes/servicos";
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
  profissionais: { profissionalId: string }[];
}
interface ProfissionalOpcao {
  id: string;
  nome: string;
}

const ESTADO_INICIAL: EstadoAcao = {};

export function ServicosClient({
  servicos,
  profissionais,
}: {
  servicos: ServicoLinha[];
  profissionais: ProfissionalOpcao[];
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-extrabold text-text">Serviços</h1>
        <Button size="sm" onClick={abrirNovo}>
          <Plus size={16} /> Novo
        </Button>
      </header>

      {servicos.length === 0 ? (
        <EstadoVazio
          icone={<Scissors className="mx-auto" />}
          titulo="Nenhum serviço cadastrado"
          descricao="Cadastre os serviços que sua equipe oferece para começar a receber agendamentos."
          acao={<Button onClick={abrirNovo}>Cadastrar primeiro serviço</Button>}
        />
      ) : (
        <ul className="space-y-3">
          {servicos.map((servico) => (
            <li key={servico.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className="mt-1 h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: servico.cor }}
                    aria-hidden
                  />
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
                <Button size="sm" variant="secondary" onClick={() => abrirEdicao(servico)}>
                  <Pencil size={14} /> Editar
                </Button>
                <BotaoArquivar servicoId={servico.id} ativo={servico.ativo} />
              </div>
            </li>
          ))}
        </ul>
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
