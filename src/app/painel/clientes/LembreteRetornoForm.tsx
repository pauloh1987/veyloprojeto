"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { agendarLembreteRetorno } from "@/lib/acoes/clientes";
import type { EstadoAcao } from "@/lib/acoes/agendamentos";
import { Button } from "@/components/ui/Button";
import { Campo, Input, Select } from "@/components/ui/Campo";

const ESTADO_INICIAL: EstadoAcao = {};
const DIAS_PADRAO = 25;

interface ServicoOpcao {
  id: string;
  nome: string;
}

export function LembreteRetornoForm({
  clienteId,
  servicos,
  servicoSugeridoId,
}: {
  clienteId: string;
  servicos: ServicoOpcao[];
  servicoSugeridoId?: string;
}) {
  const [estado, acao] = useActionState(agendarLembreteRetorno, ESTADO_INICIAL);
  const [enviado, setEnviado] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado?.sucesso) {
      setEnviado(true);
      formRef.current?.reset();
      const timer = setTimeout(() => setEnviado(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [estado]);

  return (
    <div className="mb-6 rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <Bell size={16} className="text-text-faint" />
        <p className="text-sm font-medium text-text">Agendar lembrete de retorno</p>
      </div>
      <p className="mb-3 text-xs text-text-faint">
        Manda uma mensagem automática pra cliente daqui a X dias, lembrando de agendar de novo
        (ex: manutenção de gel, retoque de cor).
      </p>
      <form ref={formRef} action={acao} className="flex flex-wrap items-end gap-2.5">
        <input type="hidden" name="clienteId" value={clienteId} />
        <Campo rotulo="Serviço" htmlFor="servicoId" className="min-w-[10rem] flex-1">
          <Select id="servicoId" name="servicoId" required defaultValue={servicoSugeridoId ?? ""}>
            <option value="" disabled>
              Selecione
            </option>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo rotulo="Em quantos dias" htmlFor="dias">
          <Input id="dias" name="dias" type="number" min={1} max={365} required defaultValue={DIAS_PADRAO} className="w-28" />
        </Campo>
        <Button type="submit">Agendar</Button>
      </form>
      {estado?.erro && <p className="mt-2 text-sm text-danger">{estado.erro}</p>}
      {enviado && <p className="mt-2 text-sm text-success">Lembrete agendado.</p>}
    </div>
  );
}
