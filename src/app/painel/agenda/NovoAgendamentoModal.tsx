"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { criarAgendamentoManual } from "@/lib/acoes/agendamentos";
import type { EstadoAcao } from "@/lib/acoes/agendamentos";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Campo, Input, Select, Rotulo } from "@/components/ui/Campo";
import { fromZonedTime } from "date-fns-tz";

export interface ProfissionalOpcaoModal {
  id: string;
  nome: string;
  servicos: { id: string; nome: string; duracaoMin: number }[];
}
export interface ClienteOpcaoModal {
  id: string;
  nome: string;
  telefone: string;
}

const ESTADO_INICIAL: EstadoAcao = {};

export function NovoAgendamentoModal({
  aberto,
  aoFechar,
  profissionais,
  clientes,
  fuso,
  valoresIniciais,
}: {
  aberto: boolean;
  aoFechar: () => void;
  profissionais: ProfissionalOpcaoModal[];
  clientes: ClienteOpcaoModal[];
  fuso: string;
  valoresIniciais?: { profissionalId?: string; data?: string; hora?: string };
}) {
  const [estado, acao] = useActionState(criarAgendamentoManual, ESTADO_INICIAL);
  const [profissionalId, setProfissionalId] = useState(valoresIniciais?.profissionalId ?? profissionais[0]?.id ?? "");
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [criarNovoCliente, setCriarNovoCliente] = useState(false);

  useEffect(() => {
    if (aberto) {
      setProfissionalId(valoresIniciais?.profissionalId ?? profissionais[0]?.id ?? "");
      setClienteId("");
      setBuscaCliente("");
      setCriarNovoCliente(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  useEffect(() => {
    if (estado?.sucesso) aoFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  const profissionalAtual = profissionais.find((p) => p.id === profissionalId);
  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente.trim()) return clientes.slice(0, 6);
    const termo = buscaCliente.trim().toLowerCase();
    return clientes.filter((c) => c.nome.toLowerCase().includes(termo) || c.telefone.includes(termo)).slice(0, 6);
  }, [buscaCliente, clientes]);

  function inicioIsoDoFormulario(formData: FormData): string {
    const data = String(formData.get("__data"));
    const hora = String(formData.get("__hora"));
    return fromZonedTime(`${data}T${hora}:00`, fuso).toISOString();
  }

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Novo agendamento">
      <form
        action={(formData) => {
          formData.set("inicioIso", inicioIsoDoFormulario(formData));
          return acao(formData);
        }}
        className="space-y-4"
      >
        <input type="hidden" name="profissionalId" value={profissionalId} />

        {profissionais.length > 1 && (
          <Campo rotulo="Profissional" htmlFor="profissionalId-select">
            <Select id="profissionalId-select" value={profissionalId} onChange={(e) => setProfissionalId(e.target.value)}>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
          </Campo>
        )}

        <div>
          <Rotulo htmlFor="busca-cliente">Cliente</Rotulo>
          {clienteId && !criarNovoCliente ? (
            <div className="flex items-center justify-between rounded-xl border border-border-strong bg-surface-2 px-3.5 py-2.5 text-sm text-text">
              {clientes.find((c) => c.id === clienteId)?.nome}
              <button type="button" className="text-xs text-accent" onClick={() => setClienteId("")}>
                Trocar
              </button>
            </div>
          ) : criarNovoCliente ? (
            <div className="space-y-2">
              <Input name="clienteNome" placeholder="Nome do novo cliente" required />
              <Input name="clienteTelefone" placeholder="(81) 91234-5678" required />
              <button type="button" className="text-xs text-accent" onClick={() => setCriarNovoCliente(false)}>
                Buscar cliente existente
              </button>
            </div>
          ) : (
            <div>
              <Input
                id="busca-cliente"
                placeholder="Buscar por nome ou telefone"
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
              />
              <div className="mt-1.5 space-y-1">
                {clientesFiltrados.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setClienteId(c.id)}
                    className="block w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-text hover:bg-surface-2"
                  >
                    {c.nome} <span className="text-text-faint">· {c.telefone}</span>
                  </button>
                ))}
                <button type="button" className="px-2.5 pt-1 text-xs text-accent" onClick={() => setCriarNovoCliente(true)}>
                  + Cadastrar novo cliente
                </button>
              </div>
            </div>
          )}
          {clienteId && !criarNovoCliente && <input type="hidden" name="clienteId" value={clienteId} />}
        </div>

        <Campo rotulo="Serviço" htmlFor="servicoId">
          <Select id="servicoId" name="servicoId" required defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {profissionalAtual?.servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} ({s.duracaoMin} min)
              </option>
            ))}
          </Select>
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Data" htmlFor="__data">
            <Input id="__data" name="__data" type="date" required defaultValue={valoresIniciais?.data} />
          </Campo>
          <Campo rotulo="Horário" htmlFor="__hora">
            <Input id="__hora" name="__hora" type="time" required defaultValue={valoresIniciais?.hora} />
          </Campo>
        </div>

        {estado?.erro && <p className="text-sm text-danger">{estado.erro}</p>}

        <Button type="submit" className="w-full" disabled={!clienteId && !criarNovoCliente}>
          Criar agendamento
        </Button>
      </form>
    </Modal>
  );
}
