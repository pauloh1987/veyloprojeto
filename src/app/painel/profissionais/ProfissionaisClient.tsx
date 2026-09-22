"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Plus, UserRound, Ban, CheckCircle2, KeyRound, Percent, Camera } from "lucide-react";
import {
  criarProfissional,
  alternarAtivoProfissional,
  atualizarComissaoProfissional,
  atualizarFotoProfissional,
} from "@/lib/acoes/profissionais";
import type { EstadoAcao } from "@/lib/acoes/agendamentos";
import { Button } from "@/components/ui/Button";
import { Campo, Input } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EstadoVazio } from "@/components/ui/EstadoVazio";

interface ProfissionalLinha {
  id: string;
  nome: string;
  ativo: boolean;
  temLogin: boolean;
  comissaoPercentual: number | null;
  foto: string | null;
}

const ESTADO_INICIAL: EstadoAcao = {};
const FOTO_TAMANHO_PX = 320;
const FOTO_QUALIDADE = 0.85;

/** Recorta a foto escolhida num quadrado centralizado e redimensiona para 320x320,
 * reexportando como JPEG — ao contrário do logo do estabelecimento, aqui não faz sentido
 * cortar "espaço em branco": é uma foto de verdade, então só centralizamos e enquadramos. */
function recortarFotoQuadrada(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    leitor.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Esse arquivo não é uma imagem válida."));
      img.onload = () => {
        const lado = Math.min(img.width, img.height);
        const origemX = (img.width - lado) / 2;
        const origemY = (img.height - lado) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = FOTO_TAMANHO_PX;
        canvas.height = FOTO_TAMANHO_PX;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Não foi possível processar a imagem."));
        ctx.drawImage(img, origemX, origemY, lado, lado, 0, 0, FOTO_TAMANHO_PX, FOTO_TAMANHO_PX);
        resolve(canvas.toDataURL("image/jpeg", FOTO_QUALIDADE));
      };
      img.src = leitor.result as string;
    };
    leitor.readAsDataURL(arquivo);
  });
}

