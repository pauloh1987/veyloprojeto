"use client";

import { useState, useTransition } from "react";
import { FlaskConical, Trash } from "lucide-react";
import { definirAssinatura, definirContaDeTeste, definirParceria, estenderTesteSalao, excluirSalaoDeTeste } from "@/lib/acoes/admin";
import type { EstadoAcao } from "@/lib/acoes/agendamentos";
import type { SituacaoConta } from "@/lib/assinatura";
import { Button } from "@/components/ui/Button";
import { Input, Rotulo } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";

/** Botões de cada salão: estender o teste, marcar como parceira (piloto sem cobrança), como
 * assinante (já paga) ou como conta de teste (sai dos números e pode ser excluída de vez). */
export function AcoesSalao({
  salaoId,
  nome,
  situacao,
  contaDeTeste,
}: {
  salaoId: string;
  nome: string;
  situacao: SituacaoConta["tipo"];
  contaDeTeste: boolean;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [pendente, iniciar] = useTransition();

  function executar(acao: () => Promise<EstadoAcao>, confirmacao?: string) {
    if (confirmacao && !window.confirm(confirmacao)) return;
    setErro(null);
    iniciar(async () => {
      const resultado = await acao();
      if (resultado.erro) setErro(resultado.erro);
    });
  }

  if (contaDeTeste) {
    return (
      <div className="mt-3">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" disabled={pendente} onClick={() => executar(() => definirContaDeTeste(salaoId, false))}>
            Não é teste
          </Button>
          <Button type="button" size="sm" variant="ghost" className="text-danger hover:text-danger" disabled={pendente} onClick={() => setExcluindo(true)}>
            <Trash size={14} aria-hidden /> Excluir de vez
          </Button>
        </div>
        {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
        <Modal aberto={excluindo} aoFechar={() => setExcluindo(false)} titulo="Excluir conta de teste">
          {excluindo && <ConfirmarExclusao salaoId={salaoId} nome={nome} aoTerminar={() => setExcluindo(false)} />}
        </Modal>
      </div>
    );
  }

  const emTeste = situacao === "teste" || situacao === "testeVencido";

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {emTeste && (
          <Button type="button" size="sm" variant="secondary" disabled={pendente} onClick={() => executar(() => estenderTesteSalao(salaoId))}>
            +7 dias de teste
          </Button>
        )}
        {situacao !== "parceira" && situacao !== "assinante" && (
          <Button type="button" size="sm" variant="secondary" disabled={pendente} onClick={() => executar(() => definirParceria(salaoId, true))}>
            Marcar como parceira
          </Button>
        )}
        {situacao !== "assinante" && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pendente}
            onClick={() => executar(() => definirAssinatura(salaoId, true), `Confirmar que ${nome} já está pagando?`)}
          >
            Marcar como assinante
          </Button>
        )}
        {situacao === "parceira" && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pendente}
            onClick={() => executar(() => definirParceria(salaoId, false), `Tirar ${nome} das parceiras? O teste grátis volta a contar.`)}
          >
            Tirar de parceira
          </Button>
        )}
        {situacao === "assinante" && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pendente}
            onClick={() => executar(() => definirAssinatura(salaoId, false), `Cancelar a assinatura de ${nome}?`)}
          >
            Cancelar assinatura
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="sm:ml-auto"
          disabled={pendente}
          onClick={() => executar(() => definirContaDeTeste(salaoId, true))}
        >
          <FlaskConical size={14} aria-hidden /> Marcar como teste
        </Button>
      </div>
      {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
    </div>
  );
}

function ConfirmarExclusao({ salaoId, nome, aoTerminar }: { salaoId: string; nome: string; aoTerminar: () => void }) {
  const [digitado, setDigitado] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const normalizar = (texto: string) => texto.trim().replace(/\s+/g, " ").toLowerCase();
  const confere = normalizar(digitado) === normalizar(nome);

  function excluir() {
    setErro(null);
    iniciar(async () => {
      const resultado = await excluirSalaoDeTeste(salaoId, digitado);
      if (resultado.erro) setErro(resultado.erro);
      else aoTerminar();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text">
        Isso apaga <strong>{nome}</strong> com tudo o que ela tem: equipe, serviços, clientes, agendamentos, mensagens e logins. Não dá
        para desfazer pelo sistema (o backup diário guarda os últimos 30 dias).
      </p>
      <div>
        <Rotulo htmlFor={`confirmar-${salaoId}`}>Digite o nome da conta para confirmar</Rotulo>
        <Input id={`confirmar-${salaoId}`} value={digitado} onChange={(e) => setDigitado(e.target.value)} placeholder={nome} autoComplete="off" />
      </div>
      {erro && (
        <p role="alert" className="text-sm text-danger">
          {erro}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="danger" disabled={!confere || pendente} onClick={excluir}>
          {pendente ? "Excluindo..." : "Excluir de vez"}
        </Button>
        <Button type="button" variant="ghost" onClick={aoTerminar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
