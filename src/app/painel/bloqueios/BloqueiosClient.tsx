"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { Plus, Trash2, Ban } from "lucide-react";
import { criarBloqueio, removerBloqueio } from "@/lib/acoes/bloqueios";
import type { EstadoAcao } from "@/lib/acoes/agendamentos";
import { Button } from "@/components/ui/Button";
import { Campo, Input, Select } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";
import { EstadoVazio } from "@/components/ui/EstadoVazio";

interface BloqueioLinha {
  id: string;
  inicio: string; // ISO
  fim: string; // ISO
  motivo: string;
  profissional: { id: string; nome: string };
}
interface ProfissionalOpcao {
  id: string;
  nome: string;
}

const ESTADO_INICIAL: EstadoAcao = {};
const MOTIVOS_SUGERIDOS = ["Folga", "Almoço", "Compromisso", "Curso", "Outro"];

export function BloqueiosClient({
  bloqueios,
  profissionais,
  fuso,
  mostrarSeletorProfissional,
}: {
  bloqueios: BloqueioLinha[];
  profissionais: ProfissionalOpcao[];
  fuso: string;
  mostrarSeletorProfissional: boolean;
}) {
  const [modalAberto, setModalAberto] = useState(false);
  const [estado, acao] = useActionState(criarBloqueio, ESTADO_INICIAL);

  useEffect(() => {
    if (estado?.sucesso) setModalAberto(false);
  }, [estado]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-text">Bloqueios</h1>
          <p className="text-sm text-text-muted">Períodos indisponíveis para agendamento.</p>
        </div>
        <Button size="sm" onClick={() => setModalAberto(true)}>
          <Plus size={16} /> Novo
        </Button>
      </header>

      {bloqueios.length === 0 ? (
        <EstadoVazio
          icone={<Ban className="mx-auto" />}
          titulo="Nenhum bloqueio cadastrado"
          descricao="Crie um bloqueio para folgas, compromissos ou qualquer período fora da agenda."
          acao={<Button onClick={() => setModalAberto(true)}>Criar bloqueio</Button>}
        />
      ) : (
        <ul className="space-y-3">
          {bloqueios.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
              <div className="min-w-0">
                <p className="font-semibold text-text">{b.motivo}</p>
                <p className="text-sm text-text-muted">
                  {formatInTimeZone(new Date(b.inicio), fuso, "d 'de' MMMM, HH:mm", { locale: ptBR })} –{" "}
                  {formatInTimeZone(new Date(b.fim), fuso, "HH:mm")}
                </p>
                {mostrarSeletorProfissional && <p className="text-xs text-text-faint">{b.profissional.nome}</p>}
              </div>
              <BotaoRemover id={b.id} />
            </li>
          ))}
        </ul>
      )}

      <Modal aberto={modalAberto} aoFechar={() => setModalAberto(false)} titulo="Novo bloqueio">
        <form action={acao} className="space-y-4">
          {mostrarSeletorProfissional && (
            <Campo rotulo="Profissional" htmlFor="profissionalId">
              <Select id="profissionalId" name="profissionalId" required defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                {profissionais.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </Select>
            </Campo>
          )}
          {!mostrarSeletorProfissional && profissionais[0] && (
            <input type="hidden" name="profissionalId" value={profissionais[0].id} />
          )}
          <Campo rotulo="Data" htmlFor="data">
            <Input id="data" name="data" type="date" required />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Início" htmlFor="horaInicio">
              <Input id="horaInicio" name="horaInicio" type="time" required />
            </Campo>
            <Campo rotulo="Fim" htmlFor="horaFim">
              <Input id="horaFim" name="horaFim" type="time" required />
            </Campo>
          </div>
          <Campo rotulo="Motivo" htmlFor="motivo">
            <Input id="motivo" name="motivo" list="motivos-sugeridos" required placeholder="Ex: Folga" />
            <datalist id="motivos-sugeridos">
              {MOTIVOS_SUGERIDOS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Campo>

          {estado?.erro && <p className="text-sm text-danger">{estado.erro}</p>}

          <Button type="submit" className="w-full">
            Criar bloqueio
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function BotaoRemover({ id }: { id: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <button
      type="button"
      aria-label="Remover bloqueio"
      disabled={pendente}
      onClick={() => {
        if (confirm("Remover este bloqueio?")) iniciar(() => removerBloqueio(id));
      }}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-faint hover:bg-danger-bg hover:text-danger"
    >
      <Trash2 size={16} />
    </button>
  );
}