export function ProfissionaisClient({
  profissionais,
  plano,
}: {
  profissionais: ProfissionalLinha[];
  plano: "SOLO" | "EQUIPE";
}) {
  const [modalAberto, setModalAberto] = useState(false);
  const [criarLogin, setCriarLogin] = useState(false);
  const [estado, acao] = useActionState(criarProfissional, ESTADO_INICIAL);

  useEffect(() => {
    if (estado?.sucesso) {
      setModalAberto(false);
      setCriarLogin(false);
    }
  }, [estado]);

  const ativos = profissionais.filter((p) => p.ativo).length;
  const limiteSoloAtingido = plano === "SOLO" && ativos >= 1;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-2 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-extrabold text-text">Profissionais</h1>
        <Button size="sm" onClick={() => setModalAberto(true)}>
          <Plus size={16} /> Nova
        </Button>
      </header>
      <p className="mb-6 text-sm text-text-muted">
        {plano === "SOLO"
          ? "Plano Solo: 1 profissional ativa por vez."
          : "Plano Equipe: adicione quantas profissionais precisar."}
      </p>

      {profissionais.length === 0 ? (
        <EstadoVazio
          icone={<UserRound className="mx-auto" />}
          titulo="Nenhuma profissional cadastrada"
          descricao="Cadastre ao menos uma profissional para os serviços e a agenda pública funcionarem."
          acao={<Button onClick={() => setModalAberto(true)}>Cadastrar profissional</Button>}
        />
      ) : (
        <ul className="space-y-3">
          {profissionais.map((p) => (
            <li key={p.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center gap-3">
                <EditorFoto id={p.id} nome={p.nome} foto={p.foto} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-text">{p.nome}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge tom={p.ativo ? "success" : "neutral"}>{p.ativo ? "Ativa" : "Inativa"}</Badge>
                    {p.temLogin && (
                      <Badge tom="info">
                        <KeyRound size={11} /> tem login
                      </Badge>
                    )}
                  </div>
                </div>
                <BotaoAlternarAtivo id={p.id} ativo={p.ativo} bloqueado={!p.ativo && limiteSoloAtingido} />
              </div>
              <EditorComissao id={p.id} comissaoPercentual={p.comissaoPercentual} />
            </li>
          ))}
        </ul>
      )}

      <Modal aberto={modalAberto} aoFechar={() => setModalAberto(false)} titulo="Nova profissional">
        <form action={acao} className="space-y-4">
          <Campo rotulo="Nome" htmlFor="nome">
            <Input id="nome" name="nome" required placeholder="Nome completo" />
          </Campo>

          <Campo rotulo="Comissão (%)" htmlFor="comissaoPercentual">
            <Input
              id="comissaoPercentual"
              name="comissaoPercentual"
              type="number"
              min={0}
              max={100}
              placeholder="Ex: 50"
            />
          </Campo>
          <p className="-mt-3 text-xs text-text-faint">
            Deixe em branco se ela não recebe por comissão. Dá pra ajustar depois.
          </p>

          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              name="criarLogin"
              checked={criarLogin}
              onChange={(e) => setCriarLogin(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Criar login para essa profissional acessar o painel sozinha
          </label>

          {criarLogin && (
            <div className="space-y-3 rounded-xl bg-surface-2 p-3">
              <Campo rotulo="E-mail de acesso" htmlFor="email">
                <Input id="email" name="email" type="email" required={criarLogin} placeholder="nome@exemplo.com" />
              </Campo>
              <Campo rotulo="Senha provisória" htmlFor="senha">
                <Input id="senha" name="senha" type="text" required={criarLogin} placeholder="mínimo 6 caracteres" />
              </Campo>
              <p className="text-xs text-text-faint">Combine essa senha com ela — dá pra trocar depois.</p>
            </div>
          )}

          {estado?.erro && <p className="text-sm text-danger">{estado.erro}</p>}

          <Button type="submit" className="w-full">
            Cadastrar
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function EditorFoto({ id, nome, foto }: { id: string; nome: string; foto: string | null }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setErro(null);
    try {
      const dataUrl = await recortarFotoQuadrada(arquivo);
      iniciar(async () => {
        try {
          await atualizarFotoProfissional(id, dataUrl);
        } catch {
          setErro("Não foi possível salvar a foto.");
        }
      });
    } catch (erroLeitura) {
      setErro(erroLeitura instanceof Error ? erroLeitura.message : "Não foi possível usar essa imagem.");
    }
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={pendente}
      className="group relative shrink-0 rounded-full disabled:opacity-60"
      title="Trocar foto"
    >
      {foto ? (
        <img src={foto} alt={nome} className="h-10 w-10 rounded-full object-cover" />
      ) : (
        <Avatar nome={nome} />
      )}
      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-accent-foreground opacity-0 shadow transition-opacity group-hover:opacity-100">
        <Camera size={10} />
      </span>
      <input ref={inputRef} type="file" accept="image/*" onChange={aoEscolherArquivo} className="hidden" />
      {erro && (
        <span className="absolute left-1/2 top-full z-10 mt-1 w-32 -translate-x-1/2 text-[10px] font-normal text-danger">
          {erro}
        </span>
      )}
    </button>
  );
}

const ESTADO_COMISSAO_INICIAL: EstadoAcao = {};

function EditorComissao({ id, comissaoPercentual }: { id: string; comissaoPercentual: number | null }) {
  const [estado, acao] = useActionState(atualizarComissaoProfissional, ESTADO_COMISSAO_INICIAL);
  const [valor, setValor] = useState(comissaoPercentual === null ? "" : String(comissaoPercentual));
  const alterado = valor !== (comissaoPercentual === null ? "" : String(comissaoPercentual));

  return (
    <form action={acao} className="mt-3 flex items-center gap-2 border-t border-border pt-3">
      <input type="hidden" name="profissionalId" value={id} />
      <Percent size={14} className="shrink-0 text-text-faint" />
      <label htmlFor={`comissao-${id}`} className="text-xs text-text-muted">
        Comissão
      </label>
      <input
        id={`comissao-${id}`}
        name="comissaoPercentual"
        type="number"
        min={0}
        max={100}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="—"
        className="h-8 w-16 rounded-lg border border-border-strong bg-surface-2 px-2 text-sm text-text"
      />
      <span className="text-xs text-text-faint">%</span>
      {alterado && (
        <Button type="submit" size="sm" className="ml-auto">
          Salvar
        </Button>
      )}
      {estado?.erro && <p className="text-xs text-danger">{estado.erro}</p>}
    </form>
  );
}

function BotaoAlternarAtivo({ id, ativo, bloqueado }: { id: string; ativo: boolean; bloqueado: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function alternar() {
    setErro(null);
    iniciar(async () => {
      try {
        await alternarAtivoProfissional(id, !ativo);
      } catch {
        setErro("Não foi possível concluir. Veja o limite do seu plano.");
      }
    });
  }

  return (
    <div className="shrink-0 text-right">
      <Button size="sm" variant={ativo ? "ghost" : "secondary"} disabled={pendente || bloqueado} onClick={alternar}>
        {ativo ? <Ban size={14} /> : <CheckCircle2 size={14} />}
        {ativo ? "Desativar" : "Ativar"}
      </Button>
      {erro && <p className="mt-1 text-xs text-danger">{erro}</p>}
    </div>
  );
}
